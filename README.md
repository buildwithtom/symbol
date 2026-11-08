# Symbol

A minimal, local-first metronome for daily practice. Built with Vite, React, strict TypeScript, Tailwind CSS, and Lucide. No accounts, backend, API keys, analytics, remote fonts, or runtime services.

## Run locally

Use Node.js 20.19+ (or a supported newer LTS) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).

```sh
npm run lint
npm test
npm run build
npm run preview
```

The production output is `dist/`; preview normally serves http://127.0.0.1:4173. Dependencies are locked in `package-lock.json`.

## Practice controls

- Tempo: 40–240 BPM; starts at 100. Drag the slider, click ±, or edit the large number. Enter/blur commits the number, Escape cancels. Arrow keys in the number change tempo by 1; Shift changes it by 5.
- Start/Stop: plays immediately after a user gesture. Every new session begins on beat one.
- Meter: 2/4, 3/4, 4/4, and 6/8, with an audible and visible first-beat accent.
- **6/8 uses six eighth-note pulses per measure.** Pulse 1 has the main accent, pulse 4 a secondary accent. BPM is the audible pulse rate, not dotted-quarter tempo: 60 BPM = one pulse/second and 120 BPM = two pulses/second in every meter.
- Tap tempo: averages the last five valid intervals. History resets after two seconds; accidental intervals shorter than 200ms are ignored. The resulting tempo is clamped to 40–240.
- Volume and mute apply smoothly, including to already scheduled sounds. Muting preserves the visual pulse.
- Tempo, meter, volume, and mute are validated and stored locally. Corrupt, unavailable, or full storage falls back safely; playback is never restored automatically.

| Shortcut      | Action        |
| ------------- | ------------- |
| Space         | Start / stop  |
| ↑ / ↓         | Tempo ±1 BPM  |
| Shift + ↑ / ↓ | Tempo ±5 BPM  |
| T             | Tap tempo     |
| M             | Mute / unmute |
| ?             | Show help     |
| Escape        | Close help    |

Global shortcuts leave inputs, buttons, sliders, links, and editable text alone, and ignore key repeats and command/control/alt combinations. Focused controls retain native keyboard behavior. The help dialog traps focus and restores it on close. The UI respects reduced motion and supports 320px-wide screens.

## Audio architecture

`src/audio/MetronomeEngine.ts` owns one lazily created AudioContext per mounted engine. Creation and `resume()` happen only inside Start, following a gesture. The React hook owns lifecycle and interruption feedback; the UI owns preferences.

The scheduler wakes every 25ms and schedules up to 100ms ahead using `AudioContext.currentTime`. Oscillators start and stop at explicit audio deadlines. Sine clicks use a 2ms attack and a short exponential decay to avoid abrupt envelopes. Main, secondary, and regular accents use separate pitches. A master gain provides smooth mute and volume changes.

`Timeline.ts` is a pure audio-clock timeline. Beat deadlines advance from the previous deadline, avoiding timer drift. Beat metadata is queued separately; requestAnimationFrame consumes it only when the audio clock reaches the beat, never when a future sound is merely scheduled. Device audio-output latency can still introduce a small perceived visual offset.

Live tempo edits cancel future scheduled voices and anchor the next pulse to the last audible beat at the new interval, with a 15ms minimum lead. Meter edits begin a new bar on that next pulse. Already sounding clicks are allowed to finish. Stop cancels timers/frames and queued voices, and fades sounding voices over 8ms. A generation token invalidates pending Start operations, preventing rapid Start/Stop races. Unmount closes the context; StrictMode effect replay creates no context until a gesture.

Playback deliberately pauses on tab hiding, audio suspension/interruption, or a scheduler stall of more than 100ms. This avoids catch-up bursts and stale measures. Resume with Start. Uninterrupted mobile/background playback is **not** guaranteed. This scheduling pattern follows [MDN’s Web Audio sequencing guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques).

## Tests

Vitest covers tempo limits, pulse intervals, meter accents, averaged tap tempo, stale/accidental taps, preference validation, long-run timeline drift, live tempo/meter resynchronization, and the engine with a fake AudioContext and timers. Engine tests check lookahead, visual deadlines, future-voice cancellation, context reuse, cleanup, in-flight Start cancellation, interruption handling, and tempo/meter edits made while stopped. All 15 automated tests pass, along with lint and the production build.

An additional headless Chrome acceptance run passed 13 checks against the production build: real Web Audio scheduling at 60/120 BPM, live tempo changes, eight rapid Start/Stop cycles with one context, 6/8 pitch accents, numeric edit cancellation, Space shortcut isolation, all four persisted preferences, help-dialog focus, real tap inputs, responsive layouts at 320/768/1440px, unsupported-audio feedback, and no browser console warnings/errors. Desktop and mobile screenshots were visually inspected. The browser harness was a temporary local QA tool, not an application dependency. These checks do not replace listening on physical devices.

Manual release checks: listen at 60 and 120 BPM, change tempo/meter while playing, rapidly start/stop, mute/unmute, inspect 6/8 accents, background/return on mobile Safari and Android Chrome, and verify headphones/speaker output. Bluetooth latency is device-dependent.

## Deploy to Cloudflare Pages

- Framework preset: **Vite**
- Build command: **npm run build**
- Build output directory: **dist**
- Root directory: repository root
- Node version: 20.19+ or a supported newer LTS
- Environment variables: none

Upload `dist/` to any static host, or connect the repository yourself. No deployment or remote repository is created by this project.

## Troubleshooting

If Start reports an audio error, retry with a direct click/tap and check browser site permissions, device volume/output, and mute settings. Web Audio requires a modern browser; an unsupported browser displays an initialization error. Backgrounding or switching apps intentionally pauses playback. If preferences do not persist, check whether private browsing or storage restrictions are enabled; the app remains usable. Long main-thread stalls and system audio interruptions require restarting playback.
# symbol
