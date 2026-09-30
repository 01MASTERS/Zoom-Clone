'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, Clock, Video, Copy, Loader2, FileText } from 'lucide-react';
import { getRecentMeetings, formatMeetingId, Meeting } from '@/lib/api';
import CopyInvitationModal from '../CopyInvitationModal';

interface RecentListProps {
  onShowToast: (msg: string) => void;
}

export default function RecentList({ onShowToast }: RecentListProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalMeeting, setInviteModalMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setLoading(true);
        const data = await getRecentMeetings();
        setMeetings(data);
      } catch {
        // Fallback silently if offline
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  const handleStart = (meetingId: string) => {
    const cleanId = meetingId.replace(/[\s-]/g, '');
    router.push(`/meeting/${cleanId}?name=Alex%20Rivera&isHost=true`);
  };

  const handleCopyLink = async (inviteUrl: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteUrl).catch(() => {});
      onShowToast('Meeting link copied to clipboard!');
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="recent-card"
      style={{
        backgroundColor: 'var(--zoom-card-bg)',
        borderRadius: 'var(--zoom-radius-lg)',
        border: '1px solid var(--zoom-border-subtle)',
        padding: '24px',
        boxShadow: 'var(--zoom-shadow-sm)',
        marginTop: '24px',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--zoom-border-subtle)',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: 'var(--zoom-input-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--zoom-text-secondary)',
        }}>
          <History size={18} />
        </div>
        <div>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--zoom-text-primary)' }}>
            Recent Meetings
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--zoom-text-secondary)' }}>
            Past conference history and participant sessions
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '36px 0',
          color: 'var(--zoom-text-secondary)',
          gap: '8px',
          fontSize: '13px',
        }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Loading meeting history...</span>
        </div>
      ) : meetings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '36px 16px',
          color: 'var(--zoom-text-secondary)',
          fontSize: '13px',
        }}>
          No previous meetings recorded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="recent-item-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: 'var(--zoom-radius-md)',
                border: '1px solid var(--zoom-border-subtle)',
                backgroundColor: '#FFFFFF',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--zoom-border)';
                e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--zoom-border-subtle)';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              {/* Meeting Info */}
              <div className="recent-item-info">
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '2px',
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--zoom-text-primary)',
                  }}>
                    {meeting.title}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: meeting.status === 'completed' ? 'var(--zoom-bg)' : 'var(--zoom-green-light)',
                    color: meeting.status === 'completed' ? 'var(--zoom-text-secondary)' : 'var(--zoom-green)',
                  }}>
                    {meeting.status}
                  </span>
                </div>

                <div style={{
                  fontSize: '12px',
                  color: 'var(--zoom-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span>{formatDate(meeting.created_at)}</span>
                  <span>•</span>
                  <span>ID: {formatMeetingId(meeting.meeting_id)}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={11} /> {meeting.duration_minutes} min
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="recent-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setInviteModalMeeting(meeting)}
                  title="Copy meeting invitation"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'transparent',
                    color: 'var(--zoom-text-secondary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileText size={13} />
                  <span>Invitation</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyLink(meeting.invite_url)}
                  title="Copy meeting link"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'transparent',
                    color: 'var(--zoom-text-secondary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStart(meeting.meeting_id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'var(--zoom-input-bg)',
                    color: 'var(--zoom-blue)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid var(--zoom-border-subtle)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--zoom-blue-light)';
                    e.currentTarget.style.borderColor = 'var(--zoom-blue)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)';
                    e.currentTarget.style.borderColor = 'var(--zoom-border-subtle)';
                  }}
                >
                  <Video size={13} />
                  <span>Re-open</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Copy Invitation Modal */}
      <CopyInvitationModal
        meeting={inviteModalMeeting}
        isOpen={Boolean(inviteModalMeeting)}
        onClose={() => setInviteModalMeeting(null)}
        onCopied={() => onShowToast('Meeting invitation copied to clipboard!')}
      />
    </div>
  );
}
