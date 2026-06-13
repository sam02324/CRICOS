/**
 * Clubs store — persistent teams with rosters. Backs the Clubs directory, the
 * club picker in New Match, and club career stats.
 */
import { create } from 'zustand';
import { Club } from '@/types/clubs';
import { Player } from '@/types/cricket';
import { loadClubs, saveClubs } from '@/utils/storage';
import { uid } from '@/utils/cricket';

export interface ClubInput {
  name: string;
  shortName: string;
  emoji: string;
  color: string;
  homeGround: string;
  foundedYear: number | null;
  memberNames: string[];
}

interface ClubState {
  clubs: Club[];
  loaded: boolean;
  refresh: () => Promise<void>;
  getClub: (id: string | null | undefined) => Club | undefined;
  addClub: (input: ClubInput) => Promise<Club>;
  updateClub: (club: Club) => Promise<void>;
  deleteClub: (id: string) => Promise<void>;
  addMember: (clubId: string, name: string) => Promise<void>;
  removeMember: (clubId: string, playerId: string) => Promise<void>;
}

function namesToPlayers(names: string[]): Player[] {
  return names
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => ({ id: uid('pl_'), name }));
}

export const useClubStore = create<ClubState>((set, get) => ({
  clubs: [],
  loaded: false,

  refresh: async () => {
    const clubs = await loadClubs();
    set({ clubs: clubs.sort((a, b) => b.createdAt - a.createdAt), loaded: true });
  },

  getClub: (id) => (id ? get().clubs.find((c) => c.id === id) : undefined),

  addClub: async (input) => {
    const club: Club = {
      id: uid('club_'),
      name: input.name.trim() || 'New Club',
      shortName: (input.shortName.trim() || input.name.trim().slice(0, 3)).toUpperCase(),
      emoji: input.emoji || '🏏',
      color: input.color || '#22C55E',
      homeGround: input.homeGround.trim(),
      foundedYear: input.foundedYear,
      members: namesToPlayers(input.memberNames),
      createdAt: Date.now(),
    };
    const clubs = [club, ...get().clubs];
    await saveClubs(clubs);
    set({ clubs });
    return club;
  },

  updateClub: async (club) => {
    const clubs = get().clubs.map((c) => (c.id === club.id ? club : c));
    await saveClubs(clubs);
    set({ clubs });
  },

  deleteClub: async (id) => {
    const clubs = get().clubs.filter((c) => c.id !== id);
    await saveClubs(clubs);
    set({ clubs });
  },

  addMember: async (clubId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const clubs = get().clubs.map((c) =>
      c.id === clubId ? { ...c, members: [...c.members, { id: uid('pl_'), name: trimmed }] } : c,
    );
    await saveClubs(clubs);
    set({ clubs });
  },

  removeMember: async (clubId, playerId) => {
    const clubs = get().clubs.map((c) =>
      c.id === clubId ? { ...c, members: c.members.filter((m) => m.id !== playerId) } : c,
    );
    await saveClubs(clubs);
    set({ clubs });
  },
}));
