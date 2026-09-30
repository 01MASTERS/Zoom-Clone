'use client';

import React, { useState } from 'react';
import ParticipantTile from './ParticipantTile';
import { RemotePeer } from '@/hooks/useWebRTC';
import { PinOff } from 'lucide-react';

interface LocalParticipant {
  name: string;
  isHost: boolean;
  audioMuted: boolean;
  videoOff: boolean;
  stream: MediaStream | null;
  isScreenSharing?: boolean;
}

interface VideoGridProps {
  localUser: LocalParticipant;
  remotePeers: RemotePeer[];
  viewMode?: 'gallery' | 'speaker';
}

export default function VideoGrid({
  localUser,
  remotePeers,
  viewMode = 'gallery',
}: VideoGridProps) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [unpinnedScreenShare, setUnpinnedScreenShare] = useState<boolean>(false);

  const allParticipants = [
    {
      id: 'local-user',
      name: localUser.name,
      isLocal: true,
      isHost: localUser.isHost,
      audioMuted: localUser.audioMuted,
      videoOff: localUser.videoOff,
      stream: localUser.stream,
      isScreenSharing: localUser.isScreenSharing,
    },
    ...remotePeers.map((p) => ({
      id: p.peerId,
      name: p.name,
      isLocal: false,
      isHost: p.isHost,
      audioMuted: p.audioMuted,
      videoOff: p.videoOff,
      stream: p.stream || null,
      isScreenSharing: p.isScreenSharing,
    })),
  ];

  const total = allParticipants.length;

  // Auto-spotlight screen share if active and not manually dismissed
  const screenSharer = allParticipants.find((p) => p.isScreenSharing);
  const activeSharerId = screenSharer?.id || null;
  const prevSharerIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (activeSharerId !== prevSharerIdRef.current) {
      setUnpinnedScreenShare(false);
      prevSharerIdRef.current = activeSharerId;
    }
  }, [activeSharerId]);

  // Determine effective pinned ID (explicit pin takes precedence, then active screen share)
  const effectivePinnedId = pinnedId || (!unpinnedScreenShare && activeSharerId ? activeSharerId : null);

  // Toggle pinning a specific participant
  const handleTogglePin = (participantId: string) => {
    if (effectivePinnedId === participantId) {
      setPinnedId(null);
      if (participantId === activeSharerId) {
        setUnpinnedScreenShare(true);
      }
    } else {
      setPinnedId(participantId);
    }
  };

  const handleUnpin = () => {
    setPinnedId(null);
    if (activeSharerId) {
      setUnpinnedScreenShare(true);
    }
  };

  // If a participant is pinned or sharing screen, render Spotlight / Pinned Stage Mode
  if (effectivePinnedId) {
    const pinnedParticipant = allParticipants.find((p) => p.id === effectivePinnedId) || allParticipants[0];
    const otherParticipants = allParticipants.filter((p) => p.id !== pinnedParticipant.id);

    return (
      <div
        className="pinned-stage-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          gap: '10px',
          padding: '10px 14px',
          position: 'relative',
        }}
      >
        {/* Top Horizontal Filmstrip of other participants if multiple */}
        {otherParticipants.length > 0 && (
          <div
            className="filmstrip-scroll-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: otherParticipants.length <= 3 ? 'center' : 'flex-start',
              gap: '10px',
              height: '120px',
              overflowX: 'auto',
              paddingBottom: '4px',
              flexShrink: 0,
            }}
          >
            {otherParticipants.map((p) => (
              <div
                key={p.id}
                style={{
                  width: '180px',
                  height: '100%',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <ParticipantTile
                  id={p.id}
                  name={p.name}
                  isLocal={p.isLocal}
                  isHost={p.isHost}
                  audioMuted={p.audioMuted}
                  videoOff={p.videoOff}
                  stream={p.stream}
                  isPinned={false}
                  onTogglePin={() => handleTogglePin(p.id)}
                  isScreenSharing={p.isScreenSharing}
                />
              </div>
            ))}
          </div>
        )}

        {/* Main Stage: Pinned Full-Screen Participant */}
        <div
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '1360px',
            margin: '0 auto',
            minHeight: 0,
            position: 'relative',
          }}
        >
          {/* Floating Unpin Button */}
          <button
            onClick={handleUnpin}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '20px',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(14, 113, 235, 0.9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.75)')}
          >
            <PinOff size={13} />
            <span>Unpin</span>
          </button>

          <ParticipantTile
            id={pinnedParticipant.id}
            name={pinnedParticipant.name}
            isLocal={pinnedParticipant.isLocal}
            isHost={pinnedParticipant.isHost}
            audioMuted={pinnedParticipant.audioMuted}
            videoOff={pinnedParticipant.videoOff}
            stream={pinnedParticipant.stream}
            isPinned={true}
            onTogglePin={() => handleTogglePin(pinnedParticipant.id)}
            isScreenSharing={pinnedParticipant.isScreenSharing}
          />
        </div>
      </div>
    );
  }

  // Speaker View Mode (Default first remote speaker or local user)
  if (viewMode === 'speaker' && total > 1) {
    const speaker = allParticipants[1] || allParticipants[0];
    const others = allParticipants.filter((p) => p.id !== speaker.id);

    return (
      <div
        className="speaker-stage-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          gap: '10px',
          padding: '10px 14px',
        }}
      >
        {/* Top Horizontal Filmstrip */}
        <div
          className="filmstrip-scroll-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: others.length <= 3 ? 'center' : 'flex-start',
            gap: '10px',
            height: '120px',
            overflowX: 'auto',
            paddingBottom: '4px',
            flexShrink: 0,
          }}
        >
          {others.map((p) => (
            <div
              key={p.id}
              style={{
                width: '180px',
                height: '100%',
                flexShrink: 0,
              }}
            >
              <ParticipantTile
                id={p.id}
                name={p.name}
                isLocal={p.isLocal}
                isHost={p.isHost}
                audioMuted={p.audioMuted}
                videoOff={p.videoOff}
                stream={p.stream}
                isPinned={false}
                onTogglePin={() => handleTogglePin(p.id)}
                isScreenSharing={p.isScreenSharing}
              />
            </div>
          ))}
        </div>

        {/* Main Stage Active Speaker */}
        <div
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '1360px',
            margin: '0 auto',
            minHeight: 0,
          }}
        >
          <ParticipantTile
            id={speaker.id}
            name={speaker.name}
            isLocal={speaker.isLocal}
            isHost={speaker.isHost}
            audioMuted={speaker.audioMuted}
            videoOff={speaker.videoOff}
            stream={speaker.stream}
            isPinned={false}
            onTogglePin={() => handleTogglePin(speaker.id)}
            isScreenSharing={speaker.isScreenSharing}
          />
        </div>
      </div>
    );
  }

  // Gallery View Layout: Adaptive for 1, 2, 3, 4, or more participants
  let gridStyle: React.CSSProperties = {
    display: 'grid',
    width: '100%',
    height: '100%',
    gap: '12px',
    padding: '12px',
    alignItems: 'center',
    justifyContent: 'center',
  };

  let gridClassName = 'video-grid-container';
  if (total === 1) {
    gridClassName += ' video-grid-1';
    gridStyle = {
      ...gridStyle,
      gridTemplateColumns: '1fr',
      maxWidth: '1080px',
      margin: '0 auto',
      maxHeight: '84vh',
    };
  } else if (total === 2) {
    gridClassName += ' video-grid-2';
    gridStyle = {
      ...gridStyle,
      gridTemplateColumns: 'repeat(2, 1fr)',
      maxHeight: '84vh',
      maxWidth: '1320px',
      margin: '0 auto',
    };
  } else {
    // 3 or 4 participants -> 2x2 grid
    gridClassName += ' video-grid-many';
    gridStyle = {
      ...gridStyle,
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      maxHeight: '84vh',
      maxWidth: '1320px',
      margin: '0 auto',
    };
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div className={gridClassName} style={gridStyle}>
        {allParticipants.map((p) => (
          <ParticipantTile
            key={p.id}
            id={p.id}
            name={p.name}
            isLocal={p.isLocal}
            isHost={p.isHost}
            audioMuted={p.audioMuted}
            videoOff={p.videoOff}
            stream={p.stream}
            isPinned={false}
            onTogglePin={() => handleTogglePin(p.id)}
            isScreenSharing={p.isScreenSharing}
          />
        ))}
      </div>
    </div>
  );
}
