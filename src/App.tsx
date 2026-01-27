import { useEffect, useMemo, useRef, useState } from 'react';
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
    combo,
    soundEnabled,
    sessionId,
    startGame,
    restartGame,
    endGame,
    setTimeLeftMs,
    toggleSound,
  } = useGameStore();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
    if (gameState === 'READY') return 'Ready';
    if (gameState === 'PLAYING') return 'Go!';
    return 'Time Up';
  }, [gameState]);

  const buttonLabel = gameState === 'PLAYING' ? 'Restart' : 'Start';
  const handleAction = gameState === 'PLAYING' ? restartGame : startGame;

  return (
    <div className="safe-area-y flex min-h-full flex-col items-center gap-6 px-4">
      <header className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-md">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Time
          </span>
          <span className="text-2xl font-semibold tabular-nums text-slate-900">
            {formatTime(timeLeftMs)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Score
          </span>
          <span className="text-2xl font-semibold tabular-nums text-slate-900">
            {score}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${
              combo > 0 ? 'text-emerald-500' : 'text-slate-300'
            }`}
          >
            콤보 x{combo}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-slate-400">
            Best
          </span>
          <span className="text-2xl font-semibold tabular-nums text-slate-900">
            {bestScore}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
          >
            Help
          </button>
          <button
            type="button"
            onClick={toggleSound}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
          >
            Sound: {soundEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </header>

      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-4">
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 shadow-sm">
          {statusLabel}
        </div>
        <div className="flex w-full max-w-lg items-center justify-center rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
          <div
            ref={phaserContainerRef}
            className="h-[70vh] max-h-[480px] w-[90vw] max-w-[360px] overflow-hidden rounded-2xl bg-slate-50"
          />
        </div>
      </main>

      <footer className="flex w-full max-w-3xl items-center justify-center">
        <button
          type="button"
          onClick={handleAction}
          className="rounded-full bg-emerald-500 px-10 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition active:translate-y-0.5 active:shadow-md"
        >
          {buttonLabel}
        </button>
      </footer>

      {isHelpOpen ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Help</h2>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p>60초 안에 같은 색 타일을 이어서 콤보를 쌓으세요.</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
                <p>조작 안내</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>같은 색 타일을 상하좌우로 드래그해 3개 이상 연결하세요.</li>
                  <li>경로는 재방문할 수 없고, 직전 타일 한 칸만 되돌릴 수 있어요.</li>
                  <li>손을 떼면 연결이 확정되며, 3개 미만이면 취소됩니다.</li>
                  <li>1.2초 안에 연속 제거하면 콤보 보너스가 붙습니다.</li>
                  <li>Restart로 빠르게 재시작할 수 있어요.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
