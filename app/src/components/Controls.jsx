import { STATUS_IDLE, STATUS_RUNNING, STATUS_PAUSED } from '../hooks/useTimer';
import './Controls.css';

export function Controls({ status, onStart, onTogglePause, onStop, onSkipPhase }) {
  return (
    <div className="controls">
      {status !== STATUS_IDLE ? (
        <>
          <button
            className="ctrl-btn ctrl-btn--secondary ctrl-btn--danger"
            onClick={onStop}
            aria-label="Stopp"
          >
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>

          <button
            className="ctrl-btn ctrl-btn--primary"
            onClick={onTogglePause}
            aria-label={status === STATUS_RUNNING ? 'Pause' : 'Fortsett'}
          >
            {status === STATUS_RUNNING ? (
              <svg viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            )}
          </button>

          <button
            className="ctrl-btn ctrl-btn--secondary"
            onClick={onSkipPhase}
            aria-label="Neste fase"
          >
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5,4 15,12 5,20" fill="currentColor" stroke="none" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </>
      ) : (
        <button
          className="ctrl-btn ctrl-btn--primary ctrl-btn--start"
          onClick={onStart}
          aria-label="Start"
        >
          <svg viewBox="0 0 24 24">
            <polygon points="6,4 20,12 6,20" />
          </svg>
        </button>
      )}
    </div>
  );
}
