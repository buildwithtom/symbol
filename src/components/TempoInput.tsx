import { useRef, useState } from "react";
import { clampBpm } from "../utils/tempo";
export function TempoInput({
  bpm,
  onChange,
}: {
  bpm: number;
  onChange: (bpm: number) => void;
}) {
  const cancelled = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (!cancelled.current && draft?.trim()) onChange(clampBpm(Number(draft)));
    setDraft(null);
  };
  return (
    <input
      className="bpm-input"
      aria-label="Beats per minute"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft ?? bpm}
      onFocus={(event) => {
        cancelled.current = false;
        setDraft(String(bpm));
        event.currentTarget.select();
      }}
      onChange={(event) =>
        setDraft(event.target.value.replace(/\D/g, "").slice(0, 3))
      }
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelled.current = true;
          setDraft(null);
          event.currentTarget.blur();
        }
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const next = clampBpm(
            (Number(draft) || bpm) +
              (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 5 : 1),
          );
          setDraft(String(next));
          onChange(next);
        }
      }}
    />
  );
}
