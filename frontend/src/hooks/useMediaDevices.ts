'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMediaDevicesOptions {
  initialAudio?: boolean;
  initialVideo?: boolean;
  onVideoTrackReplaced?: (track: MediaStreamTrack) => void;
}

/**
 * Progressively attempts to acquire camera stream with mobile-resilient fallbacks.
 * Prevents OverconstrainedError on portrait mobile camera sensors.
 */
async function acquireCameraStream(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    throw new Error('getUserMedia is not supported or origin is insecure (HTTP)');
  }

  // Tier 1: Modern portrait/landscape friendly ideal constraints
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (err1) {
    console.warn('Tier 1 camera constraints failed, attempting Tier 2 (facingMode ideal)...', err1);
  }

  // Tier 2: FacingMode only (avoids strict resolution mismatches on portrait mobile cameras)
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'user' },
      },
    });
  } catch (err2) {
    console.warn('Tier 2 camera constraints failed, attempting Tier 3 (video: true)...', err2);
  }

  // Tier 3: Universal constraint fallback
  return await navigator.mediaDevices.getUserMedia({
    video: true,
  });
}

/**
 * Progressively attempts to acquire audio stream with mobile-resilient fallbacks.
 */
async function acquireAudioStream(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    throw new Error('getUserMedia is not supported or origin is insecure (HTTP)');
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err1) {
    console.warn('Enhanced audio constraints failed, falling back to basic audio: true...', err1);
  }

  return await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
}

