'use client';

import React from 'react';
import { X, Users, MessageSquare } from 'lucide-react';
import ChatDrawer from './ChatDrawer';
import ParticipantsDrawer from './ParticipantsDrawer';
import { ChatMessage, RemotePeer } from '@/hooks/useWebRTC';

interface LocalUserMeta {
  name: string;
  isHost: boolean;
  audioMuted: boolean;
  videoOff: boolean;
}

interface CollaborationDrawerProps {
  isOpen: boolean;
  activeTab: 'participants' | 'chat';
  onChangeTab: (tab: 'participants' | 'chat') => void;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserName: string;
  onSendMessage: (text: string) => void;
  localUser: LocalUserMeta;
  remotePeers: RemotePeer[];
  isHost: boolean;
  onMuteAll?: () => void;
  onRemoveParticipant?: (peerId: string) => void;
  onCopyInvite: () => void;
}

export default function CollaborationDrawer({
  isOpen,
  activeTab,
  onChangeTab,
  onClose,
  messages,
  currentUserName,
  onSendMessage,
  localUser,
  remotePeers,
  isHost,
  onMuteAll,
  onRemoveParticipant,
  onCopyInvite,
}: CollaborationDrawerProps) {
  if (!isOpen) return null;

  const totalParticipants = 1 + remotePeers.length;

  return (
    <aside
      className="collaboration-drawer"
      style={{
        width: '360px',
        height: '100%',
        backgroundColor: '#23272B',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header & Tabs */}
      <div
        style={{
          height: '52px',
          backgroundColor: '#1F2228',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px 0 16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onChangeTab('participants')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--zoom-radius-pill)',
              backgroundColor: activeTab === 'participants' ? 'var(--zoom-blue)' : 'transparent',
              color: activeTab === 'participants' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={14} />
            <span>Participants ({totalParticipants})</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--zoom-radius-pill)',
              backgroundColor: activeTab === 'chat' ? 'var(--zoom-blue)' : 'transparent',
              color: activeTab === 'chat' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <MessageSquare size={14} />
            <span>Chat</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close panel"
          style={{
            padding: '6px',
            borderRadius: '50%',
            color: 'rgba(255, 255, 255, 0.6)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Drawer Body */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'participants' ? (
          <ParticipantsDrawer
            localUser={localUser}
            remotePeers={remotePeers}
            isHost={isHost}
            onMuteAll={onMuteAll}
            onRemoveParticipant={onRemoveParticipant}
            onCopyInvite={onCopyInvite}
          />
        ) : (
          <ChatDrawer
            messages={messages}
            currentUserName={currentUserName}
            onSendMessage={onSendMessage}
          />
        )}
      </div>
    </aside>
  );
}
