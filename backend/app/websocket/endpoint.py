import uuid
from datetime import datetime, timezone
from typing import Optional
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from .connection_manager import manager
import logging

logger = logging.getLogger("zoom.websocket")
router = APIRouter(tags=["Signaling"])

@router.websocket("/ws/meeting/{meeting_id}")
async def websocket_signaling_endpoint(
    websocket: WebSocket,
    meeting_id: str,
    peer_id: Optional[str] = Query(None),
    name: Optional[str] = Query("Guest"),
    is_host: Optional[bool] = Query(False)
):
    """
    WebSocket endpoint for WebRTC signaling, peer discovery, chat, and in-room state.
    """
    # Normalize meeting ID
    clean_meeting_id = meeting_id.replace(" ", "").replace("-", "")

    # Assign unique peer ID if client did not supply one
    if not peer_id:
        peer_id = f"peer-{uuid.uuid4().hex[:8]}"

    await manager.connect(
        meeting_id=clean_meeting_id,
        peer_id=peer_id,
        websocket=websocket,
        name=name or "Guest",
        is_host=bool(is_host)
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type in ("offer", "answer", "ice-candidate"):
                target = data.get("target")
                if target:
                    # Forward signaling message to targeted peer with sender attached
                    forward_payload = {**data, "sender": peer_id}
                    await manager.send_to_peer(clean_meeting_id, target, forward_payload)

            elif msg_type == "media-state":
                # User toggled mic, camera, or screen share
                await manager.update_media_state(
                    meeting_id=clean_meeting_id,
                    peer_id=peer_id,
                    audio_muted=data.get("audioMuted"),
                    video_off=data.get("videoOff"),
                    is_screen_sharing=data.get("isScreenSharing")
                )

            elif msg_type == "chat":
                # Live in-meeting text chat broadcast
                now_str = datetime.now(timezone.utc).strftime("%I:%M %p")
                chat_payload = {
                    "type": "chat",
                    "sender": name,
                    "peerId": peer_id,
                    "text": data.get("text", ""),
                    "timestamp": data.get("timestamp") or now_str
                }
                await manager.broadcast(clean_meeting_id, chat_payload)

            elif msg_type == "host-action":
                # Host moderation controls (Mute All, Remove Participant)
                peer_meta = manager.peer_info.get(clean_meeting_id, {}).get(peer_id, {})
                if peer_meta.get("isHost"):
                    action = data.get("action")
                    target_pid = data.get("targetPeerId")
                    host_payload = {
                        "type": "host-action",
                        "action": action,
                        "targetPeerId": target_pid,
                        "by": name
                    }
                    await manager.broadcast(clean_meeting_id, host_payload)

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected normally: {peer_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {peer_id}: {e}")
    finally:
        await manager.disconnect(clean_meeting_id, peer_id)
