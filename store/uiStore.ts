/**
 * Lightweight UI state shared across the app shell — currently just the
 * navigation drawer (sidebar) open/closed state.
 */
import { create } from 'zustand';

interface UIState {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
}));
