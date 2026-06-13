/**
 * Completed-match archive + reusable rule templates. Reads/writes through the
 * offline storage layer; the Home, History and Player-stats screens read here.
 */
import { create } from 'zustand';
import { Match, MatchTemplate } from '@/types/cricket';
import {
  deleteMatch as removeFromStorage,
  loadMatches,
  loadTemplates,
  saveTemplates,
} from '@/utils/storage';
import { uid } from '@/utils/cricket';

interface HistoryState {
  matches: Match[];
  templates: MatchTemplate[];
  loaded: boolean;
  refresh: () => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  addTemplate: (t: Omit<MatchTemplate, 'id'>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  matches: [],
  templates: [],
  loaded: false,

  refresh: async () => {
    const [matches, templates] = await Promise.all([loadMatches(), loadTemplates()]);
    const completed = matches
      .filter((m) => m.status === 'completed')
      .sort((a, b) => b.createdAt - a.createdAt);
    set({ matches: completed, templates, loaded: true });
  },

  deleteMatch: async (id) => {
    await removeFromStorage(id);
    set({ matches: get().matches.filter((m) => m.id !== id) });
  },

  addTemplate: async (t) => {
    const template: MatchTemplate = { ...t, id: uid('t_') };
    const templates = [template, ...get().templates];
    await saveTemplates(templates);
    set({ templates });
  },

  deleteTemplate: async (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
    await saveTemplates(templates);
    set({ templates });
  },
}));

/* ------------------------------ derived stats ---------------------------- */

/** Totals shown on the Home dashboard. */
export function summarizeHistory(matches: Match[]) {
  const totalMatches = matches.length;
  let completed = 0;
  let ties = 0;
  for (const m of matches) {
    if (m.result) {
      completed += 1;
      if (m.result.marginType === 'tie') ties += 1;
    }
  }
  return { totalMatches, completed, ties };
}
