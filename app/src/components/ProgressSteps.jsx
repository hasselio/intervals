import { PHASE_WORK, PHASE_REST } from '../hooks/useTimer';
import './ProgressSteps.css';

export function ProgressSteps({ phases, phaseIndex }) {
  const workRestPhases = phases
    .map((p, i) => ({ ...p, originalIndex: i }))
    .filter(p => p.type === PHASE_WORK || p.type === PHASE_REST);

  if (workRestPhases.length === 0) return null;

  return (
    <div className="progress-steps">
      {workRestPhases.map((phase, i) => {
        let className = `progress-steps__step progress-steps__step--${phase.type}`;
        if (phase.originalIndex < phaseIndex) {
          className += ' progress-steps__step--done';
        } else if (phase.originalIndex === phaseIndex) {
          className += ' progress-steps__step--active';
        }
        return <div key={i} className={className} />;
      })}
    </div>
  );
}
