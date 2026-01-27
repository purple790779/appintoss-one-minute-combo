import { useEffect, useMemo, useRef } from 'react';
import { createGame } from './game/createGame';
import { useGameStore } from './store/gameStore';

const formatTime = (ms: number) => {
  const clamped = Math.max(0, ms);
  const seconds = Math.floor(clamped / 1000);
  const remainder = Math.floor((clamped % 1000) / 10);
  return `${seconds.toString().padStart(2, '0')}.${remainder
    .toString()
    .padStart(2, '0')}`;
};

function App() {
  const {
    gameState,
    timeLeftMs,
    score,
    bestScore,
    soundEnabled,
    sessionId,
    startGame,
    restartGame,
    endGame,
    setTimeLeftMs,
    toggleSound,
  } = useGameStore();

  const phaserContainerRef = useRef<HTMLDivElement | null>(null);
  const phaserGameRef = useRef<ReturnType<typeof createGame> | null>(null);

  useEffect(() => {
    if (!phaserContainerRef.current) {
      return;
    }
    phaserGameRef.current = createGame(phaserContainerRef.current);
    return () => {
      phaserGameRef.current?.destroy(true);
      phaserGameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') {
      return;
    }

    let frameId = 0;
    const startTime = performance.now();
    const startingMs = timeLeftMs;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const remaining = Math.max(0, startingMs - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        endGame();
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [gameState, sessionId, timeLeftMs, endGame, setTimeLeftMs]);

  const statusLabel = useMemo(() => {
    if (gameState === 'MENU') return 'Ready';
    if (gameState === 'PLAYING') return 'Go!';
    return 'Time Up';
  }, [gameState]);

  const buttonLabel = gameState === 'PLAYING' ? 'Restart' : 'Start';
  const handleAction = gameState === 'PLAYING' ? restartGame : startGame;

  return (
    <div className="flex min-h-full flex-col items-center gap-6 px-4 py-6">
      <header className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 shadow-lg">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Time
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {formatTime(timeLeftMs)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Score
          </span>
          <span className="text-lg font-semibold tabular-nums">{score}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Best
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {bestScore}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleSound}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs uppercase tracking-widest text-slate-200 transition hover:border-slate-400"
        >
          Sound: {soundEnabled ? 'On' : 'Off'}
        </button>
      </header>

      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-4">
        <div className="text-sm uppercase tracking-[0.3em] text-emerald-300">
          {statusLabel}
        </div>
        <div className="flex w-full max-w-lg items-center justify-center rounded-3xl border border-slate-700 bg-slate-950/70 p-4 shadow-2xl">
          <div
            ref={phaserContainerRef}
            className="h-[480px] w-[360px] overflow-hidden rounded-2xl"
          />
        </div>
      </main>

      <footer className="flex w-full max-w-3xl items-center justify-center pb-4">
        <button
          type="button"
          onClick={handleAction}
          className="rounded-full bg-emerald-400 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-slate-950 shadow-lg transition hover:bg-emerald-300"
        >
          {buttonLabel}
        </button>
      </footer>
    </div>
  );
}

export default App;
