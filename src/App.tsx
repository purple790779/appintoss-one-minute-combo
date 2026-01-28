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
    maxCombo,
    soundEnabled,
    sessionId,
    tutorialSeen,
    startGame,
    restartGame,
    endGame,
    setTimeLeftMs,
    toggleSound,
    setTutorialSeen,
  } = useGameStore();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [comboAnimation, setComboAnimation] = useState(false);

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

  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      e.preventDefault();
      if (gameState === 'PLAYING') {
        setShowExitConfirm(true);
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [gameState]);

  useEffect(() => {
    if (combo > 0) {
      setComboAnimation(true);
      const timer = setTimeout(() => setComboAnimation(false), 400);
      return () => clearTimeout(timer);
    }
  }, [combo]);

  const statusLabel = useMemo(() => {
    if (gameState === 'READY') return '준비';
    if (gameState === 'PLAYING') return '진행중';
    return '종료';
  }, [gameState]);

  const buttonLabel = gameState === 'READY' ? '시작' : '다시 시작';
  
  const handleAction = (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (gameState === 'READY') {
      // 3, 2, 1 카운트다운
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            startGame();
            setTimeout(() => setCountdown(null), 500);
            return null;
          }
          return prev - 1;
        });
      }, 700);
    } else {
      restartGame();
    }
  };
  const handleRestart = (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    restartGame();
  };

  return (
    <div className="app-shell safe-area-y">
      <div className="app-content flex flex-col items-center gap-6 px-4">
        <header className="hud-overlay flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700 shadow-md">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-slate-400">시간</span>
            <span className="text-2xl font-semibold tabular-nums text-slate-900">
              {formatTime(timeLeftMs)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-slate-400">점수</span>
            <span className="text-2xl font-semibold tabular-nums text-slate-900">
              {score}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.35em] transition-all duration-300 ${
                combo > 0 ? 'text-emerald-500' : 'text-slate-300'
              } ${comboAnimation ? 'scale-150' : 'scale-100'}`}
              style={{ 
                display: 'inline-block',
                transformOrigin: 'center',
                textShadow: combo > 0 ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              콤보 x{combo}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-widest text-slate-400">최고</span>
            <span className="text-2xl font-semibold tabular-nums text-slate-900">
              {bestScore}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="hud-interactive rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
            >
              도움말
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className="hud-interactive rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
            >
              사운드: {soundEnabled ? '켜짐' : '꺼짐'}
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
              className="game-container h-[70vh] max-h-[480px] w-[90vw] max-w-[360px] overflow-hidden rounded-2xl bg-slate-50"
            />
          </div>
        </main>
      </div>

      {gameState !== 'PLAYING' ? (
        <div className="start-bar">
          <button
            type="button"
            onClick={handleAction}
            onPointerDown={handleAction}
            onTouchStart={handleAction}
            className="rounded-full bg-emerald-500 px-10 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition active:translate-y-0.5 active:shadow-md"
          >
            {buttonLabel}
          </button>
        </div>
      ) : null}

      {isHelpOpen ? (
        <div className="hud-overlay hud-modal fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">도움말</h2>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="hud-interactive rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                닫기
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p>60초 안에 구슬을 움직여 같은 색 3개를 만들어 제거하세요!</p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
                <p className="font-semibold text-slate-700">조작 방법</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>구슬을 터치하고 상하좌우 인접한 구슬로 드래그하세요.</li>
                  <li>두 구슬이 자리를 바꿉니다.</li>
                  <li>같은 색이 가로 또는 세로로 3개 이상 나열되면 자동으로 제거돼요.</li>
                  <li>제거된 자리는 위에서 새 구슬이 떨어집니다.</li>
                  <li>1.2초 안에 연속 제거하면 콤보 보너스가 붙어요!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showExitConfirm ? (
        <div className="hud-overlay hud-modal fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">게임을 종료할까요?</h2>
            <p className="mt-2 text-sm text-slate-600">
              진행 중인 게임이 있어요. 종료하면 기록이 사라집니다.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                계속하기
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  endGame();
                }}
                className="flex-1 rounded-full bg-slate-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition active:translate-y-0.5 active:shadow-md"
              >
                종료하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {countdown !== null ? (
        <div className="hud-overlay fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/20">
          <div className="text-8xl font-bold text-white drop-shadow-2xl" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {countdown === 0 ? 'GO!' : countdown}
          </div>
        </div>
      ) : null}

      {!tutorialSeen && gameState === 'READY' ? (
        <div className="hud-overlay hud-modal fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">게임 방법</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p className="text-base font-semibold text-emerald-600">구슬을 움직여서 같은 색 3개를 만들어요!</p>
              <div className="space-y-2">
                <p>1️⃣ 구슬을 터치하세요</p>
                <p>2️⃣ 상하좌우 인접한 구슬로 드래그하세요</p>
                <p>3️⃣ 같은 색이 3개 이상 나열되면 제거돼요</p>
                <p>⏱️ 60초 안에 최대한 많이 제거하세요!</p>
              </div>
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setTutorialSeen()}
                className="rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition active:translate-y-0.5 active:shadow-md"
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {gameState === 'ENDED' ? (
        <div className="hud-overlay hud-modal fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-slate-700 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">게임 종료</h2>
              <button
                type="button"
                onClick={handleRestart}
                onPointerDown={handleRestart}
                onTouchStart={handleRestart}
                className="hud-interactive rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                다시 시작
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-slate-500">이번 점수</span>
                <span className="text-lg font-semibold text-slate-900">{score}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-slate-500">최고 점수</span>
                <span className="text-lg font-semibold text-slate-900">{bestScore}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-slate-500">최대 콤보</span>
                <span className="text-lg font-semibold text-slate-900">x{maxCombo}</span>
              </div>
            </div>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={handleRestart}
                onPointerDown={handleRestart}
                onTouchStart={handleRestart}
                className="rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition active:translate-y-0.5 active:shadow-md"
              >
                다시 시작
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
