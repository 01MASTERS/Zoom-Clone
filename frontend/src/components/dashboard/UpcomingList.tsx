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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="upcoming-item-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '18px 20px',
                borderRadius: 'var(--zoom-radius-md)',
                border: '1px solid var(--zoom-border-subtle)',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--zoom-blue)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(14, 113, 235, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--zoom-border-subtle)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
              }}
            >
              {/* Top Row: Date/Time Badge + Duration + Management Actions (Edit, Delete) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}>
                  {/* Time & Date Pill */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--zoom-blue)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--zoom-blue-light)',
                    whiteSpace: 'nowrap',
                  }}>
                    <Clock size={13} />
                    <span>{formatDateTime(meeting.scheduled_at)}</span>
                  </div>

                  {/* Duration Pill */}
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--zoom-input-bg)',
                    color: 'var(--zoom-text-secondary)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {meeting.duration_minutes} min
                  </span>
                </div>

                {/* Management Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setEditModalMeeting(meeting)}
                    title="Edit scheduled meeting"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--zoom-input-bg)',
                      border: '1px solid var(--zoom-border-subtle)',
                      color: 'var(--zoom-text-primary)',
                      fontSize: '12px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--zoom-border)';
                      e.currentTarget.style.color = '#111827';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)';
                      e.currentTarget.style.color = 'var(--zoom-text-primary)';
                    }}
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(meeting.meeting_code || meeting.meeting_id)}
                    title="Delete scheduled meeting"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #FEE2E2',
                      color: '#DC2626',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEE2E2';
                      e.currentTarget.style.borderColor = '#FCA5A5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#FEE2E2';
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Middle Section: Full-Width Title + ID & Passcode */}
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--zoom-text-primary)',
                  margin: '2px 0 6px',
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                }}>
                  {meeting.title}
                </h3>

                <div style={{
                  fontSize: '12px',
                  color: 'var(--zoom-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    Meeting ID: <strong style={{ color: 'var(--zoom-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatMeetingId(meeting.meeting_id)}</strong>
                  </span>
                  {meeting.passcode && (
                    <>
                      <span style={{ color: 'var(--zoom-border)' }}>•</span>
                      <span style={{ whiteSpace: 'nowrap' }}>
                        Passcode: <strong style={{ color: 'var(--zoom-text-primary)' }}>{meeting.passcode}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Row / Action Bar */}
              <div style={{
                borderTop: '1px solid var(--zoom-border-subtle)',
                paddingTop: '12px',
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(meeting.invite_url)}
                    title="Copy invitation link"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: 'var(--zoom-radius-pill)',
                      backgroundColor: 'var(--zoom-input-bg)',
                      border: '1px solid var(--zoom-border-subtle)',
                      color: 'var(--zoom-text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--zoom-border)';
                      e.currentTarget.style.borderColor = 'var(--zoom-border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)';
                      e.currentTarget.style.borderColor = 'var(--zoom-border-subtle)';
                    }}
                  >
                    <Copy size={13} />
                    <span>Copy Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteModalMeeting(meeting)}
                    title="Copy meeting invitation details"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: 'var(--zoom-radius-pill)',
                      backgroundColor: 'var(--zoom-input-bg)',
                      border: '1px solid var(--zoom-border-subtle)',
                      color: 'var(--zoom-text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--zoom-border)';
                      e.currentTarget.style.borderColor = 'var(--zoom-border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)';
                      e.currentTarget.style.borderColor = 'var(--zoom-border-subtle)';
                    }}
                  >
                    <FileText size={13} />
                    <span>Invitation</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleStart(meeting.meeting_id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 22px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'var(--zoom-blue)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(14, 113, 235, 0.28)',
                    transition: 'all 0.15s ease',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--zoom-blue-hover)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 113, 235, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--zoom-blue)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(14, 113, 235, 0.28)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Video size={14} fill="#FFFFFF" />
                  <span>Start</span>
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
