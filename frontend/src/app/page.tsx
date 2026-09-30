'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WorkplaceNavbar from '@/components/dashboard/WorkplaceNavbar';
import UpcomingList from '@/components/dashboard/UpcomingList';
import RecentList from '@/components/dashboard/RecentList';
import JoinModal from '@/components/dashboard/JoinModal';
import ScheduleModal from '@/components/dashboard/ScheduleModal';
import Toast from '@/components/common/Toast';
import {
  Video,
  Plus,
  Calendar,
  ChevronDown,
  ShieldCheck,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { createInstantMeeting } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();

  // Modals & notifications
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isCreatingInstant, setIsCreatingInstant] = useState(false);

  // Check for redirected meeting notifications (e.g. removed by host)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedNotif = sessionStorage.getItem('zoom_notification');
        const params = new URLSearchParams(window.location.search);
        const urlNotif = params.get('notification');
        const notification = storedNotif || urlNotif;

        if (notification === 'removed') {
          setTimeout(() => {
            try { sessionStorage.removeItem('zoom_notification'); } catch {}
          }, 1000);
          setToastType('error');
          setToastMessage('You have been removed from the meeting by the host.');
          if (urlNotif) window.history.replaceState({}, '', '/');
        } else if (notification === 'ended') {
          setTimeout(() => {
            try { sessionStorage.removeItem('zoom_notification'); } catch {}
          }, 1000);
          setToastType('warning');
          setToastMessage('The meeting was ended by the host.');
          if (urlNotif) window.history.replaceState({}, '', '/');
        }
      } catch {}
    }
  }, []);

  // Live time and date
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getHostName = () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('zoom_display_name');
        if (saved) return saved;
      } catch {}
    }
    return 'Alex Rivera';
  };

  // Instant meeting creation (MEET-01)
  const handleNewMeeting = async () => {
    try {
      setIsCreatingInstant(true);
      setToastMessage('Creating instant meeting...');
      const hostName = getHostName();
      const meeting = await createInstantMeeting('Instant Meeting', `${hostName} (Host)`);
      const cleanId = meeting.meeting_id.replace(/\s+/g, '');

      const inviteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/join?meetingId=${cleanId}`
        : meeting.invite_url;

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteUrl).catch(() => {});
        setToastMessage('Meeting created & invite link copied to clipboard!');
      }

      router.push(`/meeting/${cleanId}?name=${encodeURIComponent(hostName)}&isHost=true`);
    } catch (err: any) {
      console.error('Instant meeting error:', err);
      setToastMessage(`Could not start meeting: ${err.message || 'Server connection error'}`);
      setIsCreatingInstant(false);
    }
  };

  const handleCopyPersonalId = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText('849 203 1192').catch(() => {});
      setToastMessage('Personal Meeting ID copied to clipboard!');
    }
  };

  const handleCopyPersonalLink = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/meeting/8492031192`;
      await navigator.clipboard.writeText(url).catch(() => {});
      setToastMessage('Personal Meeting invitation link copied to clipboard!');
    }
  };

  const handleStartPersonalRoom = () => {
    const hostName = getHostName();
    router.push(`/meeting/8492031192?name=${encodeURIComponent(hostName)}&isHost=true`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FA' }}>
      {/* 1. Zoom Workplace Top Navigation Bar with Profile and Settings Placeholders */}
      <WorkplaceNavbar />

      <main
        className="dashboard-main"
        style={{
          maxWidth: '1160px',
          width: '100%',
          margin: '0 auto',
          padding: '36px 24px 64px',
          flex: 1,
        }}
      >
        {/* Top Hero Section: Centered Time, Date, and 3 Primary Zoom Buttons */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            className="dashboard-hero-time"
            style={{
              fontSize: '44px',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-1px',
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {currentTime || '10:50 PM'}
          </div>
          <div
            className="dashboard-hero-date"
            style={{
              fontSize: '15px',
              color: '#6B7280',
              marginTop: '6px',
              fontWeight: 500,
            }}
          >
            {currentDate || 'Tuesday, September 29, 2026'}
          </div>

          {/* Primary Action Buttons as specified in PDF (New Meeting, Join Meeting, Schedule Meeting) */}
          <div
            className="dashboard-action-buttons"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '48px',
              marginTop: '28px',
            }}
          >
            {/* 1. New Meeting Button (Signature Zoom Orange) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleNewMeeting}
                disabled={isCreatingInstant}
                title="Start an instant meeting"
                className="action-btn-circle"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: '#FA541C',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: isCreatingInstant ? 'wait' : 'pointer',
                  boxShadow: '0 6px 18px rgba(250, 84, 28, 0.35)',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(250, 84, 28, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(250, 84, 28, 0.35)';
                }}
              >
                {isCreatingInstant ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : (
                  <Video size={28} fill="#FFFFFF" />
                )}
              </button>
              <button
                type="button"
                onClick={handleNewMeeting}
                className="action-btn-label"
                style={{
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1F2937',
                  cursor: 'pointer',
                }}
              >
                <span>New Meeting</span>
                <ChevronDown size={14} color="#6B7280" />
              </button>
            </div>

            {/* 2. Join Meeting Button (Signature Zoom Blue) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsJoinOpen(true)}
                title="Join a meeting via ID or Link"
                className="action-btn-circle"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: '#0E71EB',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(14, 113, 235, 0.35)',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(14, 113, 235, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(14, 113, 235, 0.35)';
                }}
              >
                <Plus size={32} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setIsJoinOpen(true)}
                className="action-btn-label"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1F2937',
                  cursor: 'pointer',
                }}
              >
                Join Meeting
              </button>
            </div>

            {/* 3. Schedule Meeting Button (Signature Zoom Blue) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                title="Schedule a future meeting"
                className="action-btn-circle"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: '#0E71EB',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(14, 113, 235, 0.35)',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(14, 113, 235, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(14, 113, 235, 0.35)';
                }}
              >
                <Calendar size={28} />
              </button>
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                className="action-btn-label"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1F2937',
                  cursor: 'pointer',
                }}
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>

        {/* 2. Primary Sections Grid (Upcoming Meetings & Recent Meetings as specified in PDF) */}
        <div
          className="dashboard-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '28px',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Upcoming Meetings Section (PDF Core Feature) */}
          <div>
            <UpcomingList
              refreshTrigger={refreshTrigger}
              onShowToast={(msg) => setToastMessage(msg)}
              onOpenSchedule={() => setIsScheduleOpen(true)}
            />
          </div>

          {/* Right Column: Personal Room (PMI) & Recent Meetings Section (PDF Core Feature) */}
          <div>
            {/* Personal Meeting Room (PMI) Card */}
            <div
              className="pmi-card"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--zoom-radius-lg)',
                border: '1px solid #E5E7EB',
                padding: '22px 24px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#0E71EB" />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937' }}>
                    Personal Meeting Room (PMI)
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'var(--zoom-blue-light)',
                    color: 'var(--zoom-blue)',
                  }}
                >
                  Host Account
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    Personal ID
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', letterSpacing: '0.5px', marginTop: '2px' }}>
                    849 203 1192
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleCopyPersonalId}
                    title="Copy Personal ID"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--zoom-radius-pill)',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <Copy size={12} />
                    <span>Copy ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPersonalLink}
                    title="Copy Personal Link"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--zoom-radius-pill)',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    <ExternalLink size={12} />
                    <span>Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartPersonalRoom}
                    title="Start Personal Room"
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--zoom-radius-pill)',
                      backgroundColor: '#0E71EB',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(14, 113, 235, 0.25)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0b5ed7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0E71EB')}
                  >
                    <Video size={13} fill="#FFFFFF" />
                    <span>Start</span>
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.4 }}>
                Your personal meeting room is always reserved for your instant calls and dedicated 1-on-1s.
              </div>
            </div>

            {/* Recent Meetings Section (PDF Core Feature) */}
            <RecentList onShowToast={(msg) => setToastMessage(msg)} />
          </div>
        </div>
      </main>

      {/* Join Meeting Modal */}
      <JoinModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      {/* Schedule Meeting Modal */}
      <ScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onScheduleSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        onShowToast={(msg) => setToastMessage(msg)}
      />

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
