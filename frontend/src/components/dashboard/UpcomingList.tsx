'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Video, Copy, Loader2, Trash2, FileText, Pencil } from 'lucide-react';
import { getUpcomingMeetings, formatMeetingId, deleteMeeting, Meeting } from '@/lib/api';
import CopyInvitationModal from '../CopyInvitationModal';
import EditMeetingModal from './EditMeetingModal';

interface UpcomingListProps {
  refreshTrigger?: number;
  onShowToast: (msg: string) => void;
  onOpenSchedule: () => void;
}

export default function UpcomingList({ refreshTrigger, onShowToast, onOpenSchedule }: UpcomingListProps) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalMeeting, setInviteModalMeeting] = useState<Meeting | null>(null);
  const [editModalMeeting, setEditModalMeeting] = useState<Meeting | null>(null);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUpcomingMeetings();
      setMeetings(data);
    } catch (err: any) {
      setError(err.message || 'Could not load upcoming meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [refreshTrigger]);

  const handleStart = (meetingId: string) => {
    const cleanId = meetingId.replace(/[\s-]/g, '');
    router.push(`/meeting/${cleanId}?name=Alex%20Rivera&isHost=true`);
  };

  const handleCopyLink = async (inviteUrl: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      let urlToCopy = inviteUrl;
      if (typeof window !== 'undefined') {
        const match = inviteUrl.match(/\/meeting\/([a-zA-Z0-9\s-]+)/);
        if (match && match[1]) {
          urlToCopy = `${window.location.origin}/meeting/${match[1].replace(/[\s-]/g, '')}`;
        }
      }
      await navigator.clipboard.writeText(urlToCopy).catch(() => {});
      onShowToast('Invitation link copied to clipboard!');
    }
  };

  const handleDelete = async (meetingCodeOrId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to cancel this scheduled meeting?')) return;
    try {
      await deleteMeeting(meetingCodeOrId);
      onShowToast('Scheduled meeting deleted.');
      fetchMeetings();
    } catch (err: any) {
      onShowToast(`Failed to delete: ${err.message || 'Error'}`);
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Scheduled soon';
    try {
      let d: Date;
      if (dateStr.includes('T')) {
        const [dPart, tPart] = dateStr.replace('Z', '').split('T');
        const [year, month, day] = dPart.split('-').map(Number);
        const [hour, minute] = tPart.split(':').map(Number);
        d = new Date(year, month - 1, day, hour, minute || 0);
      } else {
        d = new Date(dateStr);
      }
      return d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="upcoming-card"
      style={{
        backgroundColor: 'var(--zoom-card-bg)',
        borderRadius: 'var(--zoom-radius-lg)',
        border: '1px solid var(--zoom-border-subtle)',
        padding: '24px',
        boxShadow: 'var(--zoom-shadow-sm)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--zoom-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'var(--zoom-blue-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--zoom-blue)',
          }}>
            <Calendar size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--zoom-text-primary)' }}>
              Upcoming Meetings
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--zoom-text-secondary)' }}>
              {meetings.length} meeting{meetings.length === 1 ? '' : 's'} on schedule
            </span>
          </div>
        </div>

        <button
          onClick={onOpenSchedule}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--zoom-blue)',
            padding: '6px 12px',
            borderRadius: 'var(--zoom-radius-sm)',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-blue-light)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          + Schedule New
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 0',
          color: 'var(--zoom-text-secondary)',
          gap: '8px',
          fontSize: '14px',
        }}>
          <Loader2 size={20} className="animate-spin" />
          <span>Loading scheduled meetings...</span>
        </div>
      ) : error ? (
        <div style={{
          padding: '24px',
          backgroundColor: 'var(--zoom-red-light)',
          color: 'var(--zoom-red)',
          borderRadius: 'var(--zoom-radius-md)',
          fontSize: '13px',
          textAlign: 'center',
        }}>
          {error}
          <button
            onClick={fetchMeetings}
            style={{
              display: 'block',
              margin: '8px auto 0',
              fontWeight: 600,
              textDecoration: 'underline',
              color: 'var(--zoom-red)',
            }}
          >
            Retry
          </button>
        </div>
      ) : meetings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 16px',
          color: 'var(--zoom-text-secondary)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--zoom-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: 'var(--zoom-text-muted)',
          }}>
            <Calendar size={24} />
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--zoom-text-primary)' }}>
            No upcoming meetings scheduled
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            Click &quot;Schedule New&quot; to plan your next conference.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="upcoming-item-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 'var(--zoom-radius-md)',
                border: '1px solid var(--zoom-border-subtle)',
                backgroundColor: '#FFFFFF',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--zoom-blue)';
                e.currentTarget.style.boxShadow = 'var(--zoom-shadow-sm)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--zoom-border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Meeting Info */}
              <div className="upcoming-item-info" style={{ maxWidth: '65%' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--zoom-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Clock size={13} />
                    {formatDateTime(meeting.scheduled_at)}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--zoom-input-bg)',
                    color: 'var(--zoom-text-secondary)',
                    fontWeight: 500,
                  }}>
                    {meeting.duration_minutes} min
                  </span>
                </div>

                <div style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--zoom-text-primary)',
                  marginBottom: '2px',
                }}>
                  {meeting.title}
                </div>

                <div style={{
                  fontSize: '12px',
                  color: 'var(--zoom-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span>Meeting ID: <strong>{formatMeetingId(meeting.meeting_id)}</strong></span>
                  {meeting.passcode && (
                    <span>Passcode: <strong>{meeting.passcode}</strong></span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="upcoming-item-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setInviteModalMeeting(meeting)}
                  title="Copy meeting invitation"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'var(--zoom-input-bg)',
                    color: 'var(--zoom-text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'background-color 0.15s ease',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)')}
                >
                  <FileText size={13} />
                  <span>Invitation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditModalMeeting(meeting)}
                  title="Edit scheduled meeting"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'var(--zoom-input-bg)',
                    color: 'var(--zoom-text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'background-color 0.15s ease',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)')}
                >
                  <Pencil size={13} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyLink(meeting.invite_url)}
                  title="Copy invitation link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'var(--zoom-input-bg)',
                    color: 'var(--zoom-text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    transition: 'background-color 0.15s ease',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-border)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)')}
                >
                  <Copy size={13} />
                  <span>Copy Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStart(meeting.meeting_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'var(--zoom-blue)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxShadow: '0 2px 6px rgba(14, 113, 235, 0.25)',
                    transition: 'all 0.15s ease',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-blue-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-blue)')}
                >
                  <Video size={14} fill="#FFFFFF" />
                  <span>Start</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(meeting.meeting_code || meeting.meeting_id)}
                  title="Delete scheduled meeting"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 10px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    border: '1px solid #FCA5A5',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zoom-Style Copy Invitation Modal */}
      <CopyInvitationModal
        meeting={inviteModalMeeting}
        isOpen={Boolean(inviteModalMeeting)}
        onClose={() => setInviteModalMeeting(null)}
        onCopied={() => onShowToast('Meeting invitation copied to clipboard!')}
      />

      {/* Zoom-Style Edit Scheduled Meeting Modal */}
      <EditMeetingModal
        meeting={editModalMeeting}
        isOpen={Boolean(editModalMeeting)}
        onClose={() => setEditModalMeeting(null)}
        onUpdated={(updatedTitle) => {
          fetchMeetings();
          onShowToast(`Meeting "${updatedTitle}" updated successfully!`);
        }}
      />
    </div>
  );
}
