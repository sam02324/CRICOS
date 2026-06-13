/**
 * Tournaments store — leagues / knockouts that group matches. Standings, MVP
 * and the champion are derived from the linked matches in `utils/competition`.
 */
import { create } from 'zustand';
import { Tournament, TournamentEntry, TournamentFormat, TournamentStatus } from '@/types/clubs';
import { loadTournaments, saveTournaments } from '@/utils/storage';
import { uid } from '@/utils/cricket';

export interface TournamentInput {
  name: string;
  emoji: string;
  format: TournamentFormat;
  overs: number;
  entries: TournamentEntry[];
}

interface TournamentState {
  tournaments: Tournament[];
  loaded: boolean;
  refresh: () => Promise<void>;
  getTournament: (id: string | null | undefined) => Tournament | undefined;
  addTournament: (input: TournamentInput) => Promise<Tournament>;
  updateTournament: (tournament: Tournament) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  setStatus: (id: string, status: TournamentStatus) => Promise<void>;
  crown: (id: string, championName: string, championClubId: string | null, mvpName: string | null) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  tournaments: [],
  loaded: false,

  refresh: async () => {
    const tournaments = await loadTournaments();
    set({ tournaments: tournaments.sort((a, b) => b.createdAt - a.createdAt), loaded: true });
  },

  getTournament: (id) => (id ? get().tournaments.find((t) => t.id === id) : undefined),

  addTournament: async (input) => {
    const tournament: Tournament = {
      id: uid('tour_'),
      name: input.name.trim() || 'New Tournament',
      emoji: input.emoji || '🏆',
      format: input.format,
      overs: input.overs,
      entries: input.entries,
      status: 'ongoing',
      createdAt: Date.now(),
      championName: null,
      championClubId: null,
      mvpName: null,
    };
    const tournaments = [tournament, ...get().tournaments];
    await saveTournaments(tournaments);
    set({ tournaments });
    return tournament;
  },

  updateTournament: async (tournament) => {
    const tournaments = get().tournaments.map((t) => (t.id === tournament.id ? tournament : t));
    await saveTournaments(tournaments);
    set({ tournaments });
  },

  deleteTournament: async (id) => {
    const tournaments = get().tournaments.filter((t) => t.id !== id);
    await saveTournaments(tournaments);
    set({ tournaments });
  },

  setStatus: async (id, status) => {
    const tournaments = get().tournaments.map((t) => (t.id === id ? { ...t, status } : t));
    await saveTournaments(tournaments);
    set({ tournaments });
  },

  crown: async (id, championName, championClubId, mvpName) => {
    const tournaments = get().tournaments.map((t) =>
      t.id === id ? { ...t, status: 'completed' as TournamentStatus, championName, championClubId, mvpName } : t,
    );
    await saveTournaments(tournaments);
    set({ tournaments });
  },
}));
