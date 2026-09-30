'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Mic,
  MicOff,
  Crown,
  Pin,
  PinOff,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useAudioActivity } from '@/hooks/useAudioActivity';

interface ParticipantTileProps {
  id?: string;
  name: string;
  isLocal?: boolean;
  isHost?: boolean;
  audioMuted?: boolean;
  videoOff?: boolean;
  stream?: MediaStream | null;
  className?: string;
  style?: React.CSSProperties;
  isPinned?: boolean;
  onTogglePin?: () => void;
  showPinButton?: boolean;
  isScreenSharing?: boolean;
}

export default function ParticipantTile({
  id,
  name,
  isLocal = false,
  isHost = false,
  audioMuted = false,
  videoOff = false,
  stream = null,
  className = '',
  style = {},
  isPinned = false,
  onTogglePin,
  showPinButton = true,
  isScreenSharing = false,
}: ParticipantTileProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-detected video resolution and orientation
  const [streamDimensions, setStreamDimensions] = useState<{
    width: number;
    height: number;
    isPortrait: boolean;
    label: string;
  }>({
    width: 0,
    height: 0,
    isPortrait: false,
    label: '',
  });

  // Measure audio activity for active speaker emerald halo
  const { isSpeaking } = useAudioActivity(stream, audioMuted);

  // Callback ref to reliably attach stream to video tag
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
      node.play().catch(() => {});
    }
  }, [stream]);

  // Keep stream synced
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, videoOff]);

  // Update video resolution & orientation
  const handleVideoMetadata = () => {
    if (videoRef.current) {
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight;
      if (w > 0 && h > 0) {
        const isPortrait = h > w;
        let qualityLabel = '';
        if (w >= 1920 || h >= 1920) qualityLabel = '1080p FHD';
        else if (w >= 1280 || h >= 1280) qualityLabel = '720p HD';
        else if (w >= 640 || h >= 640) qualityLabel = '480p';
        else qualityLabel = `${w}x${h}`;

        setStreamDimensions({
          width: w,
          height: h,
          isPortrait,
          label: isPortrait ? `Mobile • ${qualityLabel}` : qualityLabel,
        });
      }
    }
  };

  // Fullscreen support
  const handleToggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const initials = name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'U';

  return (
    <div
      ref={containerRef}
      className={`participant-tile ${className} ${isPinned ? 'participant-pinned' : ''}`}
      onDoubleClick={onTogglePin}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#1E2024',
        borderRadius: isFullscreen ? '0px' : '10px',
        overflow: 'hidden',
        boxShadow: isSpeaking
          ? '0 0 0 3px #10B981, 0 8px 24px rgba(16, 185, 129, 0.35)'
          : isPinned
          ? '0 0 0 2px rgba(14, 113, 235, 0.7), 0 8px 24px rgba(0, 0, 0, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.35)',
        border: isPinned
          ? '1px solid rgba(14, 113, 235, 0.6)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* Video Stream Container with Auto-Aspect Fitting */}
      {stream && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: (videoOff && !isScreenSharing) ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#16181B',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Radial Glow for Portrait/Mobile Streams */}
          {streamDimensions.isPortrait && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(ellipse at center, rgba(14, 113, 235, 0.12) 0%, rgba(22, 24, 27, 0.95) 75%)',
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Primary Video Element: 'contain' ensures zero face or screen cropping */}
          <video
            ref={setVideoRef}
            autoPlay
            playsInline
            muted={isLocal}
            onLoadedMetadata={handleVideoMetadata}
            onResize={handleVideoMetadata}
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: (isLocal && !isScreenSharing) ? 'scaleX(-1)' : 'none',
              backgroundColor: 'transparent',
            }}
          />
        </div>
      )}

      {/* Avatar Fallback shown when video is stopped or camera off */}
      {((videoOff && !isScreenSharing) || !stream) && (
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
              width: isPinned ? '104px' : '76px',
              height: isPinned ? '104px' : '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0E71EB, #6366F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isPinned ? '36px' : '26px',
              fontWeight: 700,
              color: '#FFFFFF',
              boxShadow: '0 6px 20px rgba(14, 113, 235, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            {initials}
          </div>
        </div>
      )}

      {/* Top Left: Badges (Pinned / Screen Sharing / Device Orientation) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 10,
        }}
      >
        {isPinned && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              backgroundColor: 'rgba(14, 113, 235, 0.85)',
              backdropFilter: 'blur(6px)',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#FFFFFF',
            }}
          >
            <Pin size={11} />
            <span>Pinned</span>
          </div>
        )}

        {isScreenSharing && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              backgroundColor: 'rgba(16, 185, 129, 0.9)',
              backdropFilter: 'blur(6px)',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#FFFFFF',
            }}
          >
            <Monitor size={11} />
            <span>Sharing Screen</span>
          </div>
        )}

        {/* Device orientation badge on hover */}
        {isHovered && streamDimensions.label && (!videoOff || isScreenSharing) && stream && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(6px)',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.85)',
              animation: 'zoomFadeIn 0.15s ease',
            }}
          >
            {streamDimensions.isPortrait ? (
              <Smartphone size={11} color="var(--zoom-blue)" />
            ) : (
              <Monitor size={11} color="var(--zoom-blue)" />
            )}
            <span>{streamDimensions.label}</span>
          </div>
        )}
      </div>

      {/* Top Right: Tile Action Icons (Pin / Spotlight & Fullscreen) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 10,
        }}
      >
        {/* Host Badge */}
        {isHost && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#FBBF24',
            }}
          >
            <Crown size={12} />
            <span>Host</span>
          </div>
        )}

        {/* Pin to Stage Button */}
        {showPinButton && onTogglePin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            title={isPinned ? 'Unpin from Stage' : 'Pin to Stage (Double-click)'}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: isPinned
                ? 'var(--zoom-blue)'
                : isHovered
                ? 'rgba(0, 0, 0, 0.7)'
                : 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(4px)',
              display: isHovered || isPinned ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              transition: 'all 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          >
            {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
        )}

        {/* Fullscreen Toggle Button */}
        <button
          type="button"
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: isFullscreen
              ? 'var(--zoom-blue)'
              : isHovered
              ? 'rgba(0, 0, 0, 0.7)'
              : 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(4px)',
            display: isHovered || isFullscreen ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            transition: 'all 0.15s ease',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {/* Bottom Left Info Pill Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(6px)',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#FFFFFF',
          maxWidth: '85%',
          zIndex: 10,
        }}
      >
        {audioMuted ? (
          <MicOff size={13} color="var(--zoom-red)" />
        ) : (
          <Mic size={13} color={isSpeaking ? 'var(--zoom-green)' : '#FFFFFF'} />
        )}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name} {isLocal ? '(You)' : ''}
        </span>
      </div>
    </div>
  );
}
