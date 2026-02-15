import { useRef, useCallback, useEffect } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef(null);

  const request = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  }, []);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { release(); };
  }, [release]);

  return { request, release };
}
