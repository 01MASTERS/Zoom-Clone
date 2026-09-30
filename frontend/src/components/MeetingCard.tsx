'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Video, Copy, ExternalLink, Trash2, FileText, Pencil } from 'lucide-react';
import { Meeting, formatMeetingId } from '@/lib/api';

interface MeetingCardProps {
  meeting: Meeting;
  type?: 'upcoming' | 'recent';
  onCopyLink: (link: string) => void;
  onOpenInvitationModal?: (meeting: Meeting) => void;
  onEditMeeting?: (meeting: Meeting) => void;
  onDeleteMeeting?: (meetingId: string) => void;
}

export default function MeetingCard({
  meeting,
  type = 'upcoming',
  onCopyLink,
  onOpenInvitationModal,
  onEditMeeting,
  onDeleteMeeting,
}: MeetingCardProps) {
  const router = useRouter();

  const cleanId = (meeting.meeting_code || meeting.meeting_id).replace(/\s+/g, '');
  const formattedId = formatMeetingId(meeting.meeting_code || meeting.meeting_id);
  const inviteUrl = (typeof window !== 'undefined'
    ? `${window.location.origin}/join?meetingId=${cleanId}`
    : meeting.invite_url || meeting.join_url) || `/join?meetingId=${cleanId}`;

  const handleStartOrJoin = () => {
    const hostName = typeof window !== 'undefined'
      ? localStorage.getItem('zoom_display_name') || 'Alex Rivera'
      : 'Alex Rivera';
    router.push(`/meeting/${cleanId}?name=${encodeURIComponent(hostName)}&isHost=${type === 'upcoming'}`);
  };

  let formattedTime = 'No scheduled time';
  if (meeting.scheduled_at) {
    try {
      const dt = new Date(meeting.scheduled_at);
      formattedTime = dt.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }) + ' · ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {}
  } else if (meeting.created_at) {
    try {
      const dt = new Date(meeting.created_at);
      formattedTime = dt.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      }) + ' · ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {}
  }

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#BFDBFE';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#111827',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {meeting.title}
          </h4>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: meeting.status === 'scheduled' ? '#EFF6FF' : '#F3F4F6',
              color: meeting.status === 'scheduled' ? '#0B5CFF' : '#4B5563',
            }}
          >
            {meeting.status === 'scheduled' ? 'Scheduled' : 'Past'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#6B7280' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} />
            {formattedTime}
          </span>
          <span>•</span>
          <span>ID: <strong style={{ color: '#374151' }}>{formattedId}</strong></span>
          {meeting.passcode && (
            <>
              <span>•</span>
              <span>Passcode: {meeting.passcode}</span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {onOpenInvitationModal && (
          <button
            type="button"
            onClick={() => onOpenInvitationModal(meeting)}
            title="Copy meeting invitation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <FileText size={13} />
            <span>Invitation</span>
          </button>
        )}

        {onEditMeeting && type === 'upcoming' && (
          <button
            type="button"
            onClick={() => onEditMeeting(meeting)}
            title="Edit scheduled meeting"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Pencil size={13} />
            <span>Edit</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onCopyLink(inviteUrl)}
          title="Copy invite link"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Copy size={13} />
          <span>Copy Link</span>
        </button>

        <button
          type="button"
          onClick={handleStartOrJoin}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#0B5CFF',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Video size={13} />
          <span>{type === 'upcoming' ? 'Start' : 'Rejoin'}</span>
        </button>

        {onDeleteMeeting && type === 'upcoming' && (
          <button
            type="button"
            onClick={() => onDeleteMeeting(meeting.meeting_code || meeting.meeting_id)}
            title="Delete meeting"
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid #FCA5A5',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
