import { useRef, useCallback, useEffect } from 'react';

function createBeep(audioCtx, frequency, duration, volume = 0.3) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

export function useAudioCues() {
  const audioCtxRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playCountdown = useCallback(() => {
    const ctx = getCtx();
    createBeep(ctx, 880, 0.2, 0.8);
  }, [getCtx]);

  const playPhaseChange = useCallback(() => {
    const ctx = getCtx();
    createBeep(ctx, 1200, 0.35, 1.0);
    setTimeout(() => createBeep(ctx, 1500, 0.35, 1.0), 200);
  }, [getCtx]);

  const playHalfway = useCallback(() => {
    const ctx = getCtx();
    createBeep(ctx, 660, 0.2, 0.8);
    setTimeout(() => createBeep(ctx, 660, 0.2, 0.8), 200);
  }, [getCtx]);

  const playComplete = useCallback(() => {
    const ctx = getCtx();
    createBeep(ctx, 800, 0.25, 1.0);
    setTimeout(() => createBeep(ctx, 1000, 0.25, 1.0), 250);
    setTimeout(() => createBeep(ctx, 1200, 0.5, 1.0), 500);
  }, [getCtx]);

  const vibrate = useCallback((pattern = [100, 50, 100]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return { playCountdown, playHalfway, playPhaseChange, playComplete, vibrate, getCtx };
}
