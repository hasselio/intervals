import { useState, useRef, useCallback, useEffect } from 'react';

const PHASE_WARMUP = 'warmup';
const PHASE_WORK = 'work';
const PHASE_REST = 'rest';
const PHASE_COOLDOWN = 'cooldown';
const PHASE_DONE = 'done';

const STATUS_IDLE = 'idle';
const STATUS_RUNNING = 'running';
const STATUS_PAUSED = 'paused';

export { PHASE_WARMUP, PHASE_WORK, PHASE_REST, PHASE_COOLDOWN, PHASE_DONE };
export { STATUS_IDLE, STATUS_RUNNING, STATUS_PAUSED };

function buildPhases(settings) {
  const phases = [];

  if (settings.warmup > 0) {
    phases.push({ type: PHASE_WARMUP, duration: settings.warmup });
  }

  for (let i = 0; i < settings.rounds; i++) {
    phases.push({ type: PHASE_WORK, duration: settings.work, round: i + 1 });
    if (i < settings.rounds - 1) {
      phases.push({ type: PHASE_REST, duration: settings.rest, round: i + 1 });
    }
  }

  if (settings.cooldown > 0) {
    phases.push({ type: PHASE_COOLDOWN, duration: settings.cooldown });
  }

  return phases;
}

export function useTimer({ onPhaseChange, onTick, onComplete } = {}) {
  const [settings, setSettings] = useState({
    warmup: 180,
    work: 30,
    rest: 15,
    rounds: 8,
    cooldown: 180,
    countdownSeconds: 5,
  });

  const [status, setStatus] = useState(STATUS_IDLE);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [phases, setPhases] = useState(() => buildPhases(settings));

  const intervalRef = useRef(null);
  const settingsRef = useRef(settings);
  const onPhaseChangeRef = useRef(onPhaseChange);
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { onPhaseChangeRef.current = onPhaseChange; }, [onPhaseChange]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const currentPhase = phases[phaseIndex] || null;
  const phaseDuration = currentPhase ? currentPhase.duration : 0;

  const currentRound = (() => {
    if (!currentPhase) return 0;
    if (currentPhase.round) return currentPhase.round;
    if (currentPhase.type === PHASE_WARMUP) return 0;
    if (currentPhase.type === PHASE_COOLDOWN) return settings.rounds;
    return 0;
  })();

  const totalWorkPhases = phases.filter(p => p.type === PHASE_WORK).length;
  const completedWorkPhases = phases.slice(0, phaseIndex).filter(p => p.type === PHASE_WORK).length;

  const totalRemaining = timeLeft + phases.slice(phaseIndex + 1).reduce((sum, p) => sum + p.duration, 0);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const advancePhase = useCallback((currentPhaseIndex, allPhases) => {
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex >= allPhases.length) {
      clearTick();
      setStatus(STATUS_IDLE);
      setPhaseIndex(0);
      setTimeLeft(0);
      onCompleteRef.current?.();
      return;
    }
    setPhaseIndex(nextIndex);
    setTimeLeft(allPhases[nextIndex].duration);
    onPhaseChangeRef.current?.(allPhases[nextIndex]);
  }, [clearTick]);

  const startTicking = useCallback((startPhaseIndex, startTimeLeft, allPhases) => {
    clearTick();
    let pi = startPhaseIndex;
    let tl = startTimeLeft;

    intervalRef.current = setInterval(() => {
      tl -= 1;
      if (tl <= 0) {
        const nextIndex = pi + 1;
        if (nextIndex >= allPhases.length) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setStatus(STATUS_IDLE);
          setPhaseIndex(0);
          setTimeLeft(0);
          onCompleteRef.current?.();
          return;
        }
        pi = nextIndex;
        tl = allPhases[pi].duration;
        setPhaseIndex(pi);
        setTimeLeft(tl);
        onPhaseChangeRef.current?.(allPhases[pi]);
      } else {
        setTimeLeft(tl);
        onTickRef.current?.(tl, settingsRef.current);
      }
    }, 1000);
  }, [clearTick]);

  const start = useCallback(() => {
    const newPhases = buildPhases(settings);
    setPhases(newPhases);
    if (newPhases.length === 0) return;
    setPhaseIndex(0);
    setTimeLeft(newPhases[0].duration);
    setStatus(STATUS_RUNNING);
    onPhaseChangeRef.current?.(newPhases[0]);
    startTicking(0, newPhases[0].duration, newPhases);
  }, [settings, startTicking]);

  const pause = useCallback(() => {
    clearTick();
    setStatus(STATUS_PAUSED);
  }, [clearTick]);

  const resume = useCallback(() => {
    setStatus(STATUS_RUNNING);
    startTicking(phaseIndex, timeLeft, phases);
  }, [phaseIndex, timeLeft, phases, startTicking]);

  const stop = useCallback(() => {
    clearTick();
    setStatus(STATUS_IDLE);
    setPhaseIndex(0);
    setTimeLeft(0);
  }, [clearTick]);

  const togglePause = useCallback(() => {
    if (status === STATUS_RUNNING) pause();
    else if (status === STATUS_PAUSED) resume();
  }, [status, pause, resume]);

  useEffect(() => {
    return () => clearTick();
  }, [clearTick]);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
  }, []);

  return {
    settings,
    updateSettings,
    status,
    currentPhase,
    phaseIndex,
    timeLeft,
    phaseDuration,
    currentRound,
    totalWorkPhases,
    completedWorkPhases,
    totalRemaining,
    phases,
    start,
    pause,
    resume,
    stop,
    togglePause,
  };
}
