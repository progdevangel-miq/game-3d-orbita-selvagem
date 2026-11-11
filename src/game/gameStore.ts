import { create } from 'zustand';
import { GAME_CONFIG } from './config';

export type GamePhase = 'title' | 'playing' | 'paused' | 'won';

type GameState = {
  phase: GamePhase;
  collected: number[];
  start: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  collect: (id: number) => void;
};

export const useGameStore = create<GameState>((set) => ({
  phase: 'title',
  collected: [],
  start: () => set({ phase: 'playing', collected: [] }),
  pause: () => set((state) => state.phase === 'playing' ? { phase: 'paused' } : state),
  resume: () => set((state) => state.phase === 'paused' ? { phase: 'playing' } : state),
  restart: () => set({ phase: 'playing', collected: [] }),
  collect: (id) => set((state) => {
    if (state.phase !== 'playing' || state.collected.includes(id)) return state;
    const collected = [...state.collected, id];
    return {
      collected,
      phase: collected.length >= GAME_CONFIG.pickupCount ? 'won' : state.phase,
    };
  }),
}));
