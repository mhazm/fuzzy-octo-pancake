import { create } from 'zustand';

export interface NowPlaying {
  title: string;
  artist: string;
  art: string;
  playingNext?: { title: string; artist: string };
  songHistory?: { title: string; artist: string }[];
  requestsEnabled?: boolean;
  schedule?: { name: string; start: string; end: string; is_now: boolean }[];
}

interface RadioState {
  isOpen: boolean; // false = minimized, true = expanded
  isPlaying: boolean;
  volume: number;
  nowPlaying: NowPlaying | null;
  toggleOpen: () => void;
  setOpen: (isOpen: boolean) => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setNowPlaying: (nowPlaying: NowPlaying) => void;
}

export const useRadioStore = create<RadioState>((set) => ({
  isOpen: false, // Default is minimized
  isPlaying: false,
  volume: 0.5,
  nowPlaying: null,
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setNowPlaying: (nowPlaying) => set({ nowPlaying }),
}));
