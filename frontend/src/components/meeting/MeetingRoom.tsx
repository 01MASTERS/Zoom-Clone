'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, Copy, Clock } from 'lucide-react';
import VideoGrid from './VideoGrid';
import MeetingToolbar from './MeetingToolbar';
import EndMeetingModal from './EndMeetingModal';
import CollaborationDrawer from './CollaborationDrawer';
import ScreenShareBanner from './ScreenShareBanner';
import Toast from '@/components/common/Toast';
import RemovedByHostModal from './RemovedByHostModal';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useScreenShare } from '@/hooks/useScreenShare';
import { formatMeetingId } from '@/lib/api';

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  userName: string;
  isHost?: boolean;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveMeeting: (reason?: string) => void;
}

function MeetingDurationTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const timeStr = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className="meeting-timer-pill"
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: 'rgba(255, 255, 255, 0.75)',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        padding: '4px 14px',
        borderRadius: '12px',
        fontVariantNumeric: 'tabular-nums',
        pointerEvents: 'none',
      }}
    >
      <Clock size={13} color="var(--zoom-blue)" />
      <span style={{ minWidth: '42px', textAlign: 'center', fontWeight: 500 }}>
        {timeStr}
      </span>
    </div>
  );
}

export default function MeetingRoom({
  meetingId,
  meetingTitle,
  userName,
  isHost = false,
  stream,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveMeeting,
}: MeetingRoomProps) {
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'participants' | 'chat' | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [removedInfo, setRemovedInfo] = useState<{
    isOpen: boolean;
    reason: 'removed' | 'ended';
    hostName: string;
  } | null>(null);

  const prevMessageCountRef = useRef(0);

  // WebRTC mesh signaling hook
  const {
    peers,
    isConnected,
    myPeerId,
    messages,
    broadcastMediaState,
    sendChatMessage,
    sendHostAction,
    replaceVideoTrack,
  } = useWebRTC({
    meetingId,
    userName,
    isHost,
    localStream: stream,
    onKicked: (reason: 'removed' | 'ended' = 'removed', by?: string) => {
      // 1. Immediately mute and stop local media tracks
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch {}
        });
      }

      // 2. Open responsive Removal Modal
      setRemovedInfo({
        isOpen: true,
        reason,
        hostName: by || 'The host',
      });

      // 3. Show floating toast notification as well
      setToastType('error');
      setToastMessage(
        reason === 'removed'
          ? `${by || 'The host'} has removed you from this meeting.`
          : `${by || 'The host'} has ended this meeting for all participants.`
      );
    },
    onHostMuted: () => {
      if (audioEnabled) {
        onToggleAudio();
        setToastType('warning');
        setToastMessage('The host muted all participants.');
      }
    },
  });

  // Screen sharing hook
  const { isScreenSharing, screenStream, startScreenShare, stopScreenShare } = useScreenShare({
    cameraStream: stream,
    replaceVideoTrack,
    onShowToast: (msg) => setToastMessage(msg),
  });

  // Hot-swap outgoing video track to all peer connections when camera track updates (e.g. video turned on/off)
  useEffect(() => {
    if (!stream || isScreenSharing) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      replaceVideoTrack(videoTrack).catch(() => {});
    }
  }, [stream, isScreenSharing, replaceVideoTrack]);

  // Track unread messages when chat drawer is closed
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      if (activeDrawer !== 'chat') {
        const diff = messages.length - prevMessageCountRef.current;
        setUnreadCount((prev) => prev + diff);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, activeDrawer]);

  const handleOpenChat = () => {
    setActiveDrawer((prev) => (prev === 'chat' ? null : 'chat'));
    setUnreadCount(0);
  };

  const handleOpenParticipants = () => {
    setActiveDrawer((prev) => (prev === 'participants' ? null : 'participants'));
  };

  // Notify peers when local audio, video, or screen sharing state changes
  useEffect(() => {
    const effectiveVideoOff = isScreenSharing ? false : !videoEnabled;
    broadcastMediaState(!audioEnabled, effectiveVideoOff, isScreenSharing);
  }, [audioEnabled, videoEnabled, isScreenSharing, broadcastMediaState]);

  const handleCopyInvite = async () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const inviteUrl = `${window.location.origin}/meeting/${meetingId.replace(/[\s-]/g, '')}`;
      await navigator.clipboard.writeText(inviteUrl).catch(() => {});
      setToastMessage('Meeting invite link copied to clipboard!');
    }
  };

  const handleEndForAll = () => {
    sendHostAction('remove-participant');
    onLeaveMeeting();
  };

  const localUserObj = {
    name: userName,
    isHost,
    audioMuted: !audioEnabled,
    videoOff: isScreenSharing ? false : !videoEnabled,
    stream: isScreenSharing && screenStream ? screenStream : stream,
    isScreenSharing,
  };

  const participantCount = 1 + peers.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1A1A1A',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Meeting Header Bar */}
      <header
        className="meeting-header"
        style={{
          height: '52px',
          backgroundColor: '#1F2228',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 10,
        }}
      >
        {/* Left: Meeting Title & Security */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--zoom-green)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={16} />
            <span
              className="meeting-header-title"
              style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 600 }}
            >
              {meetingTitle}
            </span>
          </div>

          <span className="meeting-header-extra" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>|</span>

          <span className="meeting-header-extra" style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
            ID: <strong style={{ color: '#FFFFFF' }}>{formatMeetingId(meetingId)}</strong>
          </span>

          <button
            className="meeting-header-extra"
            onClick={handleCopyInvite}
            title="Copy invitation link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--zoom-radius-pill)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '11px',
              fontWeight: 500,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          >
            <Copy size={11} />
            <span>Copy Link</span>
          </button>
        </div>

        {/* Center: Absolute Fixed Meeting Duration Timer (zero stutter) */}
        <MeetingDurationTimer />

        {/* Right: Signaling Status with fixed min-width to prevent shifting */}
        <div
          className="meeting-header-status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            minWidth: '105px',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? 'var(--zoom-green)' : 'var(--zoom-red)',
              flexShrink: 0,
            }}
          />
          <span
            className="meeting-header-status-text"
            style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)', fontVariantNumeric: 'tabular-nums' }}
          >
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Floating Screen Share Banner */}
      {isScreenSharing && (
        <ScreenShareBanner onStopShare={stopScreenShare} />
      )}

      {/* Main Video Area and Collaboration Drawer Container */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <VideoGrid
            localUser={localUserObj}
            remotePeers={peers}
            viewMode={viewMode}
          />
        </main>

        {/* Right-Docked Collaboration Drawer */}
        <CollaborationDrawer
          isOpen={activeDrawer !== null}
          activeTab={activeDrawer || 'chat'}
          onChangeTab={(tab) => setActiveDrawer(tab)}
          onClose={() => setActiveDrawer(null)}
          messages={messages}
          currentUserName={userName}
          onSendMessage={sendChatMessage}
          localUser={localUserObj}
          remotePeers={peers}
          isHost={isHost}
          onMuteAll={() => {
            sendHostAction('mute-all');
            setToastMessage('Muted all participants');
          }}
          onRemoveParticipant={(pid) => {
            sendHostAction('remove-participant', pid);
            setToastMessage('Participant removed');
          }}
          onCopyInvite={handleCopyInvite}
        />
      </div>

      {/* Bottom Control Dock */}
      <MeetingToolbar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        isHost={isHost}
        participantCount={participantCount}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === 'gallery' ? 'speaker' : 'gallery'))}
        activeDrawer={activeDrawer}
        unreadCount={unreadCount}
        onOpenChat={handleOpenChat}
        onOpenParticipants={handleOpenParticipants}
        onShareScreen={startScreenShare}
        isScreenSharing={isScreenSharing}
        onEndClick={() => setIsEndModalOpen(true)}
      />

      {/* End / Leave Confirmation Modal */}
      <EndMeetingModal
        isOpen={isEndModalOpen}
        isHost={isHost}
        onClose={() => setIsEndModalOpen(false)}
        onLeave={() => {
          setIsEndModalOpen(false);
          onLeaveMeeting();
        }}
        onEndForAll={handleEndForAll}
      />

      {/* Removed by Host Responsive Modal */}
      {removedInfo?.isOpen && (
        <RemovedByHostModal
          isOpen={removedInfo.isOpen}
          reason={removedInfo.reason}
          hostName={removedInfo.hostName}
          onConfirm={() => {
            const reason = removedInfo.reason;
            setRemovedInfo(null);
            onLeaveMeeting(reason);
          }}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
