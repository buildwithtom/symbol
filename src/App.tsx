import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
  CircleHelp,
  Hand,
  Keyboard,
  Minus,
  Pause,
  Play,
  Plus,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { BeatDial } from "./components/BeatDial";
import { TempoInput } from "./components/TempoInput";
import { useMetronome } from "./hooks/useMetronome";
import { loadPreferences, savePreferences } from "./utils/preferences";
import {
  clampBpm,
  signatures,
  tapTempo,
  tempoName,
  type Signature,
} from "./utils/tempo";
const progress = (value: number, min = 0, max = 1) =>
  ({
    "--progress": `${((value - min) / (max - min)) * 100}%`,
  }) as CSSProperties;
export default function App() {
  const [preferences, setPreferences] = useState(loadPreferences);
  const [help, setHelp] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const taps = useRef<number[]>([]);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helpClose = useRef<HTMLButtonElement>(null);
  const helpTrigger = useRef<HTMLButtonElement>(null);
  const { bpm, signature, volume, muted } = preferences;
  const { playing, beat, message, toggle } = useMetronome(preferences);
  const setBpm = useCallback(
    (value: number) => setPreferences((p) => ({ ...p, bpm: clampBpm(value) })),
    [],
  );
  const tap = useCallback(() => {
    const result = tapTempo(taps.current, performance.now());
    taps.current = result.history;
    if (result.bpm !== null) setBpm(result.bpm);
    setTapCount(result.history.length);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);
  }, [setBpm]);
  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );
  useEffect(() => savePreferences(preferences), [preferences]);
  useEffect(() => {
    if (help) helpClose.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && help) {
        setHelp(false);
        helpTrigger.current?.focus();
        return;
      }
      if (
        help ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          'input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]',
        )
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        void toggle();
      } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        setBpm(
          bpm + (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 5 : 1),
        );
      } else if (event.key.toLowerCase() === "t") tap();
      else if (event.key.toLowerCase() === "m")
        setPreferences((p) => ({ ...p, muted: !p.muted }));
      else if (event.key === "?") setHelp(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bpm, help, setBpm, tap, toggle]);
  return (
    <div className="app-shell min-h-screen">
      <header className="site-header flex items-center justify-between">
        <a className="brand" href="./" aria-label="Symbol home">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="M2 28 12 3h6L8 28Zm13 0L23 8l5 12-3 8Z"
              fill="currentColor"
            />
          </svg>
          <span>
            symbol<span className="brand-period">.</span>
          </span>
        </a>
        <div className="header-right">
          <span className="header-caption">
            A LITTLE RHYTHM. A LOT OF POSSIBILITY.
          </span>
          <button
            className="icon-button"
            ref={helpTrigger}
            aria-label="Keyboard shortcuts and help"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={19} />
          </button>
        </div>
      </header>
      <main>
        <div className="intro">
          <div className="eyebrow">
            <span /> YOUR DAILY PRACTICE, IN TIME
          </div>
          <h1>Find your rhythm.</h1>
          <p>Less distraction. More music.</p>
        </div>
        <section className="metronome" aria-label="Metronome">
          <div className="tempo-stage">
            <BeatDial signature={signature} beat={beat} playing={playing} />
            <div className="tempo-display">
              <TempoInput bpm={bpm} onChange={setBpm} />
              <div className="bpm-label">BEATS PER MINUTE</div>
              <span className="tempo-name">{tempoName(bpm)}</span>
            </div>
          </div>
          <div className="tempo-controls">
            <button
              className="adjust-button"
              aria-label="Decrease tempo by 1 BPM"
              disabled={bpm <= 40}
              onClick={() => setBpm(bpm - 1)}
            >
              <Minus size={19} />
            </button>
            <div className="tempo-range">
              <input
                type="range"
                aria-label="Tempo"
                aria-valuetext={`${bpm} beats per minute`}
                min="40"
                max="240"
                value={bpm}
                style={progress(bpm, 40, 240)}
                onChange={(e) => setBpm(Number(e.target.value))}
              />
              <div className="range-labels">
                <span>40</span>
                <span>240</span>
              </div>
            </div>
            <button
              className="adjust-button"
              aria-label="Increase tempo by 1 BPM"
              disabled={bpm >= 240}
              onClick={() => setBpm(bpm + 1)}
            >
              <Plus size={19} />
            </button>
          </div>
          <div className="play-row">
            <button
              className={`play-button ${playing ? "playing" : ""}`}
              onClick={() => void toggle()}
              aria-label={playing ? "Stop metronome" : "Start metronome"}
            >
              {playing ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
              <span>{playing ? "Stop" : "Start"}</span>
              <kbd>space</kbd>
            </button>
            <button
              className={`tap-button ${tapCount ? "tapped" : ""}`}
              onClick={tap}
            >
              <Hand size={19} />
              <span>
                {tapCount ? `Tap ${tapCount} · keep going` : "Tap tempo"}
              </span>
            </button>
          </div>
          <div className="playback-message" role="status">
            {message}
          </div>
          <div className="settings-panel">
            <div className="signature-setting">
              <div className="setting-label">
                <AudioLines size={15} />
                <span>Time signature</span>
              </div>
              <div
                className="signature-options"
                role="group"
                aria-label="Time signature"
              >
                {signatures.map((s) => (
                  <button
                    key={s}
                    aria-pressed={signature === s}
                    className={signature === s ? "selected" : ""}
                    onClick={() =>
                      setPreferences((p) => ({
                        ...p,
                        signature: s as Signature,
                      }))
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="sound-setting">
              <div className="sound-top">
                <span className="setting-label">Sound</span>
                <span className="volume-value">
                  {muted ? "Muted" : `${Math.round(volume * 100)}%`}
                </span>
              </div>
              <div className="volume-controls">
                <button
                  className="mute-button"
                  aria-label={muted ? "Unmute" : "Mute"}
                  aria-pressed={muted}
                  onClick={() =>
                    setPreferences((p) => ({ ...p, muted: !p.muted }))
                  }
                >
                  {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                </button>
                <input
                  type="range"
                  aria-label="Volume"
                  aria-valuetext={`${Math.round(volume * 100)} percent`}
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  style={progress(volume)}
                  onChange={(e) =>
                    setPreferences((p) => ({
                      ...p,
                      volume: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <p className="accent-note">
            <span className="tiny-dot" />
            {signature === "6/8"
              ? "6 eighth-note pulses · accents on 1 & 4 · BPM = pulse rate"
              : "A little emphasis on the first beat. A steady pulse for the rest."}
          </p>
        </section>
        <div className="practice-note">
          <span className="note-line" />
          <p>Small steps. Steady progress.</p>
          <span className="note-line" />
        </div>
      </main>
      <footer>
        <span>Made for the moments between the notes.</span>
        <button onClick={() => setHelp(true)}>
          <Keyboard size={15} />
          <span>Keyboard shortcuts</span>
          <kbd>?</kbd>
        </button>
      </footer>
      {help && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setHelp(false);
            helpTrigger.current?.focus();
          }}
        >
          <section
            className="help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                helpClose.current?.focus();
              }
            }}
          >
            <div className="help-heading">
              <h2 id="help-title">Keep your hands in rhythm.</h2>
              <button
                ref={helpClose}
                className="icon-button"
                aria-label="Close help"
                onClick={() => {
                  setHelp(false);
                  helpTrigger.current?.focus();
                }}
              >
                <X size={20} />
              </button>
            </div>
            <p>Shortcuts work when you’re away from the controls.</p>
            <dl>
              <div>
                <dt>Start / stop</dt>
                <dd>
                  <kbd>space</kbd>
                </dd>
              </div>
              <div>
                <dt>Tempo ±1 BPM</dt>
                <dd>
                  <kbd>
                    <ArrowUp size={13} />
                  </kbd>{" "}
                  <kbd>
                    <ArrowDown size={13} />
                  </kbd>
                </dd>
              </div>
              <div>
                <dt>Tempo ±5 BPM</dt>
                <dd>
                  <kbd>shift + ↑ / ↓</kbd>
                </dd>
              </div>
              <div>
                <dt>Tap tempo</dt>
                <dd>
                  <kbd>T</kbd>
                </dd>
              </div>
              <div>
                <dt>Mute / unmute</dt>
                <dd>
                  <kbd>M</kbd>
                </dd>
              </div>
              <div>
                <dt>Show help / close</dt>
                <dd>
                  <kbd>?</kbd> / <kbd>esc</kbd>
                </dd>
              </div>
            </dl>
            <p className="help-note">
              In 6/8, each click is an eighth-note pulse, with accents on 1 and
              4. BPM always counts audible pulses. Playback pauses when you
              leave this tab.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
