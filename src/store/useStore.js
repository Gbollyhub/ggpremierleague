import { create } from 'zustand';
import { db } from '@/firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, query, orderBy, getDocs,
} from 'firebase/firestore';
import { INITIAL_PLAYERS } from '@/data/players';
import { INITIAL_GAMEWEEKS } from '@/data/gameweeks';

export const useStore = create((set, get) => ({
  darkMode: false,
  toggleTheme: () => set((s) => ({ darkMode: !s.darkMode })),

  isAdmin: false,
  login: (email, password) => {
    if (email === 'admin@gpl.com' && password === 'admin123') {
      set({ isAdmin: true });
      return true;
    }
    return false;
  },
  logout: () => set({ isAdmin: false }),

  currentPage: 'players',
  setPage: (page) => set({ currentPage: page }),

  loading: true,

  players: [],
  addPlayer: async (player) => {
    try {
      await setDoc(doc(db, 'players', player.id), player);
    } catch {
      get().addToast('Failed to add player', 'error');
    }
  },
  updatePlayer: async (id, updates) => {
    try {
      await updateDoc(doc(db, 'players', id), updates);
    } catch {
      get().addToast('Failed to update player', 'error');
    }
  },
  deletePlayer: async (id) => {
    try {
      await deleteDoc(doc(db, 'players', id));
    } catch {
      get().addToast('Failed to delete player', 'error');
    }
  },

  selectedPlayer: null,
  setSelectedPlayer: (player) => set({ selectedPlayer: player }),

  gameWeeks: [],

  // Create a new upcoming game week (no stats yet)
  createGameWeek: async (gameWeek) => {
    try {
      await setDoc(doc(db, 'gameWeeks', gameWeek.id), gameWeek);
    } catch {
      get().addToast('Failed to create game week', 'error');
    }
  },

  // Save team sheet from Team Generator to an upcoming game week
  updateGameWeekSheet: async (id, teamAPlayers, teamBPlayers) => {
    try {
      await updateDoc(doc(db, 'gameWeeks', id), {
        'teamA.players': teamAPlayers,
        'teamB.players': teamBPlayers,
      });
    } catch {
      get().addToast('Failed to save team sheet', 'error');
    }
  },

  // Record match result: mark as completed + update all player stats atomically
  completeGameWeek: async (id, gwUpdates, playerDiffs) => {
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'gameWeeks', id), {
        ...gwUpdates,
        status: 'completed',
        completed: true,
      });
      for (const { id: pid, updates } of playerDiffs) {
        batch.update(doc(db, 'players', pid), updates);
      }
      await batch.commit();
    } catch {
      get().addToast('Failed to save result', 'error');
    }
  },

  backfillGKAttributes: async () => {
    try {
      const state = get();
      const toUpdate = state.players.filter(
        (p) => p.attributes.gkDiving === undefined || p.attributes.gkReflexes === undefined
      );
      if (toUpdate.length === 0) { state.addToast('All players already up to date', 'info'); return; }
      const batch = writeBatch(db);
      for (const p of toUpdate) {
        batch.update(doc(db, 'players', p.id), {
          'attributes.gkDiving': p.attributes.gkDiving ?? 75,
          'attributes.gkReflexes': p.attributes.gkReflexes ?? 75,
        });
      }
      await batch.commit();
      state.addToast(`Updated ${toUpdate.length} player${toUpdate.length > 1 ? 's' : ''}`, 'success');
    } catch {
      get().addToast('Failed to backfill attributes', 'error');
    }
  },

  deleteGameWeek: async (id, playerDiffs) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'gameWeeks', id));
      for (const { id: pid, updates } of playerDiffs) {
        batch.update(doc(db, 'players', pid), updates);
      }
      await batch.commit();
    } catch {
      get().addToast('Failed to delete game week', 'error');
    }
  },

  recalculateAllAttributes: async () => {
    try {
      const { players, gameWeeks } = get();
      const { calculateAttributes, calculateRatingDelta, clampRating } = await import('@/utils/players');
      const completed = gameWeeks.filter((gw) => gw.status === 'completed' || gw.completed === true);
      const batch = writeBatch(db);
      for (const p of players) {
        const totals = { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, tackles: 0, interceptions: 0, blocks: 0, fouls: 0, saves: 0, goalsConceded: 0, gamesPlayed: 0 };
        let deltaSum = 0;
        completed.forEach((gw) => {
          const inA = (gw.teamA?.players || []).includes(p.id);
          const inB = (gw.teamB?.players || []).includes(p.id);
          if (!inA && !inB) return;
          const ms = gw.playerStats?.[p.id] || {};
          const isCS = (inA && +(gw.teamB?.score || 0) === 0) || (inB && +(gw.teamA?.score || 0) === 0);
          deltaSum += calculateRatingDelta(p, ms, isCS);
          totals.goals += ms.goals || 0;
          totals.assists += ms.assists || 0;
          totals.shots += ms.shots || 0;
          totals.shotsOnTarget += ms.shotsOnTarget || 0;
          totals.tackles += ms.tackles || 0;
          totals.interceptions += ms.interceptions || 0;
          totals.blocks += ms.blocks || 0;
          totals.fouls += ms.fouls || 0;
          totals.saves += ms.saves || 0;
          totals.goalsConceded += ms.goalsConceded || 0;
          totals.gamesPlayed += 1;
        });
        const base = p.baseRating ?? (p.rating - deltaSum);
        batch.update(doc(db, 'players', p.id), {
          baseRating: base,
          rating: clampRating(base + deltaSum),
          attributes: calculateAttributes(totals),
        });
      }
      await batch.commit();
      get().addToast(`Attributes recalculated for ${players.length} players`, 'success');
    } catch (e) {
      get().addToast('Failed to recalculate attributes', 'error');
    }
  },

  resetPlayerRatings: async () => {
    try {
      const snap = await getDocs(collection(db, 'players'));
      const batch = writeBatch(db);
      snap.forEach((d) => batch.update(d.ref, { rating: 75, baseRating: 75 }));
      await batch.commit();
      get().addToast(`Reset ${snap.size} player rating${snap.size !== 1 ? 's' : ''} to 75`, 'success');
    } catch {
      get().addToast('Failed to reset ratings', 'error');
    }
  },

  resetDatabase: async () => {
    try {
      const batch = writeBatch(db);
      const [playerSnap, gwSnap] = await Promise.all([
        getDocs(collection(db, 'players')),
        getDocs(collection(db, 'gameWeeks')),
      ]);
      playerSnap.forEach((d) => batch.delete(d.ref));
      gwSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      get().addToast('Database cleared', 'success');
    } catch {
      get().addToast('Failed to reset database', 'error');
    }
  },

  seedDatabase: async () => {
    try {
      const batch = writeBatch(db);
      for (const p of INITIAL_PLAYERS) batch.set(doc(db, 'players', p.id), p);
      for (const gw of INITIAL_GAMEWEEKS) batch.set(doc(db, 'gameWeeks', gw.id), gw);
      await batch.commit();
      get().addToast('Sample data loaded!', 'success');
    } catch {
      get().addToast('Failed to load sample data', 'error');
    }
  },

  subscribeToData: () => {
    let playersReady = false;
    let gameWeeksReady = false;
    const checkReady = () => {
      if (playersReady && gameWeeksReady) set({ loading: false });
    };

    const unsubPlayers = onSnapshot(
      collection(db, 'players'),
      (snap) => {
        set({ players: snap.docs.map((d) => ({ ...d.data(), id: d.id })) });
        if (!playersReady) { playersReady = true; checkReady(); }
      },
      () => {
        if (!playersReady) { playersReady = true; checkReady(); }
        get().addToast('Database connection failed', 'error');
      },
    );

    const unsubGameWeeks = onSnapshot(
      query(collection(db, 'gameWeeks'), orderBy('weekNumber')),
      (snap) => {
        set({ gameWeeks: snap.docs.map((d) => ({ ...d.data(), id: d.id })) });
        if (!gameWeeksReady) { gameWeeksReady = true; checkReady(); }
      },
      () => {
        if (!gameWeeksReady) { gameWeeksReady = true; checkReady(); }
      },
    );

    return () => { unsubPlayers(); unsubGameWeeks(); };
  },

  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
