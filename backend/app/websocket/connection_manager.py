from typing import Dict, Any, Optional, List
from fastapi import WebSocket
import logging

logger = logging.getLogger("zoom.signaling")

class ConnectionManager:
    def __init__(self):
        # Maps meeting_id -> {peer_id: WebSocket}
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}
        # Maps meeting_id -> {peer_id: dict_of_peer_metadata}
        self.peer_info: Dict[str, Dict[str, Dict[str, Any]]] = {}

    async def connect(
        self,
        meeting_id: str,
        peer_id: str,
        websocket: WebSocket,
        name: str = "Guest",
        is_host: bool = False
    ) -> None:
        """Accept WebSocket connection, register in room, and notify peers."""
        await websocket.accept()

        if meeting_id not in self.rooms:
            self.rooms[meeting_id] = {}
            self.peer_info[meeting_id] = {}

        # Prepare snapshot of existing peers to send to the new participant
        existing_peers: List[Dict[str, Any]] = [
            info for pid, info in self.peer_info[meeting_id].items()
        ]

        # Register new peer
        self.rooms[meeting_id][peer_id] = websocket
        self.peer_info[meeting_id][peer_id] = {
            "peerId": peer_id,
            "name": name,
            "isHost": is_host,
            "audioMuted": False,
            "videoOff": False
        }

        logger.info(f"Peer {peer_id} ({name}) connected to room {meeting_id}. Total: {len(self.rooms[meeting_id])}")

        # 1. Send existing room state to joining peer
        await websocket.send_json({
            "type": "room-state",
            "yourPeerId": peer_id,
            "peers": existing_peers
        })

        # 2. Broadcast user-joined to all other peers in the room
        await self.broadcast(
            meeting_id=meeting_id,
            message={
                "type": "user-joined",
                "peerId": peer_id,
                "name": name,
                "isHost": is_host,
                "audioMuted": False,
                "videoOff": False
            },
            exclude_peer_id=peer_id
        )

    async def disconnect(self, meeting_id: str, peer_id: str) -> None:
        """Remove peer from room and broadcast departure to peers."""
        if meeting_id in self.rooms:
            self.rooms[meeting_id].pop(peer_id, None)
            info = self.peer_info[meeting_id].pop(peer_id, None)

            # Broadcast user-left to remaining participants
            if self.rooms[meeting_id]:
                await self.broadcast(
                    meeting_id=meeting_id,
                    message={
                        "type": "user-left",
                        "peerId": peer_id,
                        "name": info.get("name") if info else "Unknown"
                    }
                )
            else:
                # Clean up empty room dicts to prevent memory accumulation
                del self.rooms[meeting_id]
                del self.peer_info[meeting_id]

            logger.info(f"Peer {peer_id} disconnected from room {meeting_id}.")

    async def send_to_peer(
        self,
        meeting_id: str,
        target_peer_id: str,
        message: Dict[str, Any]
    ) -> bool:
        """Send message directly to a specific target peer in the room."""
        if meeting_id in self.rooms and target_peer_id in self.rooms[meeting_id]:
            try:
                ws = self.rooms[meeting_id][target_peer_id]
                await ws.send_json(message)
                return True
            except Exception as e:
                logger.error(f"Failed to send to peer {target_peer_id}: {e}")
                return False
        return False

    async def broadcast(
        self,
        meeting_id: str,
        message: Dict[str, Any],
        exclude_peer_id: Optional[str] = None
    ) -> None:
        """Broadcast JSON message to all peers in the room except exclude_peer_id."""
        if meeting_id not in self.rooms:
            return

        dead_peers = []
        for pid, ws in list(self.rooms[meeting_id].items()):
            if pid != exclude_peer_id:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.warning(f"Error broadcasting to {pid}: {e}")
                    dead_peers.append(pid)

        # Cleanup any broken connections encountered during broadcast
        for pid in dead_peers:
            await self.disconnect(meeting_id, pid)

    async def update_media_state(
        self,
        meeting_id: str,
        peer_id: str,
        audio_muted: Optional[bool] = None,
        video_off: Optional[bool] = None,
        is_screen_sharing: Optional[bool] = None
    ) -> None:
        """Update media mute/video/screenshare status and notify other peers."""
        if meeting_id in self.peer_info and peer_id in self.peer_info[meeting_id]:
            if audio_muted is not None:
                self.peer_info[meeting_id][peer_id]["audioMuted"] = audio_muted
            if video_off is not None:
                self.peer_info[meeting_id][peer_id]["videoOff"] = video_off
            if is_screen_sharing is not None:
                self.peer_info[meeting_id][peer_id]["isScreenSharing"] = is_screen_sharing

            await self.broadcast(
                meeting_id=meeting_id,
                message={
                    "type": "media-state",
                    "peerId": peer_id,
                    "audioMuted": self.peer_info[meeting_id][peer_id].get("audioMuted", False),
                    "videoOff": self.peer_info[meeting_id][peer_id].get("videoOff", False),
                    "isScreenSharing": self.peer_info[meeting_id][peer_id].get("isScreenSharing", False)
                },
                exclude_peer_id=peer_id
            )

manager = ConnectionManager()
