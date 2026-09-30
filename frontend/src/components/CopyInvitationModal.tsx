'use client';

import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Meeting, formatMeetingId } from '@/lib/api';

interface CopyInvitationModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
  onCopied?: () => void;
}

export default function CopyInvitationModal({
  meeting,
  isOpen,
  onClose,
  onCopied
}: CopyInvitationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !meeting) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const cleanId = (meeting.meeting_code || meeting.meeting_id).replace(/\s+/g, '');
  const joinUrl = `${origin}/join?meetingId=${cleanId}`;
  const formattedId = formatMeetingId(meeting.meeting_code || meeting.meeting_id);

  let formattedDate = 'Now';
  if (meeting.scheduled_at) {
    try {
      const dt = new Date(meeting.scheduled_at);
      formattedDate = dt.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {}
  }

  const invitationText = `${meeting.host_name || 'Alex Rivera'} is inviting you to a scheduled Zoom meeting.

Topic: ${meeting.title}
Time: ${formattedDate}

Join Zoom Meeting
${joinUrl}

Meeting ID: ${formattedId}${meeting.passcode ? `\nPasscode: ${meeting.passcode}` : ''}`;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(invitationText);
        setCopied(true);
        if (onCopied) onCopied();
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy invitation text:', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        padding: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
            Copy Meeting Invitation
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#1F2937',
              whiteSpace: 'pre-wrap',
              maxHeight: '260px',
              overflowY: 'auto'
            }}
          >
            {invitationText}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '16px 20px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '6px',
              backgroundColor: copied ? '#10B981' : '#0B5CFF',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Meeting Invitation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
