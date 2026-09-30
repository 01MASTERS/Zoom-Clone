'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { extractMeetingId, getMeetingDetails } from '@/lib/api';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinModal({ isOpen, onClose }: JoinModalProps) {
  const router = useRouter();
  const [meetingInput, setMeetingInput] = useState('');
  const [displayName, setDisplayName] = useState('Alex Rivera');
  const [rememberName, setRememberName] = useState(true);
  const [turnOffVideo, setTurnOffVideo] = useState(false);
  const [muteAudio, setMuteAudio] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = Boolean(meetingInput.trim() && displayName.trim());

  // Load remembered display name and preference from localStorage on mount and when modal opens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedName = localStorage.getItem('zoom_display_name');
        const savedRemember = localStorage.getItem('zoom_remember_name');
        if (savedName) {
          setDisplayName(savedName);
        }
        if (savedRemember !== null) {
          setRememberName(savedRemember === 'true');
        }
      } catch {}
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setMeetingInput('');
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = meetingInput.trim();
    if (!trimmedInput) {
      setError('Please enter a Meeting ID or Personal Link Name.');
      return;
    }
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }

    // Persist or remove remembered name based on user choice
    if (typeof window !== 'undefined') {
      try {
        if (rememberName) {
          localStorage.setItem('zoom_display_name', trimmedName);
          localStorage.setItem('zoom_remember_name', 'true');
          window.dispatchEvent(new Event('zoom_name_updated'));
        } else {
          localStorage.removeItem('zoom_display_name');
          localStorage.setItem('zoom_remember_name', 'false');
          window.dispatchEvent(new Event('zoom_name_updated'));
        }
      } catch {}
    }

    const cleanId = extractMeetingId(trimmedInput);
    if (!cleanId) {
      setError('Invalid Meeting ID format.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Validate existence against FastAPI backend
      await getMeetingDetails(cleanId);
      
      const queryParams = new URLSearchParams({
        name: trimmedName,
        audio: (!muteAudio).toString(),
        video: (!turnOffVideo).toString(),
      });

      router.push(`/meeting/${cleanId}?${queryParams.toString()}`);
      onClose();
    } catch (err: any) {
      if (err.status === 410 || (err.message && err.message.toLowerCase().includes('ended'))) {
        setError('This meeting has ended.');
      } else {
        setError(err.message || 'Meeting ID not found. Please verify the ID and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--zoom-radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'zoomFadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--zoom-border-subtle)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--zoom-text-primary)' }}>
            Join Meeting
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '50%',
              color: 'var(--zoom-text-secondary)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} autoComplete="off" data-lpignore="true" style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--zoom-radius-md)',
                backgroundColor: 'var(--zoom-red-light)',
                border: '1px solid rgba(224, 32, 32, 0.25)',
                color: 'var(--zoom-red)',
                fontSize: '13px',
                marginBottom: '18px',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>{error}</div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="meeting-id-input"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--zoom-text-primary)',
                marginBottom: '6px',
              }}
            >
              Meeting ID or Personal Link Name
            </label>
            <input
              id="meeting-id-input"
              type="text"
              placeholder="e.g. 849 203 1192 or paste invite link"
              value={meetingInput}
              autoComplete="off"
              data-lpignore="true"
              onChange={(e) => {
                setMeetingInput(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--zoom-radius-md)',
                border: '1px solid var(--zoom-border)',
                backgroundColor: '#FFFFFF',
                color: 'var(--zoom-text-primary)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--zoom-blue)';
                e.target.style.boxShadow = '0 0 0 2px var(--zoom-blue-light)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--zoom-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="display-name-input"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--zoom-text-primary)',
                marginBottom: '6px',
              }}
            >
              Your Name
            </label>
            <input
              id="display-name-input"
              type="text"
              placeholder="Enter your name"
              value={displayName}
              autoComplete="off"
              data-lpignore="true"
              onChange={(e) => setDisplayName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--zoom-radius-md)',
                border: '1px solid var(--zoom-border)',
                backgroundColor: '#FFFFFF',
                color: 'var(--zoom-text-primary)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--zoom-blue)';
                e.target.style.boxShadow = '0 0 0 2px var(--zoom-blue-light)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--zoom-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Options Checkboxes */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '24px',
            padding: '12px 14px',
            backgroundColor: 'var(--zoom-input-bg)',
            borderRadius: 'var(--zoom-radius-md)',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--zoom-text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberName}
                onChange={(e) => setRememberName(e.target.checked)}
                style={{ accentColor: 'var(--zoom-blue)', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              Remember my name for future meetings
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--zoom-text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={muteAudio}
                onChange={(e) => setMuteAudio(e.target.checked)}
                style={{ accentColor: 'var(--zoom-blue)', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              Do not connect to audio
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--zoom-text-primary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={turnOffVideo}
                onChange={(e) => setTurnOffVideo(e.target.checked)}
                style={{ accentColor: 'var(--zoom-blue)', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              Turn off my video
            </label>
          </div>

          {/* Actions Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--zoom-radius-pill)',
                border: '1px solid var(--zoom-border)',
                backgroundColor: '#FFFFFF',
                color: 'var(--zoom-text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--zoom-input-bg)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 24px',
                borderRadius: 'var(--zoom-radius-pill)',
                backgroundColor: !isFormValid || loading ? '#9CA3AF' : 'var(--zoom-blue)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                cursor: !isFormValid || loading ? 'not-allowed' : 'pointer',
                boxShadow: isFormValid && !loading ? '0 2px 6px rgba(14, 113, 235, 0.3)' : 'none',
                opacity: !isFormValid || loading ? 0.75 : 1,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => isFormValid && !loading && (e.currentTarget.style.backgroundColor = 'var(--zoom-blue-hover)')}
              onMouseLeave={(e) => isFormValid && !loading && (e.currentTarget.style.backgroundColor = 'var(--zoom-blue)')}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Join</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
