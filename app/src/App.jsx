import { useState, useCallback, useEffect } from 'react'
import './App.css'
import { useTimer, STATUS_IDLE, STATUS_RUNNING, PHASE_WORK, PHASE_REST } from './hooks/useTimer'
import { useWakeLock } from './hooks/useWakeLock'
import { useAudioCues } from './hooks/useAudioCues'
import { Timer } from './components/Timer'
import { StatusPill } from './components/StatusPill'
import { ProgressSteps } from './components/ProgressSteps'
import { Controls } from './components/Controls'
import { SpotifyBar } from './components/SpotifyBar'
import { SettingsModal } from './components/SettingsModal'

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [beepVolume, setBeepVolume] = useState(() => {
    try { return JSON.parse(localStorage.getItem('interval_settings'))?.beepVolume ?? 80; } catch { return 80; }
  })
  const { playCountdown, playHalfway, playPhaseChange, playComplete, playPreview, vibrate, getCtx } = useAudioCues(beepVolume)
  const wakeLock = useWakeLock()

  const onPhaseChange = useCallback((phase) => {
    playPhaseChange()
    vibrate([200, 100, 200])
  }, [playPhaseChange, vibrate])

  const onTick = useCallback((timeLeft, settings, phase) => {
    if (timeLeft <= (settings?.countdownSeconds || 5) && timeLeft > 0) {
      playCountdown()
    }
    if (settings?.halfwayBeep !== false && phase?.type === 'work' && phase.duration > 1) {
      const half = Math.floor(phase.duration / 2)
      if (timeLeft === half) {
        playHalfway()
        vibrate([100, 50, 100])
      }
    }
  }, [playCountdown, playHalfway, vibrate])

  const onComplete = useCallback(() => {
    playComplete()
    vibrate([300, 100, 300, 100, 300])
    wakeLock.release()
    setShowComplete(true)
  }, [playComplete, vibrate, wakeLock])

  const timer = useTimer({ onPhaseChange, onTick, onComplete })

  const handleStart = useCallback(() => {
    getCtx()
    timer.start()
    wakeLock.request()
  }, [timer, wakeLock, getCtx])

  const handleStop = useCallback(() => {
    timer.stop()
    wakeLock.release()
  }, [timer, wakeLock])

  const handleTogglePause = useCallback(() => {
    timer.togglePause()
  }, [timer])

  const handleSkipPhase = useCallback(() => {
    timer.skipPhase()
  }, [timer])

  const handleSaveSettings = useCallback((newSettings) => {
    timer.updateSettings(newSettings)
    if (newSettings.beepVolume !== undefined) setBeepVolume(newSettings.beepVolume)
  }, [timer])

  const isTimerRunning = timer.status === STATUS_RUNNING
  const isRestPhase = timer.currentPhase?.type === PHASE_REST

  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
    }
    if (import.meta.env.DEV && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs =>
        regs.forEach(r => r.unregister())
      )
    }
  }, [])

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-header__title">Intervals</h1>
        <button
          className="icon-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Innstillinger"
        >
          <svg viewBox="0 0 24 24">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="8" cy="6" r="2" fill="var(--color-bg)" />
            <circle cx="16" cy="12" r="2" fill="var(--color-bg)" />
            <circle cx="10" cy="18" r="2" fill="var(--color-bg)" />
          </svg>
        </button>
      </header>

      <div className="app-content">
        <StatusPill
          phase={timer.currentPhase}
          currentRound={timer.currentRound}
          totalRounds={timer.settings.rounds}
        />

        <Timer
          timeLeft={timer.status === STATUS_IDLE ? timer.settings.work : timer.timeLeft}
          phaseDuration={timer.status === STATUS_IDLE ? timer.settings.work : timer.phaseDuration}
          totalRemaining={timer.status !== STATUS_IDLE ? timer.totalRemaining : 0}
          showTotal={timer.status !== STATUS_IDLE}
          phaseType={timer.status !== STATUS_IDLE ? timer.currentPhase?.type : null}
        />

        <ProgressSteps
          phases={timer.phases}
          phaseIndex={timer.phaseIndex}
        />

        <Controls
          status={timer.status}
          onStart={handleStart}
          onTogglePause={handleTogglePause}
          onStop={handleStop}
          onSkipPhase={handleSkipPhase}
        />
      </div>

      <div className="app-footer">
        <SpotifyBar timerRunning={isTimerRunning} isRestPhase={isRestPhase} />
      </div>

      <SettingsModal
        visible={settingsOpen}
        settings={timer.settings}
        onSave={handleSaveSettings}
        onClose={() => setSettingsOpen(false)}
        onPreviewVolume={playPreview}
      />

      {showComplete && (
        <div className="complete-overlay" onClick={() => setShowComplete(false)}>
          <div className="complete-overlay__card">
            <div className="complete-overlay__icon">✓</div>
            <div className="complete-overlay__title">Trening fullført!</div>
            <div className="complete-overlay__stats">
              <span>{timer.settings.rounds} runder</span>
              <span>·</span>
              <span>{Math.floor(timer.settings.work / 60)}:{(timer.settings.work % 60).toString().padStart(2, '0')} arbeid</span>
            </div>
            <div className="complete-overlay__hint">Trykk for å lukke</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
