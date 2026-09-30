'use client';

import React, { useEffect } from 'react';
import { UserX, PhoneOff, ArrowLeft } from 'lucide-react';

interface RemovedByHostModalProps {
  isOpen: boolean;
  reason?: 'removed' | 'ended';
  hostName?: string;
  onConfirm: () => void;
}

export default function RemovedByHostModal({
  isOpen,
  reason = 'removed',
  hostName = 'The host',
  onConfirm,
}: RemovedByHostModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm]);

  if (!isOpen) return null;

  const isRemoved = reason === 'removed';
  const title = isRemoved ? 'You have been removed' : 'Meeting Ended';
  const description = isRemoved
    ? `${hostName} has removed you from this meeting.`
    : `${hostName} has ended this meeting for all participants.`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        padding: '16px',
        animation: 'zoomFadeIn 0.15s ease-out',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="removed-modal-title"
    >
      <div
        className="removed-modal-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#23272B',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          border: isRemoved
            ? '1px solid rgba(239, 68, 68, 0.3)'
            : '1px solid rgba(245, 158, 11, 0.3)',
          padding: '28px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          color: '#FFFFFF',
          animation: 'zoomPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Status Icon Badge */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: isRemoved
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(245, 158, 11, 0.15)',
            border: isRemoved
              ? '1px solid rgba(239, 68, 68, 0.3)'
              : '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: isRemoved
              ? '0 0 24px rgba(239, 68, 68, 0.2)'
              : '0 0 24px rgba(245, 158, 11, 0.2)',
          }}
        >
          {isRemoved ? (
            <UserX size={28} color="#EF4444" />
          ) : (
            <PhoneOff size={28} color="#F59E0B" />
          )}
        </div>

        {/* Modal Title */}
        <h2
          id="removed-modal-title"
          style={{
            fontSize: '19px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '8px',
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </h2>

        {/* Modal Description */}
        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.75)',
            marginBottom: '24px',
            maxWidth: '340px',
          }}
        >
          {description}
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onConfirm}
          autoFocus
          style={{
            width: '100%',
            height: '44px',
            borderRadius: 'var(--zoom-radius-pill)',
            backgroundColor: 'var(--zoom-blue)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(14, 113, 235, 0.35)',
            transition: 'background-color 0.15s ease, transform 0.1s ease',
            touchAction: 'manipulation',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--zoom-blue-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--zoom-blue)';
          }}
        >
          <ArrowLeft size={16} />
          <span>OK, Return to Home</span>
        </button>
      </div>
    </div>
  );
}