export function useMediaDevices(options: UseMediaDevicesOptions = {}) {
  const { initialAudio = true, initialVideo = true, onVideoTrackReplaced } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(initialAudio);
  const [videoEnabled, setVideoEnabled] = useState(initialVideo);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDummyVideo, setIsDummyVideo] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const onVideoTrackReplacedRef = useRef(onVideoTrackReplaced);
  onVideoTrackReplacedRef.current = onVideoTrackReplaced;
  const isTogglingRef = useRef(false);

  // Helper to create a dummy video track from a canvas (active simulation or stopped state)
  const createDummyVideoTrack = useCallback((enabled: boolean = false, label?: string): MediaStreamTrack => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    const render = (time: number = 0) => {
      if (!ctx) return;
      if (enabled) {
        // Active simulated video canvas (gradient with pulsing camera indicator)
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1E293B');
        gradient.addColorStop(1, '#0F172A');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center circle badge with pulsing glow
        const pulse = Math.sin(time / 300) * 4;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 - 16;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 46 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(14, 113, 235, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#0E71EB';
        ctx.fill();

        // White CAM icon badge text in center
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CAM', centerX, centerY);

        // Label below
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(label || 'Video Active', centerX, centerY + 62);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('(Camera Simulation / Mobile Mode)', centerX, centerY + 84);
      } else {
        // Video Stopped dark Zoom surface
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6B7280';
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label || 'Video Stopped', canvas.width / 2, canvas.height / 2);
      }
    };

    render(0);

    // If enabled, animate slightly so captureStream continuously produces active video frames
    let animInterval: any = null;
    if (enabled) {
      let t = 0;
      animInterval = setInterval(() => {
        t += 100;
        render(t);
      }, 100);
    }

    let track: MediaStreamTrack | null = null;
    try {
      const stream = canvas.captureStream ? canvas.captureStream(enabled ? 15 : 5) : (canvas as any).mozCaptureStream(enabled ? 15 : 5);
      track = stream.getVideoTracks()[0] || null;
    } catch (err) {
      console.warn('Canvas captureStream error:', err);
    }

    if (!track) {
      // Minimal fallback dummy track
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 2;
      fallbackCanvas.height = 2;
      const s = fallbackCanvas.captureStream ? fallbackCanvas.captureStream(1) : (fallbackCanvas as any).mozCaptureStream?.(1);
      track = s?.getVideoTracks()[0] || null;
    }

    const validTrack = (track || {}) as MediaStreamTrack;
    validTrack.enabled = enabled;

    // Clean up animation on track stop
    const origStop = typeof validTrack.stop === 'function' ? validTrack.stop.bind(validTrack) : () => {};
    validTrack.stop = () => {
      if (animInterval) {
        clearInterval(animInterval);
        animInterval = null;
      }
      try {
        origStop();
      } catch {}
    };

    return validTrack;
  }, []);

  // Helper to create a silent audio track when microphone is unavailable
  const createSilentAudioTrack = useCallback((): MediaStreamTrack | null => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        oscillator.connect(dst);
        oscillator.start();
        return dst.stream.getAudioTracks()[0] || null;
      }
    } catch {}
    return null;
  }, []);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch {
          // Ignore errors during stop
        }
      });
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  // Initialize media devices
  useEffect(() => {
    let isCancelled = false;

    const initMedia = async () => {
      setIsLoading(true);
      setError(null);

      const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);

      // Insecure context or missing mediaDevices (e.g. mobile accessing over local HTTP)
      if (!hasMediaDevices) {
        if (typeof window !== 'undefined' && !window.isSecureContext) {
          setError('Camera/Mic requires a secure connection (HTTPS) on mobile devices.');
        }

        try {
          const dummyVideoTrack = createDummyVideoTrack(initialVideo, initialVideo ? 'Mobile Video (Simulated)' : 'Video Stopped');
          const dummyAudioTrack = createSilentAudioTrack();
          if (dummyAudioTrack) dummyAudioTrack.enabled = initialAudio;

          const composite = new MediaStream([
            ...(dummyAudioTrack ? [dummyAudioTrack] : []),
            dummyVideoTrack,
          ]);
          streamRef.current = composite;
          setStream(composite);
          setIsDummyVideo(true);
          setVideoEnabled(initialVideo);
          setAudioEnabled(initialAudio);
        } catch {}
        setIsLoading(false);
        return;
      }

      // If initial video is disabled by user preference, do NOT turn on hardware camera
      if (!initialVideo) {
        try {
          const audioStream = await acquireAudioStream();
          if (isCancelled) {
            audioStream.getTracks().forEach((t) => t.stop());
            return;
          }

          const audioTrack = audioStream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = initialAudio;
          }

          const dummyVideoTrack = createDummyVideoTrack(false, 'Video Stopped');
          const compositeStream = new MediaStream([
            ...(audioTrack ? [audioTrack] : []),
            dummyVideoTrack,
          ]);

          streamRef.current = compositeStream;
          setStream(compositeStream);
          setIsDummyVideo(true);
          setVideoEnabled(false);
          setAudioEnabled(initialAudio);
        } catch (err: any) {
          // Complete fallback to synthetic tracks
          if (!isCancelled) {
            const dummyVideoTrack = createDummyVideoTrack(false, 'Video Stopped');
            const dummyAudioTrack = createSilentAudioTrack();
            if (dummyAudioTrack) dummyAudioTrack.enabled = initialAudio;

            const composite = new MediaStream([
              ...(dummyAudioTrack ? [dummyAudioTrack] : []),
              dummyVideoTrack,
            ]);
            streamRef.current = composite;
            setStream(composite);
            setIsDummyVideo(true);
            setVideoEnabled(false);
            setAudioEnabled(initialAudio);
          }
        } finally {
          if (!isCancelled) {
            setIsLoading(false);
          }
        }
        return;
      }

      // Normal path: initialVideo === true
      try {
        let mediaStream: MediaStream | null = null;
        let acquiredCamera = false;

        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'user' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          acquiredCamera = true;
        } catch (fullErr) {
          console.warn('Combined camera/audio acquisition failed, attempting resilient multi-tier fallback...', fullErr);
          try {
            const videoOnly = await acquireCameraStream();
            let audioOnly: MediaStream | null = null;
            try {
              audioOnly = await acquireAudioStream();
            } catch {
              // Audio fallback
            }

            const tracks: MediaStreamTrack[] = [...videoOnly.getVideoTracks()];
            if (audioOnly) {
              tracks.push(...audioOnly.getAudioTracks());
            } else {
              const silent = createSilentAudioTrack();
              if (silent) tracks.push(silent);
            }

            mediaStream = new MediaStream(tracks);
            acquiredCamera = true;
          } catch (camErr) {
            console.warn('Physical camera unavailable, falling back to simulated mobile video:', camErr);
          }
        }

        if (isCancelled) {
          if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (mediaStream && acquiredCamera) {
          const aTrack = mediaStream.getAudioTracks()[0];
          if (aTrack) aTrack.enabled = initialAudio;
          const vTrack = mediaStream.getVideoTracks()[0];
          if (vTrack) vTrack.enabled = true;

          streamRef.current = mediaStream;
          setStream(mediaStream);
          setIsDummyVideo(false);
          setVideoEnabled(true);
          setAudioEnabled(initialAudio);
        } else {
          // Camera hardware failed (e.g. blocked, in use, or unsupported constraints), acquire audio and attach simulated video
          let audioTrack: MediaStreamTrack | null = null;
          try {
            const aStream = await acquireAudioStream();
            if (isCancelled) {
              aStream.getTracks().forEach((t) => t.stop());
              return;
            }
            audioTrack = aStream.getAudioTracks()[0] || null;
          } catch {
            audioTrack = createSilentAudioTrack();
          }

          if (audioTrack) audioTrack.enabled = initialAudio;

          const dummyVideoTrack = createDummyVideoTrack(true, 'Mobile Video (Simulated)');

          const composite = new MediaStream([
            ...(audioTrack ? [audioTrack] : []),
            dummyVideoTrack,
          ]);

          streamRef.current = composite;
          setStream(composite);
          setIsDummyVideo(true);
          setVideoEnabled(true);
          setAudioEnabled(initialAudio);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const dummyVideoTrack = createDummyVideoTrack(true, 'Mobile Video (Simulated)');
          const dummyAudioTrack = createSilentAudioTrack();
          if (dummyAudioTrack) dummyAudioTrack.enabled = initialAudio;

          const composite = new MediaStream([
            ...(dummyAudioTrack ? [dummyAudioTrack] : []),
            dummyVideoTrack,
          ]);
          streamRef.current = composite;
          setStream(composite);
          setIsDummyVideo(true);
          setVideoEnabled(true);
          setAudioEnabled(initialAudio);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initMedia();

    const handleBeforeUnload = () => {
      stopAllTracks();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isCancelled = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopAllTracks();
    };
  }, [createDummyVideoTrack, createSilentAudioTrack, initialAudio, initialVideo, stopAllTracks]);

  const toggleAudio = useCallback((forceState?: boolean | unknown) => {
    setAudioEnabled((prev) => {
      const nextState = typeof forceState === 'boolean' ? forceState : !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = nextState;
        });
      }
      return nextState;
    });
  }, []);

  // Truly turns off the physical webcam hardware sensor (turning off the physical LED)
  // and re-acquires a fresh camera track when turned back on, with resilient mobile fallbacks.
  const toggleVideo = useCallback(async (forceState?: boolean | unknown) => {
    if (isTogglingRef.current) return videoEnabled;
    isTogglingRef.current = true;

    try {
      const nextState = typeof forceState === 'boolean' ? forceState : !videoEnabled;

      if (!nextState) {
        // 1. TURNING OFF VIDEO: Stop the physical camera hardware track immediately so the camera LED turns off
        if (streamRef.current) {
          streamRef.current.getVideoTracks().forEach((track) => {
            try {
              track.stop(); // Releases camera hardware to OS & turns off physical webcam LED
              track.enabled = false;
            } catch {}
          });
        }

        // 2. Substitute with a lightweight canvas dummy track to keep WebRTC senders alive
        const dummyTrack = createDummyVideoTrack(false, 'Video Stopped');

        const currentAudio = streamRef.current ? streamRef.current.getAudioTracks() : [];
        const newStream = new MediaStream([
          ...currentAudio,
          dummyTrack,
        ]);

        streamRef.current = newStream;
        setStream(newStream);
        setIsDummyVideo(true);
        setVideoEnabled(false);

        if (onVideoTrackReplacedRef.current) {
          onVideoTrackReplacedRef.current(dummyTrack);
        }
        return false;
      } else {
        // 2. TURNING ON VIDEO: Acquire fresh camera track with multi-tier mobile fallbacks
        let newCameraTrack: MediaStreamTrack | null = null;
        let acquiredHardware = false;

        if (typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices)) {
          try {
            const freshMedia = await acquireCameraStream();
            const track = freshMedia.getVideoTracks()[0];
            if (track) {
              newCameraTrack = track;
              newCameraTrack.enabled = true;
              acquiredHardware = true;
            }
          } catch (err: any) {
            console.warn('Could not re-acquire physical hardware camera, falling back to simulated video:', err);
          }
        }

        // If hardware camera is unavailable, permission denied, or insecure context:
        // fallback smoothly to synthetic active mobile video
        if (!newCameraTrack) {
          newCameraTrack = createDummyVideoTrack(true, 'Mobile Video (Simulated)');
          acquiredHardware = false;
        }

        // Stop and discard any previous video tracks in stream
        if (streamRef.current) {
          streamRef.current.getVideoTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
        }

        const currentAudio = streamRef.current ? streamRef.current.getAudioTracks() : [];
        const newStream = new MediaStream([
          ...currentAudio,
          newCameraTrack,
        ]);

        streamRef.current = newStream;
        setStream(newStream);
        setIsDummyVideo(!acquiredHardware);
        setVideoEnabled(true);

        if (onVideoTrackReplacedRef.current) {
          onVideoTrackReplacedRef.current(newCameraTrack);
        }
        return true;
      }
    } finally {
      isTogglingRef.current = false;
    }
  }, [videoEnabled, createDummyVideoTrack]);

  return {
    stream,
    audioEnabled,
    videoEnabled,
    isLoading,
    error,
    isDummyVideo,
    toggleAudio,
    toggleVideo,
    stopAllTracks,
  };
}
