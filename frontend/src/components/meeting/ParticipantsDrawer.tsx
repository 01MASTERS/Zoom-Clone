'use client';

import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Crown,
  UserX,
  Copy,
  VolumeX,
} from 'lucide-react';
import { RemotePeer } from '@/hooks/useWebRTC';

interface LocalUserMeta {
  name: string;
  isHost: boolean;
  audioMuted: boolean;
  videoOff: boolean;
}

interface ParticipantsDrawerProps {
  localUser: LocalUserMeta;
  remotePeers: RemotePeer[];
  isHost: boolean;
  onMuteAll?: () => void;
  onRemoveParticipant?: (peerId: string) => void;
  onCopyInvite: () => void;
}

export default function ParticipantsDrawer({
  localUser,
  remotePeers,
  isHost,
  onMuteAll,
  onRemoveParticipant,
  onCopyInvite,
}: ParticipantsDrawerProps) {
  const getInitials = (name: string) => {
    return (
      name
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('') || 'U'
    );
  };

  const totalCount = 1 + remotePeers.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#23272B',
        color: '#FFFFFF',
      }}
    >
      {/* Search / Count Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.65)',
        }}
      >
        <span>
          In Meeting (<strong style={{ color: '#FFFFFF' }}>{totalCount}</strong>)
        </span>
        <button
          onClick={onCopyInvite}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--zoom-radius-pill)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '11px',
            fontWeight: 500,
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
        >
          <Copy size={11} />
          <span>Copy Invite</span>
        </button>
      </div>

      {/* Participant List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {/* 1. Local User (Pinned at Top) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0E71EB, #6366F1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              {getInitials(localUser.name)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>
                  {localUser.name}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  (Me)
                </span>
              </div>
              {localUser.isHost && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#FBBF24', fontWeight: 600 }}>
                  <Crown size={10} />
                  <span>Host</span>
                </div>
              )}
            </div>
          </div>

          {/* Media Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {localUser.audioMuted ? (
              <MicOff size={15} color="var(--zoom-red)" />
            ) : (
              <Mic size={15} color="var(--zoom-green)" />
            )}
            {localUser.videoOff ? (
              <VideoOff size={15} color="var(--zoom-red)" />
            ) : (
              <Video size={15} color="rgba(255, 255, 255, 0.8)" />
            )}
          </div>
        </div>

        {/* 2. Remote Participants */}
        {remotePeers.map((peer) => (
          <div
            key={peer.peerId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981, #0E71EB)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {getInitials(peer.name)}
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>
                  {peer.name}
                </div>
                {peer.isHost && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#FBBF24', fontWeight: 600 }}>
                    <Crown size={10} />
                    <span>Host</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {peer.audioMuted ? (
                <MicOff size={15} color="var(--zoom-red)" />
              ) : (
                <Mic size={15} color="var(--zoom-green)" />
              )}
              {peer.videoOff ? (
                <VideoOff size={15} color="var(--zoom-red)" />
              ) : (
                <Video size={15} color="rgba(255, 255, 255, 0.8)" />
              )}

              {/* Host moderation action: Remove participant */}
              {isHost && onRemoveParticipant && (
                <button
                  type="button"
                  onClick={() => onRemoveParticipant(peer.peerId)}
                  title={`Remove ${peer.name} from meeting`}
                  style={{
                    padding: '4px',
                    borderRadius: '4px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--zoom-red)';
                    e.currentTarget.style.backgroundColor = 'rgba(224, 32, 32, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <UserX size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Host Controls Footer */}
      {isHost && (
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#1F2228',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: '10px',
          }}
        >
          {onMuteAll && (
            <button
              type="button"
              onClick={onMuteAll}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: 'var(--zoom-radius-pill)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
            >
              <VolumeX size={14} />
              <span>Mute All</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCopyInvite}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: 'var(--zoom-radius-pill)',
              backgroundColor: 'var(--zoom-blue)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-blue-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-blue)')}
          >
            <Copy size={13} />
            <span>Invite</span>
          </button>
        </div>
      )}
    </div>
  );
}
