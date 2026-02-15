import { PHASE_WARMUP, PHASE_WORK, PHASE_REST, PHASE_COOLDOWN } from '../hooks/useTimer';
import './StatusPill.css';

const PHASE_CONFIG = {
  [PHASE_WARMUP]:  { label: 'Oppvarming', className: 'status-pill--warmup' },
  [PHASE_WORK]:    { label: 'Arbeid',     className: 'status-pill--work' },
  [PHASE_REST]:    { label: 'Pause',      className: 'status-pill--rest' },
  [PHASE_COOLDOWN]:{ label: 'Nedkjøling', className: 'status-pill--cooldown' },
};

export function StatusPill({ phase, currentRound, totalRounds }) {
  const config = phase ? PHASE_CONFIG[phase.type] : null;

  if (!config) {
    return (
      <div className="status-section">
        <div className="status-pill status-pill--idle">
          <span className="status-pill__dot" />
          Klar
        </div>
      </div>
    );
  }

  return (
    <div className="status-section">
      <div className={`status-pill ${config.className}`}>
        <span className="status-pill__dot" />
        {config.label}
      </div>
      {totalRounds > 0 && (
        <div className="round-info">
          Runde {currentRound || '–'} av {totalRounds}
        </div>
      )}
    </div>
  );
}
