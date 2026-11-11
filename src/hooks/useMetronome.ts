import { useCallback, useEffect, useRef, useState } from "react";
import { MetronomeEngine } from "../audio/MetronomeEngine";
import type { Preferences } from "../utils/preferences";
export function useMetronome(preferences: Preferences) {
  const engine = useRef<MetronomeEngine | null>(null);
  const current = useRef(preferences);
  const mounted = useRef(false);
  const attempt = useRef(0);
  const playingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [message, setMessage] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    current.current = preferences;
    engine.current?.update(preferences);
  }, [preferences]);
  const stop = useCallback(() => {
    ++attempt.current;
    playingRef.current = false;
    engine.current?.stop();
    setPlaying(false);
    setBeat(-1);
  }, []);
  const toggle = useCallback(async () => {
    if (playingRef.current) {
      stop();
      return;
    }
    const request = ++attempt.current;
    playingRef.current = true;
    setPlaying(true);
    setMessage("");
    if (!engine.current)
      engine.current = new MetronomeEngine(
        current.current,
        (index) => {
          if (mounted.current) setBeat(index);
        },
        () => {
          if (mounted.current) {
            stop();
            setMessage(
              "Playback paused. Press Start to find your rhythm again.",
            );
          }
        },
      );
    try {
      await engine.current.start();
    } catch (error) {
      if (mounted.current && request === attempt.current) {
        stop();
        setMessage(
          error instanceof Error
            ? error.message
            : "Audio could not start. Please try again.",
        );
      }
    }
  }, [stop]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && playingRef.current) {
        stop();
        setMessage(
          "Playback paused while away. Press Start when you’re ready.",
        );
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stop]);
  return { playing, beat, message, toggle };
}
