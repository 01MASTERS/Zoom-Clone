'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ShieldCheck,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { formatMeetingId } from '@/lib/api';

interface PreJoinPreviewProps {
  meetingId: string;
  meetingTitle: string;
  initialName?: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isDummyVideo?: boolean;
  isLoadingMedia?: boolean;
  mediaError?: string | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onJoin: (displayName: string) => void;
  onCancel: () => void;
}

export default function PreJoinPreview({
  meetingId,
  meetingTitle,
  initialName = 'Alex Rivera',
  stream,
  audioEnabled,
  videoEnabled,
  isDummyVideo = false,
  isLoadingMedia = false,
  mediaError = null,
  onToggleAudio,
  onToggleVideo,
  onJoin,
  onCancel,
}: PreJoinPreviewProps) {
  const [name, setName] = useState(initialName);
  const [rememberName, setRememberName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('zoom_remember_name');
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return true;
  });
  const [audioLevel, setAudioLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Attach stream to preview video element reliably via callback ref and effect
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
      node.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && stream && videoEnabled) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, videoEnabled]);

  // Audio level meter using Web Audio API
  useEffect(() => {
    if (!stream || !audioEnabled) {
      setAudioLevel(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale to 0 - 100
          const scaled = Math.min(100, Math.round((avg / 128) * 100));
          setAudioLevel(scaled);
          animId = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      }
    } catch {
      // AudioContext failure gracefully ignored
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) source.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [stream, audioEnabled]);

  const initials = name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'AR';

  const handleJoinClick = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (typeof window !== 'undefined') {
      try {
        if (rememberName) {
          localStorage.setItem('zoom_display_name', trimmed);
          localStorage.setItem('zoom_remember_name', 'true');
          window.dispatchEvent(new Event('zoom_name_updated'));
        } else {
          localStorage.removeItem('zoom_display_name');
          localStorage.setItem('zoom_remember_name', 'false');
          window.dispatchEvent(new Event('zoom_name_updated'));
        }
      } catch {}
    }

    onJoin(trimmed);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1A1A1A',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        className="preview-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onCancel}
            title="Back to Dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          >
            <ArrowLeft size={16} />
          </button>

          {/* Zoom Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                backgroundColor: 'var(--zoom-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
                color: '#FFFFFF',
              }}
            >
              Z
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px' }}>
              Zoom
            </span>
          </div>
        </div>

        {/* Meeting Info in Header */}
        <div
          className="preview-header-extra"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)' }}
        >
          <ShieldCheck size={16} color="var(--zoom-green)" />
          <span>Enhanced 256-bit Encrypted</span>
        </div>
      </header>

      {/* Main Container */}
      <main
        className="preview-main"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <div
          className="preview-main-card"
          style={{
            maxWidth: '640px',
            width: '100%',
            backgroundColor: '#23272B',
            borderRadius: '16px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Meeting Title Banner */}
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
            }}
          >
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#FFFFFF', marginBottom: '4px' }}>
              {meetingTitle}
            </h1>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Meeting ID: <strong style={{ color: '#FFFFFF' }}>{formatMeetingId(meetingId)}</strong>
            </div>
          </div>

          <div className="preview-card-body" style={{ padding: '24px' }}>
            {mediaError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(224, 32, 32, 0.15)',
                  border: '1px solid rgba(224, 32, 32, 0.3)',
                  color: '#F87171',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>Camera or microphone unavailable. You will join in audio/avatar mode.</span>
              </div>
            )}

            {/* 16:9 Mirror Video Preview Box */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                backgroundColor: '#121212',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              {videoEnabled && stream ? (
                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)', // Mirror effect
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '88px',
                      height: '88px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0E71EB, #6366F1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      boxShadow: '0 8px 24px rgba(14, 113, 235, 0.35)',
                    }}
                  >
                    {initials}
                  </div>
                  <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Video is off
                  </span>
                </div>
              )}

              {/* Live Mic Meter Bar on bottom-left of video */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                {audioEnabled ? (
                  <Mic size={13} color="var(--zoom-green)" />
                ) : (
                  <MicOff size={13} color="var(--zoom-red)" />
                )}
                {/* 5-bar volume level equalizer */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '12px' }}>
                  {[15, 35, 55, 75, 90].map((threshold, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '3px',
                        height: `${6 + idx * 2}px`,
                        backgroundColor:
                          audioEnabled && audioLevel > threshold
                            ? 'var(--zoom-green)'
                            : 'rgba(255, 255, 255, 0.25)',
                        borderRadius: '1px',
                        transition: 'background-color 0.08s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Name pill badge on bottom-right of video */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px',
                  padding: '4px 10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                }}
              >
                {name || 'Alex Rivera'} (You)
              </div>
            </div>

            {/* Quick Mic and Video Toggle Buttons */}
            <div
              className="preview-controls"
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <button
                type="button"
                onClick={() => onToggleAudio()}
                className="preview-tool-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: 'var(--zoom-radius-pill)',
                  backgroundColor: audioEnabled ? 'rgba(255, 255, 255, 0.12)' : 'rgba(224, 32, 32, 0.2)',
                  color: audioEnabled ? '#FFFFFF' : 'var(--zoom-red)',
                  border: audioEnabled ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(224, 32, 32, 0.4)',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                {audioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                <span>{audioEnabled ? 'Mute' : 'Unmute'}</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleVideo()}
                className="preview-tool-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: 'var(--zoom-radius-pill)',
                  backgroundColor: videoEnabled ? 'rgba(255, 255, 255, 0.12)' : 'rgba(224, 32, 32, 0.2)',
                  color: videoEnabled ? '#FFFFFF' : 'var(--zoom-red)',
                  border: videoEnabled ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(224, 32, 32, 0.4)',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                {videoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                <span>{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
              </button>
            </div>

            {/* Display Name Input Form & Join Button */}
            <form onSubmit={handleJoinClick} autoComplete="off" data-lpignore="true">
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="prejoin-name"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '8px',
                  }}
                >
                  Your Display Name
                </label>
                <input
                  id="prejoin-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#1A1A1A',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--zoom-blue)';
                    e.target.style.boxShadow = '0 0 0 2px rgba(14, 113, 235, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer', marginBottom: '20px' }}>
                <input
                  type="checkbox"
                  checked={rememberName}
                  onChange={(e) => setRememberName(e.target.checked)}
                  style={{ accentColor: 'var(--zoom-blue)', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                Remember my name for future meetings
              </label>

              <div className="preview-join-actions" style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!name.trim()}
                  style={{
                    flex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: 'var(--zoom-radius-pill)',
                    backgroundColor: 'var(--zoom-blue)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(14, 113, 235, 0.4)',
                    opacity: !name.trim() ? 0.6 : 1,
                    cursor: !name.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (name.trim()) e.currentTarget.style.backgroundColor = 'var(--zoom-blue-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (name.trim()) e.currentTarget.style.backgroundColor = 'var(--zoom-blue)';
                  }}
                >
                  <Video size={16} fill="#FFFFFF" />
                  <span>Join Meeting</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
