'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseScreenShareOptions {
  cameraStream: MediaStream | null;
  replaceVideoTrack: (newTrack: MediaStreamTrack) => Promise<void>;
  onShowToast?: (msg: string) => void;
}

export function useScreenShare({
  cameraStream,
  replaceVideoTrack,
  onShowToast,
}: UseScreenShareOptions) {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      screenStreamRef.current = null;
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    // Revert to original camera track on all peer connections
    if (cameraStream) {
      const cameraTrack = cameraStream.getVideoTracks()[0];
      if (cameraTrack) {
        await replaceVideoTrack(cameraTrack);
      }
    }

    if (onShowToast) {
      onShowToast('Screen sharing stopped.');
    }
  }, [cameraStream, replaceVideoTrack, onShowToast]);

  const startScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      if (onShowToast) {
        onShowToast('Screen sharing is not supported on this browser.');
      }
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      // Hot-swap outgoing track on all WebRTC peer connections
      await replaceVideoTrack(screenTrack);

      if (onShowToast) {
        onShowToast('Screen sharing started.');
      }

      // Handle native browser "Stop sharing" chrome banner
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err: any) {
      // User cancelled picker or permission denied
      if (err.name !== 'NotAllowedError') {
        console.error('Failed to start screen share:', err);
      }
    }
  }, [isScreenSharing, replaceVideoTrack, stopScreenShare, onShowToast]);

  // Teardown screen tracks on unmount
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    isScreenSharing,
    screenStream,
    startScreenShare,
    stopScreenShare,
  };
}
