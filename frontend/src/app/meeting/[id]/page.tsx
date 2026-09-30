'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMeetingDetails, Meeting } from '@/lib/api';
import { useMediaDevices } from '@/hooks/useMediaDevices';
import PreJoinPreview from '@/components/meeting/PreJoinPreview';
import MeetingRoom from '@/components/meeting/MeetingRoom';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface MeetingPageProps {
  params: Promise<{ id: string }>;
}

export default function MeetingPage({ params }: MeetingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Resolve Next.js 15 async route params
  const { id: rawId } = use(params);
  const cleanId = rawId ? rawId.replace(/[\s-]/g, '') : '';

  // Extract query parameters
  const nameFromQuery = searchParams?.get('name');
  const isHostQuery = searchParams?.get('isHost') === 'true';
  const initialAudioParam = searchParams?.get('audio') !== 'false';
  const initialVideoParam = searchParams?.get('video') !== 'false';

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [stage, setStage] = useState<'preview' | 'in-meeting'>('preview');
  const [displayName, setDisplayName] = useState(() => {
    if (nameFromQuery) return nameFromQuery;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('zoom_display_name');
        if (saved) return saved;
      } catch {}
    }
    return 'Alex Rivera';
  });

  useEffect(() => {
    if (nameFromQuery) {
      setDisplayName(nameFromQuery);
    } else if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('zoom_display_name');
        if (saved) setDisplayName(saved);
      } catch {}
    }
  }, [nameFromQuery]);

  // Initialize media devices hook
  const {
    stream,
    audioEnabled,
    videoEnabled,
    isLoading: isLoadingMedia,
    error: mediaError,
    isDummyVideo,
    toggleAudio,
    toggleVideo,
    stopAllTracks,
  } = useMediaDevices({
    initialAudio: initialAudioParam,
    initialVideo: initialVideoParam,
  });

  // Validate meeting existence with backend
  useEffect(() => {
    let isCancelled = false;

    const checkMeeting = async () => {
      try {
        setIsValidating(true);
        setNotFound(false);
        setErrorMessage(null);

        const data = await getMeetingDetails(cleanId);
        if (!isCancelled) {
          setMeeting(data);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setNotFound(true);
          setErrorMessage(err.message || 'Meeting not found');
        }
      } finally {
        if (!isCancelled) {
          setIsValidating(false);
        }
      }
    };

    if (cleanId) {
      checkMeeting();
    }
  }, [cleanId]);

  const handleJoin = (confirmedName: string) => {
    setDisplayName(confirmedName);
    setStage('in-meeting');
  };

  const handleLeave = (reason?: string) => {
    stopAllTracks();
    if (typeof window !== 'undefined' && reason) {
      try {
        sessionStorage.setItem('zoom_notification', reason);
      } catch {}
    }
    router.push(reason ? `/?notification=${encodeURIComponent(reason)}` : '/');
  };

  // 1. Loading State Screen
  if (isValidating) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <Loader2 size={36} className="animate-spin" color="var(--zoom-blue)" />
        <span style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 500 }}>
          Connecting to meeting room...
        </span>
      </div>
    );
  }

  // 2. Meeting Not Found State
  if (notFound || !meeting) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1A1A1A',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#23272B',
            borderRadius: '16px',
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(224, 32, 32, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--zoom-red)',
            }}
          >
            <AlertCircle size={32} />
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Meeting Not Found
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, marginBottom: '24px' }}>
            The meeting ID <strong style={{ color: '#FFFFFF' }}>{cleanId}</strong> does not exist or has already concluded.
          </p>

          <button
            onClick={() => router.push('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: 'var(--zoom-radius-pill)',
              backgroundColor: 'var(--zoom-blue)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(14, 113, 235, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-blue-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--zoom-blue)')}
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Stage: Pre-Join Preview
  if (stage === 'preview') {
    return (
      <PreJoinPreview
        meetingId={meeting.meeting_id}
        meetingTitle={meeting.title}
        initialName={displayName}
        stream={stream}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isDummyVideo={isDummyVideo}
        isLoadingMedia={isLoadingMedia}
        mediaError={mediaError}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onJoin={handleJoin}
        onCancel={handleLeave}
      />
    );
  }

  // 4. Stage: In-Meeting Live Room
  return (
    <MeetingRoom
      meetingId={meeting.meeting_id}
      meetingTitle={meeting.title}
      userName={displayName}
      isHost={isHostQuery}
      stream={stream}
      audioEnabled={audioEnabled}
      videoEnabled={videoEnabled}
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onLeaveMeeting={handleLeave}
    />
  );
}
