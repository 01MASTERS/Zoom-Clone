'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { extractMeetingCode, getMeetingDetails, formatMeetingId } from '@/lib/api';
import { ArrowLeft, Video, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputVal, setInputVal] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberName, setRememberName] = useState(true);
  const [turnOffVideo, setTurnOffVideo] = useState(false);
  const [muteAudio, setMuteAudio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from URL params or local storage
  useEffect(() => {
    const paramId = searchParams?.get('meetingId');
    if (paramId) {
      setInputVal(formatMeetingId(paramId));
    }

    if (typeof window !== 'undefined') {
      try {
        const savedName = localStorage.getItem('zoom_display_name');
        const savedRemember = localStorage.getItem('zoom_remember_name');
        if (savedName) setDisplayName(savedName);
        if (savedRemember !== null) setRememberName(savedRemember === 'true');
      } catch {}
    }
  }, [searchParams]);

  const isFormValid = Boolean(inputVal.trim() && displayName.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    const code = extractMeetingCode(inputVal);
    if (!code) {
      setError('Please enter a valid 9–11 digit Meeting ID or full invite link.');
      return;
    }

    const trimmedName = displayName.trim();

    // Persist remembered name preference
    if (typeof window !== 'undefined') {
      try {
        if (rememberName) {
          localStorage.setItem('zoom_display_name', trimmedName);
          localStorage.setItem('zoom_remember_name', 'true');
        } else {
          localStorage.removeItem('zoom_display_name');
          localStorage.setItem('zoom_remember_name', 'false');
        }
      } catch {}
    }

    try {
      setLoading(true);
      setError(null);

      // Validate on server before letting user in (Section 3.3 & 9.3)
      await getMeetingDetails(code);

      const queryParams = new URLSearchParams({
        name: trimmedName,
        audio: (!muteAudio).toString(),
        video: (!turnOffVideo).toString(),
      });

      router.push(`/meeting/${code}?${queryParams.toString()}`);
    } catch (err: any) {
      if (err.status === 410 || (err.message && err.message.toLowerCase().includes('ended'))) {
        setError('This meeting has ended.');
      } else if (err.status === 404 || (err.message && err.message.toLowerCase().includes('not found'))) {
        setError('Meeting not found. Please check the Meeting ID or link.');
      } else {
        setError(err.message || 'Unable to join meeting. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Top Bar */}
      <header style={{
        height: '60px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: '#0B5CFF' }}>
          <ArrowLeft size={18} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Back to Dashboard</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: '#0B5CFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <Video size={16} />
          </div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>Zoom</span>
        </div>
      </header>

      {/* Main Join Container */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid #E5E7EB',
          padding: '32px'
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '8px' }}>
            Join Meeting
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', marginBottom: '24px' }}>
            Enter your meeting ID or personal invite link to enter the room
          </p>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#DC2626',
              fontSize: '13px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Meeting ID or Link */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Meeting ID or Personal Link Name
              </label>
              <input
                type="text"
                placeholder="e.g. 812 3456 7890 or full link"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease'
                }}
              />
            </div>

            {/* Display Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Checkboxes */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: '#F9FAFB',
              padding: '12px 14px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4B5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberName}
                  onChange={(e) => setRememberName(e.target.checked)}
                  style={{ accentColor: '#0B5CFF', width: '15px', height: '15px' }}
                />
                Remember my name for future meetings
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4B5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={muteAudio}
                  onChange={(e) => setMuteAudio(e.target.checked)}
                  style={{ accentColor: '#0B5CFF', width: '15px', height: '15px' }}
                />
                Do not connect to audio
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4B5563', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={turnOffVideo}
                  onChange={(e) => setTurnOffVideo(e.target.checked)}
                  style={{ accentColor: '#0B5CFF', width: '15px', height: '15px' }}
                />
                Turn off my video
              </label>
            </div>

            {/* Submit Button (Section 5 & 11: Disabled until ID & Name entered) */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                backgroundColor: !isFormValid || loading ? '#9CA3AF' : '#0B5CFF',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: !isFormValid || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isFormValid && !loading ? '0 2px 8px rgba(11, 92, 255, 0.35)' : 'none',
                transition: 'background-color 0.15s ease'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Validating Meeting...</span>
                </>
              ) : (
                'Join'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#0B5CFF' }} />
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
