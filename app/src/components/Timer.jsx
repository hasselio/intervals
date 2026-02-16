import { useMemo } from 'react';
import './Timer.css';

const CIRCUMFERENCE = 2 * Math.PI * 126;

export function Timer({ timeLeft, phaseDuration, totalRemaining = 0, showTotal = false, phaseType = null }) {
  const progress = phaseDuration > 0 ? timeLeft / phaseDuration : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const display = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const totalDisplay = useMemo(() => {
    const mins = Math.floor(phaseDuration / 60);
    const secs = phaseDuration % 60;
    return `av ${mins}:${secs.toString().padStart(2, '0')}`;
  }, [phaseDuration]);

  const totalRemainingDisplay = useMemo(() => {
    const mins = Math.floor(totalRemaining / 60);
    const secs = totalRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [totalRemaining]);

  return (
    <div className="timer">
      <div className="timer__container">
        <svg className="timer__svg" viewBox="0 0 270 270">
          <circle
            className="timer__track"
            cx="135"
            cy="135"
            r="126"
          />
          <circle
            className={`timer__progress ${phaseType ? `timer__progress--${phaseType}` : ''}`}
            cx="135"
            cy="135"
            r="126"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="timer__content">
          <div className="timer__value">{display}</div>
          <div className="timer__sub">{totalDisplay}</div>
        </div>
      </div>
      {showTotal && (
        <div className="timer__total">
          <span className="timer__total-label">Gjenstår</span>
          <span className="timer__total-value">{totalRemainingDisplay}</span>
        </div>
      )}
    </div>
  );
}
