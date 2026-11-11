import { accentFor, beatsPerBar, type Signature } from "../utils/tempo";
export function BeatDial({
  signature,
  beat,
  playing,
}: {
  signature: Signature;
  beat: number;
  playing: boolean;
}) {
  return (
    <div
      className={`beat-dial ${playing ? "is-playing" : ""}`}
      aria-hidden="true"
    >
      <svg className="dial-ticks" viewBox="0 0 400 400">
        {Array.from({ length: 80 }, (_, i) => (
          <line
            key={i}
            x1="200"
            y1={i % 5 === 0 ? 10 : 13}
            x2="200"
            y2={i % 5 === 0 ? 22 : 18}
            transform={`rotate(${i * 4.5} 200 200)`}
            className={i % 5 === 0 ? "major-tick" : ""}
          />
        ))}
        <circle cx="200" cy="200" r="172" className="dial-orbit" />
      </svg>
      <div className="dial-top">
        <span className={`status-dot ${playing ? "on" : ""}`} />
        {playing ? "IN THE GROOVE" : "READY WHEN YOU ARE"}
      </div>
      <div className="beat-dots">
        {Array.from({ length: beatsPerBar(signature) }, (_, i) => (
          <span
            key={i}
            className={`beat-dot ${accentFor(i, signature)} ${beat === i ? "active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
