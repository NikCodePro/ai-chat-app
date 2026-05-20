import { create } from 'zustand';

interface DebugState {
  networkLatency: number; // Backend -> Frontend TS difference
  playbackQueueSize: number;
  totalLatency: number; // Backend -> Playback execution
  starvationCount: number; // Times the queue emptied unexpectedly
  isVisible: boolean;
  
  setNetworkLatency: (ms: number) => void;
  setQueueSize: (size: number) => void;
  setTotalLatency: (ms: number) => void;
  incrementStarved: () => void;
  toggleVisibility: () => void;
}

export const useDebugStore = create<DebugState>((set) => ({
  networkLatency: 0,
  playbackQueueSize: 0,
  totalLatency: 0,
  starvationCount: 0,
  isVisible: false, // Default hidden
  
  setNetworkLatency: (ms) => set({ networkLatency: ms }),
  setQueueSize: (size) => set({ playbackQueueSize: size }),
  setTotalLatency: (ms) => set({ totalLatency: ms }),
  incrementStarved: () => set((state) => ({ starvationCount: state.starvationCount + 1 })),
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
}));
