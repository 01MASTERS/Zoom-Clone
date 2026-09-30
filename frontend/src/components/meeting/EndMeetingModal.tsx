'use client';

import React, { useEffect } from 'react';
import { X, LogOut, PhoneOff } from 'lucide-react';

interface EndMeetingModalProps {
  isOpen: boolean;
  isHost: boolean;
  onClose: () => void;
  onLeave: () => void;
  onEndForAll?: () => void;
}

export default function EndMeetingModal({
  isOpen,
  isHost,
  onClose,
  onLeave,
  onEndForAll,
}: EndMeetingModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#26292E',
          borderRadius: '12px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          animation: 'zoomFadeIn 0.15s ease-out',
          color: '#FFFFFF',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
            {isHost ? 'End Meeting or Leave?' : 'Leave Meeting?'}
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '50%',
              color: 'rgba(255, 255, 255, 0.7)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px', lineHeight: 1.5 }}>
            {isHost
              ? 'As the host, you can end the meeting for all participants or simply leave the session yourself.'
              : 'Are you sure you want to disconnect and exit this conference room?'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isHost && onEndForAll && (
              <button
                type="button"
                onClick={onEndForAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--zoom-radius-pill)',
                  backgroundColor: 'var(--zoom-red)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(224, 32, 32, 0.3)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-red-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-red)')}
              >
                <PhoneOff size={15} />
                <span>End Meeting for All</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLeave}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--zoom-radius-pill)',
                backgroundColor: isHost ? 'rgba(255, 255, 255, 0.12)' : 'var(--zoom-red)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: isHost ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isHost
                  ? 'rgba(255, 255, 255, 0.2)'
                  : 'var(--zoom-red-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isHost
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'var(--zoom-red)';
              }}
            >
              <LogOut size={15} />
              <span>Leave Meeting</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 'var(--zoom-radius-pill)',
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)')}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
