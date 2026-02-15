import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SettingsModal.css';

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Row({ label, value, step, min, max, formatFn, onChange }) {
  const display = formatFn ? formatFn(value) : value;
  return (
    <div className="s-row">
      <span className="s-row__label">{label}</span>
      <div className="s-row__ctrl">
        <button className="s-row__btn" onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <span className="s-row__value">{display}</span>
        <button className="s-row__btn" onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </div>
    </div>
  );
}

export function SettingsModal({ visible, settings, onSave, onClose }) {
  const [warmup, setWarmup] = useState(settings.warmup);
  const [work, setWork] = useState(settings.work);
  const [rest, setRest] = useState(settings.rest);
  const [rounds, setRounds] = useState(settings.rounds);
  const [cooldown, setCooldown] = useState(settings.cooldown);
  const [countdownSeconds, setCountdownSeconds] = useState(settings.countdownSeconds || 5);

  useEffect(() => {
    setWarmup(settings.warmup);
    setWork(settings.work);
    setRest(settings.rest);
    setRounds(settings.rounds);
    setCooldown(settings.cooldown);
    setCountdownSeconds(settings.countdownSeconds || 5);
  }, [settings]);

  const handleSave = () => {
    onSave({ warmup, work, rest, rounds, cooldown, countdownSeconds });
    onClose();
  };

  const totalTime = warmup + (work + rest) * rounds - rest + cooldown;

  return createPortal(
    <>
      <div
        className={`modal-backdrop ${visible ? 'modal-backdrop--visible' : ''}`}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      />
      <div className={`modal ${visible ? 'modal--visible' : ''}`}>
        <div className="modal__handle" />
        <div className="modal__header">
          <div className="modal__title">Innstillinger</div>
          <div className="modal__total">Total: {fmt(totalTime)}</div>
        </div>

        <div className="s-section">
          <div className="s-section__title">Trening</div>
          <div className="s-section__card">
            <Row label="Arbeid" value={work} step={5} min={5} max={300} formatFn={fmt} onChange={setWork} />
            <Row label="Pause" value={rest} step={5} min={5} max={300} formatFn={fmt} onChange={setRest} />
            <Row label="Runder" value={rounds} step={1} min={1} max={50} onChange={setRounds} />
          </div>
        </div>

        <div className="s-section">
          <div className="s-section__title">Oppvarming & nedkjøling</div>
          <div className="s-section__card">
            <Row label="Oppvarming" value={warmup} step={30} min={0} max={600} formatFn={fmt} onChange={setWarmup} />
            <Row label="Nedkjøling" value={cooldown} step={30} min={0} max={600} formatFn={fmt} onChange={setCooldown} />
          </div>
        </div>

        <div className="s-section">
          <div className="s-section__title">Varsling</div>
          <div className="s-section__card">
            <Row label="Nedtelling" value={countdownSeconds} step={1} min={0} max={15} formatFn={v => `${v}s`} onChange={setCountdownSeconds} />
          </div>
          <div className="s-section__hint">Pip-lyd de siste sekundene før fasebytte</div>
        </div>

        <button className="modal__save-btn" onClick={handleSave}>
          Lagre
        </button>
      </div>
    </>,
    document.body
  );
}
