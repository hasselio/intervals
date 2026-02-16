import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './SettingsModal.css';

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function Row({ label, value, step, min, max, formatFn, onChange, disabled }) {
  const display = formatFn ? formatFn(value) : value;
  return (
    <div className={`s-row ${disabled ? 's-row--disabled' : ''}`}>
      <span className="s-row__label">{label}</span>
      <div className="s-row__ctrl">
        <button className="s-row__btn" disabled={disabled} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <span className="s-row__value">{display}</span>
        <button className="s-row__btn" disabled={disabled} onClick={() => onChange(Math.min(max, value + step))}>+</button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="s-row">
      <span className="s-row__label">{label}</span>
      <button
        className={`s-toggle ${checked ? 's-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className="s-toggle__thumb" />
      </button>
    </div>
  );
}

export function SettingsModal({ visible, settings, onSave, onClose, onPreviewVolume }) {
  const [warmup, setWarmup] = useState(settings.warmup || 180);
  const [work, setWork] = useState(settings.work);
  const [rest, setRest] = useState(settings.rest);
  const [rounds, setRounds] = useState(settings.rounds);
  const [cooldown, setCooldown] = useState(settings.cooldown || 180);
  const [countdownSeconds, setCountdownSeconds] = useState(settings.countdownSeconds || 5);
  const [warmupEnabled, setWarmupEnabled] = useState(settings.warmupEnabled || false);
  const [cooldownEnabled, setCooldownEnabled] = useState(settings.cooldownEnabled || false);
  const [beepVolume, setBeepVolume] = useState(settings.beepVolume ?? 80);
  const [halfwayBeep, setHalfwayBeep] = useState(settings.halfwayBeep !== false);
  const previewTimeout = useRef(null);

  useEffect(() => {
    setWarmup(settings.warmup || 180);
    setWork(settings.work);
    setRest(settings.rest);
    setRounds(settings.rounds);
    setCooldown(settings.cooldown || 180);
    setCountdownSeconds(settings.countdownSeconds || 5);
    setWarmupEnabled(settings.warmupEnabled || false);
    setCooldownEnabled(settings.cooldownEnabled || false);
    setBeepVolume(settings.beepVolume ?? 80);
    setHalfwayBeep(settings.halfwayBeep !== false);
  }, [settings]);

  const handleVolumeChange = useCallback((val) => {
    const v = Number(val);
    setBeepVolume(v);
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(() => {
      onPreviewVolume?.(v / 100);
    }, 150);
  }, [onPreviewVolume]);

  const handleSave = () => {
    onSave({
      warmup: warmupEnabled ? warmup : 0,
      work,
      rest,
      rounds,
      cooldown: cooldownEnabled ? cooldown : 0,
      countdownSeconds,
      warmupEnabled,
      cooldownEnabled,
      beepVolume,
      halfwayBeep,
    });
    onClose();
  };

  const effectiveWarmup = warmupEnabled ? warmup : 0;
  const effectiveCooldown = cooldownEnabled ? cooldown : 0;
  const totalTime = effectiveWarmup + (work + rest) * rounds - rest + effectiveCooldown;

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
            <Toggle label="Oppvarming" checked={warmupEnabled} onChange={setWarmupEnabled} />
            {warmupEnabled && (
              <Row label="Varighet" value={warmup} step={30} min={30} max={600} formatFn={fmt} onChange={setWarmup} />
            )}
            <Toggle label="Nedkjøling" checked={cooldownEnabled} onChange={setCooldownEnabled} />
            {cooldownEnabled && (
              <Row label="Varighet" value={cooldown} step={30} min={30} max={600} formatFn={fmt} onChange={setCooldown} />
            )}
          </div>
        </div>

        <div className="s-section">
          <div className="s-section__title">Varsling</div>
          <div className="s-section__card">
            <Row label="Nedtelling" value={countdownSeconds} step={1} min={0} max={15} formatFn={v => `${v}s`} onChange={setCountdownSeconds} />
            <Toggle label="Halvveis-pip" checked={halfwayBeep} onChange={setHalfwayBeep} />
            <div className="s-row">
              <span className="s-row__label">Volum</span>
              <div className="s-slider">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={beepVolume}
                  onChange={(e) => handleVolumeChange(e.target.value)}
                  className="s-slider__input"
                />
                <span className="s-slider__value">{beepVolume}%</span>
              </div>
            </div>
          </div>
          <div className="s-section__hint">Pip-lyd de siste sekundene før fasebytte + halvveis-signal</div>
        </div>

        <button className="modal__save-btn" onClick={handleSave}>
          Lagre
        </button>
      </div>
    </>,
    document.body
  );
}
