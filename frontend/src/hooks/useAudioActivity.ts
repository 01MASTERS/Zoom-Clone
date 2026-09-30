'use client';

import { useState, useEffect, useRef } from 'react';

interface UseAudioActivityOptions {
  threshold?: number; // 0-100 threshold to consider active speech
  silenceDelayMs?: number; // debounce delay before marking inactive
}

export function useAudioActivity(
  stream: MediaStream | null | undefined,
  isMuted: boolean = false,
  options: UseAudioActivityOptions = {}
) {
  const { threshold = 18, silenceDelayMs = 350 } = options;

  const [volume, setVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!stream || isMuted) {
      setVolume(0);
      setIsSpeaking(false);
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || !audioTrack.enabled) {
      setVolume(0);
      setIsSpeaking(false);
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

        const checkAudio = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const currentVol = Math.min(100, Math.round((avg / 128) * 100));
          setVolume(currentVol);

          if (currentVol >= threshold) {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            setIsSpeaking(true);
          } else {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                setIsSpeaking(false);
                silenceTimerRef.current = null;
              }, silenceDelayMs);
            }
          }

          animId = requestAnimationFrame(checkAudio);
        };

        checkAudio();
      }
    } catch {
      // AudioContext failure gracefully handled
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (source) source.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [stream, isMuted, threshold, silenceDelayMs]);

  return { volume, isSpeaking };
}
