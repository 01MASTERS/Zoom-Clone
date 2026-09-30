'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface RemotePeer {
  peerId: string;
  name: string;
  isHost: boolean;
  audioMuted: boolean;
  videoOff: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream;
}

export interface ChatMessage {
  sender: string;
  peerId: string;
  text: string;
  timestamp: string;
}

interface UseWebRTCOptions {
  meetingId: string;
  userName: string;
  isHost?: boolean;
  localStream: MediaStream | null;
  onKicked?: (reason?: 'removed' | 'ended', by?: string) => void;
  onHostMuted?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC({
  meetingId,
  userName,
  isHost = false,
  localStream,
  onKicked,
  onHostMuted,
}: UseWebRTCOptions) {
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const myPeerIdRef = useRef<string | null>(null);
  const onKickedRef = useRef(onKicked);
  const onHostMutedRef = useRef(onHostMuted);

  const messageQueueRef = useRef<any[]>([]);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (localStream) {
      // Sync local tracks to all active RTCPeerConnections
      Object.keys(peerConnectionsRef.current).forEach((pid) => {
        const pc = peerConnectionsRef.current[pid];
        const senders = pc.getSenders();
        localStream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) {
            try {
              sender.replaceTrack(track);
            } catch (err) {
              console.warn(`Error replacing track for peer ${pid}:`, err);
            }
          } else {
            try {
              pc.addTrack(track, localStream);
            } catch (err) {
              console.warn(`Error adding track for peer ${pid}:`, err);
            }
          }
        });
      });
    }
  }, [localStream]);

  useEffect(() => {
    onKickedRef.current = onKicked;
    onHostMutedRef.current = onHostMuted;
  }, [onKicked, onHostMuted]);

  // Safe helper to send WS message with queueing
  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      messageQueueRef.current.push(msg);
    }
  }, []);

  // Flush queued candidates for a peer
  const flushPendingCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingCandidatesRef.current[peerId] || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn(`Error applying queued ICE candidate for ${peerId}:`, err);
        }
      }
    }
  }, []);

  // Initialize or get RTCPeerConnection
  const getOrCreatePeerConnection = useCallback(
    (remotePeerId: string): RTCPeerConnection => {
      if (peerConnectionsRef.current[remotePeerId]) {
        return peerConnectionsRef.current[remotePeerId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current[remotePeerId] = pc;
      pendingCandidatesRef.current[remotePeerId] = [];

      // Forward ICE candidates to signaling server
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({
            type: 'ice-candidate',
            target: remotePeerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle inbound tracks
      pc.ontrack = (event) => {
        let incomingStream = event.streams[0];
        if (!incomingStream) {
          incomingStream = new MediaStream([event.track]);
        }

        setPeers((prev) => {
          const existing = prev[remotePeerId];
          if (!existing) return prev;

          // Merge or replace track into peer stream
          const currentStream = existing.stream ? existing.stream : new MediaStream();
          const existingTrack = currentStream.getTracks().find((t) => t.kind === event.track.kind);
          if (existingTrack && existingTrack.id !== event.track.id) {
            try { currentStream.removeTrack(existingTrack); } catch {}
          }
          if (!currentStream.getTracks().some((t) => t.id === event.track.id)) {
            try { currentStream.addTrack(event.track); } catch {}
          }

          return {
            ...prev,
            [remotePeerId]: {
              ...existing,
              stream: currentStream,
            },
          };
        });
      };

      // Add local stream tracks to connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch (err) {
            console.warn(`Error adding local track to peer ${remotePeerId}:`, err);
          }
        });
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          // Clean up if peer dropped
          // (Handled also by WS user-left)
        }
      };

      return pc;
    },
    [sendMessage]
  );

  // Create WebRTC Offer to a remote peer
  const initiateOffer = useCallback(
    async (remotePeerId: string) => {
      const pc = getOrCreatePeerConnection(remotePeerId);
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        sendMessage({
          type: 'offer',
          target: remotePeerId,
          sdp: offer,
        });
      } catch (err) {
        console.error(`Failed to create offer for ${remotePeerId}:`, err);
      }
    },
    [getOrCreatePeerConnection, sendMessage]
  );

  // Handle incoming Offer from a remote peer
  const handleRemoteOffer = useCallback(
    async (senderId: string, sdp: RTCSessionDescriptionInit) => {
      const pc = getOrCreatePeerConnection(senderId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates(senderId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendMessage({
          type: 'answer',
          target: senderId,
          sdp: answer,
        });
      } catch (err) {
        console.error(`Failed to handle remote offer from ${senderId}:`, err);
      }
    },
    [flushPendingCandidates, getOrCreatePeerConnection, sendMessage]
  );

  // Handle incoming Answer
  const handleRemoteAnswer = useCallback(
    async (senderId: string, sdp: RTCSessionDescriptionInit) => {
      const pc = peerConnectionsRef.current[senderId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushPendingCandidates(senderId, pc);
        } catch (err) {
          console.error(`Failed to handle remote answer from ${senderId}:`, err);
        }
      }
    },
    [flushPendingCandidates]
  );

  // Handle incoming ICE Candidate
  const handleRemoteCandidate = useCallback(
    async (senderId: string, candidateInit: RTCIceCandidateInit) => {
      const pc = peerConnectionsRef.current[senderId];
      if (pc && pc.remoteDescription && pc.signalingState !== 'closed') {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (err) {
          console.warn(`Error applying candidate from ${senderId}:`, err);
        }
      } else {
        // Buffer until setRemoteDescription completes
        if (!pendingCandidatesRef.current[senderId]) {
          pendingCandidatesRef.current[senderId] = [];
        }
        pendingCandidatesRef.current[senderId].push(candidateInit);
      }
    },
    []
  );

  // Close connection for specific peer
  const closePeer = useCallback((peerId: string) => {
    if (peerConnectionsRef.current[peerId]) {
      try {
        peerConnectionsRef.current[peerId].close();
      } catch {}
      delete peerConnectionsRef.current[peerId];
    }
    delete pendingCandidatesRef.current[peerId];
    setPeers((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // Stable refs for handler functions
  const initiateOfferRef = useRef(initiateOffer);
  initiateOfferRef.current = initiateOffer;

  const handleRemoteOfferRef = useRef(handleRemoteOffer);
  handleRemoteOfferRef.current = handleRemoteOffer;

  const handleRemoteAnswerRef = useRef(handleRemoteAnswer);
  handleRemoteAnswerRef.current = handleRemoteAnswer;

  const handleRemoteCandidateRef = useRef(handleRemoteCandidate);
  handleRemoteCandidateRef.current = handleRemoteCandidate;

  const closePeerRef = useRef(closePeer);
  closePeerRef.current = closePeer;

  // Main WebSocket Lifecycle (stable, connects once per meeting)
  useEffect(() => {
    if (!meetingId || !userName) return;

    const cleanMeetingId = meetingId.replace(/[\s-]/g, '');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}//${window.location.hostname}:8000`;
    const wsUrl = `${wsHost}/ws/meeting/${cleanMeetingId}?name=${encodeURIComponent(userName)}&is_host=${isHost}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      while (messageQueueRef.current.length > 0) {
        const queuedMsg = messageQueueRef.current.shift();
        try {
          ws.send(JSON.stringify(queuedMsg));
        } catch (e) {
          console.warn('Failed to send queued message:', e);
        }
      }
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type } = data;

        if (type === 'room-state') {
          // Received list of already connected peers in room
          myPeerIdRef.current = data.yourPeerId;
          setMyPeerId(data.yourPeerId);
          const initialPeers: Record<string, RemotePeer> = {};
          if (Array.isArray(data.peers)) {
            data.peers.forEach((p: any) => {
              initialPeers[p.peerId] = {
                peerId: p.peerId,
                name: p.name,
                isHost: p.isHost,
                audioMuted: p.audioMuted || false,
                videoOff: p.videoOff || false,
              };
            });
          }
          setPeers(initialPeers);

          // Initiate offer to each existing peer
          if (Array.isArray(data.peers)) {
            for (const p of data.peers) {
              await initiateOfferRef.current(p.peerId);
            }
          }
        } else if (type === 'user-joined') {
          setPeers((prev) => ({
            ...prev,
            [data.peerId]: {
              peerId: data.peerId,
              name: data.name,
              isHost: data.isHost,
              audioMuted: data.audioMuted || false,
              videoOff: data.videoOff || false,
            },
          }));
        } else if (type === 'user-left') {
          closePeerRef.current(data.peerId);
        } else if (type === 'offer') {
          await handleRemoteOfferRef.current(data.sender, data.sdp);
        } else if (type === 'answer') {
          await handleRemoteAnswerRef.current(data.sender, data.sdp);
        } else if (type === 'ice-candidate') {
          await handleRemoteCandidateRef.current(data.sender, data.candidate);
        } else if (type === 'media-state') {
          setPeers((prev) => {
            const existing = prev[data.peerId];
            if (!existing) return prev;
            const isSharing = data.isScreenSharing ?? existing.isScreenSharing ?? false;
            return {
              ...prev,
              [data.peerId]: {
                ...existing,
                audioMuted: data.audioMuted !== undefined ? data.audioMuted : existing.audioMuted,
                videoOff: isSharing ? false : (data.videoOff !== undefined ? data.videoOff : existing.videoOff),
                isScreenSharing: isSharing,
              },
            };
          });
        } else if (type === 'chat') {
          setMessages((prev) => [...prev, data]);
        } else if (type === 'host-action') {
          if (data.action === 'mute-all') {
            if (!isHost && onHostMutedRef.current) onHostMutedRef.current();
          } else if (data.action === 'remove-participant') {
            if (data.targetPeerId === myPeerIdRef.current && onKickedRef.current) {
              onKickedRef.current('removed', data.by || 'The host');
            } else if (!data.targetPeerId && !isHost && onKickedRef.current) {
              onKickedRef.current('ended', data.by || 'The host');
            }
          }
        }
      } catch (err) {
        console.error('Error handling signaling message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.warn('Signaling WebSocket encountered an error:', err);
    };

    return () => {
      // Teardown all peer connections and close socket
      Object.keys(peerConnectionsRef.current).forEach((pid) => {
        try {
          peerConnectionsRef.current[pid].close();
        } catch {}
      });
      peerConnectionsRef.current = {};
      pendingCandidatesRef.current = {};
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [meetingId, userName, isHost]);

  // Broadcast local audio/video/screenshare toggle states to other participants
  const broadcastMediaState = useCallback(
    (audioMuted: boolean, videoOff: boolean, isScreenSharing: boolean = false) => {
      sendMessage({
        type: 'media-state',
        audioMuted,
        videoOff,
        isScreenSharing,
      });
    },
    [sendMessage]
  );

  // Send in-meeting text chat message
  const sendChatMessage = useCallback(
    (text: string) => {
      sendMessage({
        type: 'chat',
        text,
      });
    },
    [sendMessage]
  );

  // Send host moderation action
  const sendHostAction = useCallback(
    (action: 'mute-all' | 'remove-participant', targetPeerId?: string) => {
      sendMessage({
        type: 'host-action',
        action,
        targetPeerId,
      });
    },
    [sendMessage]
  );

  // Seamless track replacement (e.g. for screen sharing or camera toggle)
  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    for (const pid of Object.keys(peerConnectionsRef.current)) {
      const pc = peerConnectionsRef.current[pid];
      if (!pc || pc.signalingState === 'closed') continue;

      const senders = pc.getSenders();
      let videoSender = senders.find((s) => s.track?.kind === 'video');

      if (!videoSender) {
        const transceivers = pc.getTransceivers();
        const videoTransceiver = transceivers.find(
          (t) => t.sender?.track?.kind === 'video' || t.receiver?.track?.kind === 'video'
        );
        if (videoTransceiver) {
          videoSender = videoTransceiver.sender;
        }
      }

      if (videoSender) {
        try {
          await videoSender.replaceTrack(newTrack);
        } catch (err) {
          console.error(`Failed to replace video track for peer ${pid}:`, err);
        }
      } else {
        try {
          const streamToAttach = localStreamRef.current || new MediaStream();
          pc.addTrack(newTrack, streamToAttach);
          await initiateOfferRef.current(pid);
        } catch (err) {
          console.warn(`Failed to add and renegotiate track for peer ${pid}:`, err);
        }
      }
    }
  }, []);

  return {
    peers: Object.values(peers),
    peersMap: peers,
    isConnected,
    myPeerId,
    messages,
    broadcastMediaState,
    sendChatMessage,
    sendHostAction,
    replaceVideoTrack,
  };
}
