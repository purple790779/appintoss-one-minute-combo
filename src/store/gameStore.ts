import { create } from 'zustand';
import { z } from 'zod';

export type GameState = 'READY' | 'PLAYING' | 'ENDED';

const DEFAULT_TIME_MS = 60_000;
const BEST_SCORE_KEY = 'omc_highscore';

const bestScoreSchema = z.coerce.number().int().nonnegative().catch(0);

const loadBestScore = () => {
  if (typeof localStorage === 'undefined') {
    return 0;
  }
  const value = localStorage.getItem(BEST_SCORE_KEY);
  return value ? bestScoreSchema.parse(value) : 0;
};

const saveBestScore = (score: number) => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(BEST_SCORE_KEY, score.toString());
};

interface GameStore {
  gameState: GameState;
  timeLeftMs: number;
  score: number;
  bestScore: number;
  combo: number;
  soundEnabled: boolean;
  sessionId: number;
  startGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  setTimeLeftMs: (ms: number) => void;
  addScore: (amount?: number) => void;
  setCombo: (combo: number) => void;
  toggleSound: () => void;
  setBestScore: (score: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'READY',
  timeLeftMs: DEFAULT_TIME_MS,
  score: 0,
  bestScore: loadBestScore(),
  combo: 0,
  soundEnabled: true,
  sessionId: 0,
  startGame: () =>
    set({
      gameState: 'PLAYING',
      timeLeftMs: DEFAULT_TIME_MS,
      score: 0,
      combo: 0,
      sessionId: get().sessionId + 1,
    }),
  restartGame: () =>
    set({
      gameState: 'PLAYING',
      timeLeftMs: DEFAULT_TIME_MS,
      score: 0,
      combo: 0,
      sessionId: get().sessionId + 1,
    }),
  endGame: () => {
    const { score, bestScore } = get();
    if (score > bestScore) {
      saveBestScore(score);
      set({ bestScore: score, gameState: 'ENDED' });
      return;
    }
    set({ gameState: 'ENDED' });
  },
  setTimeLeftMs: (ms) => set({ timeLeftMs: Math.max(0, ms) }),
  addScore: (amount = 1) => {
    const nextScore = get().score + amount;
    set({ score: nextScore });
    const { bestScore } = get();
    if (nextScore > bestScore) {
      saveBestScore(nextScore);
      set({ bestScore: nextScore });
    }
  },
  setCombo: (combo) => set({ combo: Math.max(0, combo) }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  setBestScore: (score) => {
    saveBestScore(score);
    set({ bestScore: score });
  },
}));

export const DEFAULT_TIME = DEFAULT_TIME_MS;
