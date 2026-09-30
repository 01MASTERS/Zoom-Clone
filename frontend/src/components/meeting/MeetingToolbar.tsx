'use client';

import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  Users,
  MessageSquare,
  Share2,
  LayoutGrid,
  PhoneOff,
} from 'lucide-react';

interface MeetingToolbarProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  isHost: boolean;
  participantCount: number;
  viewMode: 'gallery' | 'speaker';
  onToggleViewMode: () => void;
  activeDrawer?: 'participants' | 'chat' | null;
  unreadCount?: number;
  onOpenChat?: () => void;
  onOpenParticipants?: () => void;
  onShareScreen?: () => void;
  isScreenSharing?: boolean;
  onEndClick: () => void;
}

export default function MeetingToolbar({
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  isHost,
  participantCount,
  viewMode,
  onToggleViewMode,
  activeDrawer = null,
  unreadCount = 0,
  onOpenChat,
  onOpenParticipants,
  onShareScreen,
  isScreenSharing = false,
  onEndClick,
}: MeetingToolbarProps) {
  return (
    <footer
      className="meeting-toolbar"
      style={{
        height: '74px',
        backgroundColor: '#1F2228',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        color: '#FFFFFF',
        zIndex: 100,
        userSelect: 'none',
      }}
    >
      {/* Left: Audio & Video Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Audio Toggle */}
        <button
          type="button"
          onClick={() => onToggleAudio()}
          title={audioEnabled ? 'Mute audio' : 'Unmute audio'}
          className="meeting-tool-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '56px',
            borderRadius: '8px',
            backgroundColor: audioEnabled ? 'transparent' : 'rgba(224, 32, 32, 0.18)',
            color: audioEnabled ? '#FFFFFF' : 'var(--zoom-red)',
            transition: 'background-color 0.15s ease',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
            {audioEnabled ? 'Mute' : 'Unmute'}
          </span>
        </button>

        {/* Video Toggle */}
        <button
          type="button"
          onClick={() => onToggleVideo()}
          title={videoEnabled ? 'Stop video' : 'Start video'}
          className="meeting-tool-btn"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '68px',
            height: '56px',
            borderRadius: '8px',
            backgroundColor: videoEnabled ? 'transparent' : 'rgba(224, 32, 32, 0.18)',
            color: videoEnabled ? '#FFFFFF' : 'var(--zoom-red)',
            transition: 'background-color 0.15s ease',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
            {videoEnabled ? 'Stop Video' : 'Start Video'}
          </span>
        </button>
      </div>

      {/* Center: Collaboration Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Security Placeholder */}
        <button
          type="button"
          title="Security settings"
          className="meeting-tool-btn toolbar-desktop-only"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '56px',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.85)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Shield size={20} />
          <span style={{ fontSize: '11px', marginTop: '4px' }}>Security</span>
        </button>

        {/* Participants Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenParticipants}
          title="Participants list"
          className="meeting-tool-btn"
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '76px',
            height: '56px',
            borderRadius: '8px',
            backgroundColor: activeDrawer === 'participants' ? 'rgba(14, 113, 235, 0.25)' : 'transparent',
            color: activeDrawer === 'participants' ? 'var(--zoom-blue)' : 'rgba(255, 255, 255, 0.85)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (activeDrawer !== 'participants') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            if (activeDrawer !== 'participants') e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ position: 'relative' }}>
            <Users size={20} />
            <span
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-10px',
                padding: '1px 5px',
                backgroundColor: 'var(--zoom-blue)',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              {participantCount}
            </span>
          </div>
          <span style={{ fontSize: '11px', marginTop: '4px' }}>Participants</span>
        </button>

        {/* Chat Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenChat}
          title="In-meeting chat"
          className="meeting-tool-btn"
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '56px',
            borderRadius: '8px',
            backgroundColor: activeDrawer === 'chat' ? 'rgba(14, 113, 235, 0.25)' : 'transparent',
            color: activeDrawer === 'chat' ? 'var(--zoom-blue)' : 'rgba(255, 255, 255, 0.85)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (activeDrawer !== 'chat') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            if (activeDrawer !== 'chat') e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ position: 'relative' }}>
            <MessageSquare size={20} />
            {unreadCount > 0 && activeDrawer !== 'chat' && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-8px',
                  padding: '1px 4px',
                  backgroundColor: 'var(--zoom-red)',
                  borderRadius: '8px',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', marginTop: '4px' }}>Chat</span>
        </button>

        {/* Screen Share Action */}
        <button
          type="button"
          onClick={onShareScreen}
          title={isScreenSharing ? 'Stop screen sharing' : 'Share your screen'}
          className="meeting-tool-btn toolbar-desktop-only"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '84px',
            height: '56px',
            borderRadius: '8px',
            color: isScreenSharing ? '#F87171' : 'var(--zoom-green)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Share2 size={20} />
          <span style={{ fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
            {isScreenSharing ? 'Stop Share' : 'Share Screen'}
          </span>
        </button>

        {/* View Mode Switcher (Gallery vs Speaker) */}
        <button
          type="button"
          onClick={onToggleViewMode}
          title={`Switch to ${viewMode === 'gallery' ? 'Speaker View' : 'Gallery View'}`}
          className="meeting-tool-btn toolbar-desktop-only"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '68px',
            height: '56px',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.85)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <LayoutGrid size={20} />
          <span style={{ fontSize: '11px', marginTop: '4px' }}>
            {viewMode === 'gallery' ? 'Speaker' : 'Gallery'}
          </span>
        </button>
      </div>

      {/* Right: Leave / End Meeting Button */}
      <div>
        <button
          type="button"
          onClick={onEndClick}
          className="meeting-leave-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 18px',
            borderRadius: 'var(--zoom-radius-pill)',
            backgroundColor: 'var(--zoom-red)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(224, 32, 32, 0.3)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-red-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-red)')}
        >
          <PhoneOff size={14} />
          <span>{isHost ? 'End' : 'Leave'}</span>
        </button>
      </div>
    </footer>
  );
}
