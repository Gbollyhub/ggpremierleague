import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { getManOfTheMatch, calculateMatchRating, calculateRatingDelta, clampRating, calculateAttributes } from '@/utils/players';
import { IconPlus, IconX, IconStar, IconEdit, IconTrash } from '@/components/ui/Icons';

const gwCompleted = (gw) => gw.status === 'completed' || gw.completed === true;

const EMPTY_PERF = () => ({
  tackles: 0, interceptions: 0, saves: 0, blocks: 0,
  shotsOnTarget: 0, shotsOffTarget: 0,
  skillMoves: 0, bigChancesMissed: 0,
  fouls: 0, goalsConceded: 0, goalsConcededAsGK: 0,
  yellowCard: false, redCard: false,
});

const EMPTY_STATS = () => ({ corners: 0 });
const EMPTY_FORM = () => ({
  teamAPlayers: [], teamBPlayers: [],
  teamASubs: [], teamBSubs: [],
  teamAGoals: [], teamBGoals: [],
  playerPerf: {},
  teamAStats: EMPTY_STATS(), teamBStats: EMPTY_STATS(),
  matchLink: '',
});

// Computes team-level aggregates from individual player perf entries
function computeTeamStats(teamPlayers, playerPerf) {
  let shots = 0, shotsOnTarget = 0, fouls = 0, skillMovesTotal = 0;
  teamPlayers.forEach((pid) => {
    const perf = playerPerf[pid] || EMPTY_PERF();
    const sot = +perf.shotsOnTarget || 0;
    const sof = +perf.shotsOffTarget || 0;
    shotsOnTarget += sot;
    shots += sot + sof;
    fouls += +perf.fouls || 0;
    skillMovesTotal += +perf.skillMoves || 0;
  });
  return { shots, shotsOnTarget, fouls, skillMovesTotal };
}

export default function GameWeekManagerPage() {
  const { players, gameWeeks, createGameWeek, completeGameWeek, deleteGameWeek, addToast } = useStore();
  const [mode, setMode] = useState('idle'); // 'idle' | 'create' | 'record'
  const [gwDate, setGwDate] = useState('');
  const [editingGW, setEditingGW] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM());
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const upcoming = gameWeeks.filter((gw) => !gwCompleted(gw));
  const completed = gameWeeks.filter((gw) => gwCompleted(gw));

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setStat = (team, key, val) => setForm((f) => ({ ...f, [team]: { ...f[team], [key]: val } }));
  const toggleGoalOG = (goalKey, idx) => setForm((f) => ({
    ...f,
    [goalKey]: f[goalKey].map((g, i) => i === idx ? { ...g, ownGoal: !g.ownGoal, assisterId: '' } : g),
  }));
  const updatePerf = (pid, field, val) => setForm((f) => ({
    ...f, playerPerf: { ...f.playerPerf, [pid]: { ...f.playerPerf[pid], [field]: val } },
  }));
  const addToTeam = (teamKey, pid) => {
    if (!pid || form[teamKey].includes(pid)) return;
    setForm((f) => ({ ...f, [teamKey]: [...f[teamKey], pid], playerPerf: { ...f.playerPerf, [pid]: f.playerPerf[pid] || EMPTY_PERF() } }));
  };
  const removeFromTeam = (teamKey, pid) => {
    const other = teamKey === 'teamAPlayers' ? 'teamBPlayers' : 'teamAPlayers';
    const subsKey = teamKey === 'teamAPlayers' ? 'teamASubs' : 'teamBSubs';
    setForm((f) => {
      const perf = { ...f.playerPerf };
      if (!f[other].includes(pid)) delete perf[pid];
      return { ...f, [teamKey]: f[teamKey].filter((id) => id !== pid), [subsKey]: f[subsKey].filter((id) => id !== pid), playerPerf: perf };
    });
  };
  const toggleSub = (subsKey, pid) => setForm((f) => {
    const subs = f[subsKey];
    return { ...f, [subsKey]: subs.includes(pid) ? subs.filter((id) => id !== pid) : [...subs, pid] };
  });
  const closeRecord = () => { setMode('idle'); setEditingGW(null); setForm(EMPTY_FORM()); };

  // ── Delete completed GW + reverse player contributions ───────────────────
  const handleDelete = async (gw) => {
    setDeleting(true);
    const gwPlayers = [...(gw.teamA?.players || []), ...(gw.teamB?.players || [])];
    const allOtherCompleted = gameWeeks.filter((g) => gwCompleted(g) && g.id !== gw.id);

    const playerDiffs = gwPlayers.map((pid) => {
      const p = players.find((pl) => pl.id === pid);
      if (!p) return null;

      let otherDeltaSum = 0;
      const otherTotals = {
        goals: 0, assists: 0, tackles: 0, cleanSheets: 0, saves: 0, gamesPlayed: 0, motm: 0,
        shots: 0, shotsOnTarget: 0, shotsOffTarget: 0, interceptions: 0, blocks: 0,
        fouls: 0, goalsConceded: 0, skillMoves: 0, bigChancesMissed: 0,
      };
      allOtherCompleted.forEach((og) => {
        const inA = (og.teamA?.players || []).includes(pid);
        const inB = (og.teamB?.players || []).includes(pid);
        if (!inA && !inB) return;
        const ms = og.playerStats?.[pid] || {};
        const isCS = (inA && +(og.teamB?.score || 0) === 0) || (inB && +(og.teamA?.score || 0) === 0);
        otherDeltaSum += calculateRatingDelta(p, ms, isCS);
        otherTotals.goals += ms.goals || 0;
        otherTotals.assists += ms.assists || 0;
        otherTotals.tackles += ms.tackles || 0;
        otherTotals.cleanSheets += isCS ? 1 : 0;
        otherTotals.saves += ms.saves || 0;
        otherTotals.gamesPlayed += 1;
        otherTotals.motm += og.motm === pid ? 1 : 0;
        otherTotals.shots += ms.shots || 0;
        otherTotals.shotsOnTarget += ms.shotsOnTarget || 0;
        otherTotals.shotsOffTarget += ms.shotsOffTarget || 0;
        otherTotals.interceptions += ms.interceptions || 0;
        otherTotals.blocks += ms.blocks || 0;
        otherTotals.fouls += ms.fouls || 0;
        otherTotals.goalsConceded += ms.goalsConceded || ms.goalsConcededAsDF || 0;
        otherTotals.skillMoves += ms.skillMoves || 0;
        otherTotals.bigChancesMissed += ms.bigChancesMissed || 0;
      });

      const inOldA = (gw.teamA?.players || []).includes(pid);
      const oldMs = gw.playerStats?.[pid] || {};
      const oldIsCS = (inOldA && +(gw.teamB?.score || 0) === 0) || (!inOldA && +(gw.teamA?.score || 0) === 0);
      const allCurrentDelta = otherDeltaSum + calculateRatingDelta(p, oldMs, oldIsCS);
      const baseRating = p.baseRating ?? (p.rating - allCurrentDelta);

      return {
        id: pid,
        updates: {
          baseRating: p.baseRating ?? baseRating,
          rating: clampRating(baseRating + otherDeltaSum),
          attributes: calculateAttributes(otherTotals, p.attributes),
          stats: {
            goals: otherTotals.goals, assists: otherTotals.assists, tackles: otherTotals.tackles,
            cleanSheets: otherTotals.cleanSheets, saves: otherTotals.saves,
            gamesPlayed: otherTotals.gamesPlayed, motm: otherTotals.motm,
            shots: otherTotals.shots, shotsOffTarget: otherTotals.shotsOffTarget,
            skillMoves: otherTotals.skillMoves, bigChancesMissed: otherTotals.bigChancesMissed,
          },
        },
      };
    }).filter(Boolean);

    await deleteGameWeek(gw.id, playerDiffs);
    setDeleting(false);
    setConfirmDeleteId(null);
    addToast(`GW${gw.weekNumber} deleted`, 'success');
  };

  // ── Create upcoming GW ────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!gwDate) { addToast('Select a date', 'error'); return; }
    setSaving(true);
    await createGameWeek({
      id: `gw${Date.now()}`, weekNumber: gameWeeks.length + 1, date: gwDate,
      status: 'upcoming', completed: false,
      teamA: { name: 'Team A', players: [], score: 0 },
      teamB: { name: 'Team B', players: [], score: 0 },
      events: [], goals: [], motm: null,
    });
    setSaving(false);
    setMode('idle'); setGwDate('');
    addToast('Game week created!', 'success');
  };

  // ── Open record form for upcoming GW ─────────────────────────────────────
  const openRecord = (gw) => {
    const all = [...(gw.teamA?.players || []), ...(gw.teamB?.players || [])];
    const playerPerf = {};
    all.forEach((pid) => { playerPerf[pid] = EMPTY_PERF(); });
    setEditingGW(gw);
    setForm({ ...EMPTY_FORM(), teamAPlayers: gw.teamA?.players || [], teamBPlayers: gw.teamB?.players || [], teamASubs: gw.teamA?.subs || [], teamBSubs: gw.teamB?.subs || [], playerPerf });
    setMode('record');
  };

  // ── Open edit form for completed GW (pre-fills all existing data) ─────────
  const openEdit = (gw) => {
    const allPids = [...(gw.teamA?.players || []), ...(gw.teamB?.players || [])];
    const playerPerf = {};
    allPids.forEach((pid) => {
      const ps = gw.playerStats?.[pid] || {};
      // backward compat: derive shotsOffTarget from shots - shotsOnTarget for old records
      const derivedSoF = ps.shotsOffTarget ?? Math.max(0, (ps.shots || 0) - (ps.shotsOnTarget || 0));
      playerPerf[pid] = {
        tackles: ps.tackles || 0, interceptions: ps.interceptions || 0,
        saves: ps.saves || 0, blocks: ps.blocks || 0,
        shotsOnTarget: ps.shotsOnTarget || 0, shotsOffTarget: derivedSoF,
        skillMoves: ps.skillMoves || 0, bigChancesMissed: ps.bigChancesMissed || 0,
        fouls: ps.fouls || 0, goalsConceded: ps.goalsConceded || ps.goalsConcededAsDF || 0,
        goalsConcededAsGK: ps.goalsConcededAsGK || 0,
        yellowCard: ps.yellowCard || false, redCard: ps.redCard || false,
      };
    });
    // Rebuild goals — support both new (goals[]) and old (events[]) format
    const teamAGoals = [];
    const teamBGoals = [];
    if (gw.goals?.length) {
      gw.goals.forEach((g) => {
        const entry = { scorerId: g.scorerId || '', assisterId: g.assisterId || '', minute: g.minute || 0, ownGoal: g.ownGoal || false };
        (g.team === 'A' ? teamAGoals : teamBGoals).push(entry);
      });
    } else {
      (gw.events || []).forEach((e) => {
        if (e.type === 'goal') {
          const inA = (gw.teamA?.players || []).includes(e.playerId);
          (inA ? teamAGoals : teamBGoals).push({ scorerId: e.playerId, assisterId: '', minute: e.minute || 0 });
        }
      });
    }
    setEditingGW(gw);
    setForm({
      teamAPlayers: gw.teamA?.players || [], teamBPlayers: gw.teamB?.players || [],
      teamASubs: gw.teamA?.subs || [], teamBSubs: gw.teamB?.subs || [],
      teamAGoals, teamBGoals, playerPerf,
      teamAStats: { corners: gw.teamA?.corners || 0 },
      teamBStats: { corners: gw.teamB?.corners || 0 },
      matchLink: gw.matchLink || '',
    });
    setMode('record');
  };

  // ── Save / update result ──────────────────────────────────────────────────
  const handleRecord = async () => {
    const { teamAPlayers, teamBPlayers, teamAGoals, teamBGoals, playerPerf, teamAStats, teamBStats } = form;
    if (!teamAPlayers.length || !teamBPlayers.length) { addToast('Both teams need players', 'error'); return; }

    // Scores derived from goal entries
    const teamAScore = teamAGoals.filter((g) => g.scorerId).length;
    const teamBScore = teamBGoals.filter((g) => g.scorerId).length;

    // Team-level stats derived from player performance
    const teamACS = computeTeamStats(teamAPlayers, playerPerf);
    const teamBCS = computeTeamStats(teamBPlayers, playerPerf);
    const totalAct = teamACS.shots + teamACS.skillMovesTotal + teamBCS.shots + teamBCS.skillMovesTotal;
    const possA = totalAct > 0 ? Math.round(Math.max(20, Math.min(80, (teamACS.shots + teamACS.skillMovesTotal) / totalAct * 100))) : 50;

    const goals = [
      ...teamAGoals.filter((g) => g.scorerId).map((g) => ({ ...g, team: 'A' })),
      ...teamBGoals.filter((g) => g.scorerId).map((g) => ({ ...g, team: 'B' })),
    ];
    const events = goals.flatMap((g) => [
      { playerId: g.scorerId, type: g.ownGoal ? 'ownGoal' : 'goal', minute: g.minute },
      ...(!g.ownGoal && g.assisterId ? [{ playerId: g.assisterId, type: 'assist', minute: g.minute }] : []),
    ]);

    const allMatchPlayers = [...teamAPlayers, ...teamBPlayers];

    // Build per-player match stats
    const playerStats = {};
    allMatchPlayers.forEach((pid) => {
      const p = players.find((pl) => pl.id === pid);
      if (!p) return;
      const inA = teamAPlayers.includes(pid);
      const myGoals = inA ? teamAGoals : teamBGoals;
      // Normal goals: own team's goals where this player is scorer and NOT an own goal
      const g = myGoals.filter((x) => x.scorerId === pid && !x.ownGoal).length;
      // Assists: only on normal goals
      const a = goals.filter((x) => x.assisterId === pid && !x.ownGoal).length;
      // Own goals: appearing as scorer in the opposing team's goal list with ownGoal flag
      const opposingGoals = inA ? teamBGoals : teamAGoals;
      const og = opposingGoals.filter((x) => x.ownGoal && x.scorerId === pid).length;
      const perf = playerPerf[pid] || EMPTY_PERF();
      const isCS = (inA && +teamBScore === 0) || (!inA && +teamAScore === 0);
      const sot = +perf.shotsOnTarget || 0;
      const sof = +perf.shotsOffTarget || 0;
      const ms = {
        goals: g, assists: a, ownGoals: og,
        tackles: +perf.tackles || 0, interceptions: +perf.interceptions || 0,
        saves: +perf.saves || 0, blocks: +perf.blocks || 0,
        shotsOnTarget: sot, shotsOffTarget: sof, shots: sot + sof,
        skillMoves: +perf.skillMoves || 0, bigChancesMissed: +perf.bigChancesMissed || 0,
        fouls: +perf.fouls || 0, yellowCard: !!perf.yellowCard, redCard: !!perf.redCard,
        goalsConceded: inA ? teamBScore : teamAScore,
        goalsConcededAsGK: +perf.goalsConcededAsGK || 0,
      };
      playerStats[pid] = { ...ms, matchRating: calculateMatchRating(p, ms, isCS) };
    });

    const motmCandidates = allMatchPlayers.map((pid) => {
      const p = players.find((pl) => pl.id === pid);
      if (!p) return null;
      const inA = teamAPlayers.includes(pid);
      const isCS = (inA && +teamBScore === 0) || (!inA && +teamAScore === 0);
      return { id: pid, position: p.position, matchRating: playerStats[pid]?.matchRating ?? 6, matchStats: playerStats[pid] || {}, isCleanSheet: isCS };
    }).filter(Boolean);
    const motm = getManOfTheMatch(motmCandidates);

    const { teamASubs, teamBSubs } = form;
    const gwUpdates = {
      teamA: { name: 'Team A', players: teamAPlayers, subs: teamASubs, score: teamAScore, shots: teamACS.shots, shotsOnTarget: teamACS.shotsOnTarget, possession: possA, fouls: teamACS.fouls, corners: teamAStats.corners || 0 },
      teamB: { name: 'Team B', players: teamBPlayers, subs: teamBSubs, score: teamBScore, shots: teamBCS.shots, shotsOnTarget: teamBCS.shotsOnTarget, possession: 100 - possA, fouls: teamBCS.fouls, corners: teamBStats.corners || 0 },
      goals, events, playerStats, motm,
      matchLink: form.matchLink.trim() || null,
    };

    // Full recalculation — derive every player's rating and stats from scratch
    const isEditing = gwCompleted(editingGW);
    const allOtherCompleted = gameWeeks.filter((gw) => gwCompleted(gw) && gw.id !== editingGW.id);
    const oldMatchPlayers = isEditing ? [...(editingGW.teamA?.players || []), ...(editingGW.teamB?.players || [])] : [];
    const allAffected = [...new Set([...allMatchPlayers, ...oldMatchPlayers])];

    const playerDiffs = allAffected.map((pid) => {
      const p = players.find((pl) => pl.id === pid);
      if (!p) return null;

      let otherDeltaSum = 0;
      const otherTotals = {
        goals: 0, assists: 0, tackles: 0, cleanSheets: 0, saves: 0, gamesPlayed: 0, motm: 0,
        shots: 0, shotsOnTarget: 0, shotsOffTarget: 0, interceptions: 0, blocks: 0,
        fouls: 0, goalsConceded: 0, skillMoves: 0, bigChancesMissed: 0,
      };
      allOtherCompleted.forEach((gw) => {
        const inA = (gw.teamA?.players || []).includes(pid);
        const inB = (gw.teamB?.players || []).includes(pid);
        if (!inA && !inB) return;
        const ms = gw.playerStats?.[pid] || {};
        const isCS = (inA && +(gw.teamB?.score || 0) === 0) || (inB && +(gw.teamA?.score || 0) === 0);
        otherDeltaSum += calculateRatingDelta(p, ms, isCS);
        otherTotals.goals += ms.goals || 0;
        otherTotals.assists += ms.assists || 0;
        otherTotals.tackles += ms.tackles || 0;
        otherTotals.cleanSheets += isCS ? 1 : 0;
        otherTotals.saves += ms.saves || 0;
        otherTotals.gamesPlayed += 1;
        otherTotals.motm += gw.motm === pid ? 1 : 0;
        otherTotals.shots += ms.shots || 0;
        otherTotals.shotsOnTarget += ms.shotsOnTarget || 0;
        otherTotals.shotsOffTarget += ms.shotsOffTarget || 0;
        otherTotals.interceptions += ms.interceptions || 0;
        otherTotals.blocks += ms.blocks || 0;
        otherTotals.fouls += ms.fouls || 0;
        otherTotals.goalsConceded += ms.goalsConceded || ms.goalsConcededAsDF || 0;
        otherTotals.skillMoves += ms.skillMoves || 0;
        otherTotals.bigChancesMissed += ms.bigChancesMissed || 0;
      });

      const baseRating = p.baseRating ?? (() => {
        let allCurrentDelta = otherDeltaSum;
        if (isEditing) {
          const inOldA = (editingGW.teamA?.players || []).includes(pid);
          const inOldB = (editingGW.teamB?.players || []).includes(pid);
          if (inOldA || inOldB) {
            const oldMs = editingGW.playerStats?.[pid] || {};
            const oldIsCS = (inOldA && +(editingGW.teamB?.score || 0) === 0) || (inOldB && +(editingGW.teamA?.score || 0) === 0);
            allCurrentDelta += calculateRatingDelta(p, oldMs, oldIsCS);
          }
        }
        return p.rating - allCurrentDelta;
      })();

      const inNewA = teamAPlayers.includes(pid);
      const inNewB = teamBPlayers.includes(pid);
      const isInNewMatch = inNewA || inNewB;
      const newMs = playerStats[pid] || {};
      const newIsCS = isInNewMatch && ((inNewA && +teamBScore === 0) || (inNewB && +teamAScore === 0));
      const thisGWDelta = isInNewMatch ? calculateRatingDelta(p, newMs, newIsCS) : 0;
      const thisGWTotals = isInNewMatch
        ? {
            goals: newMs.goals || 0, assists: newMs.assists || 0, tackles: newMs.tackles || 0,
            cleanSheets: newIsCS ? 1 : 0, saves: newMs.saves || 0, gamesPlayed: 1, motm: pid === motm ? 1 : 0,
            shots: newMs.shots || 0, shotsOnTarget: newMs.shotsOnTarget || 0, shotsOffTarget: newMs.shotsOffTarget || 0,
            interceptions: newMs.interceptions || 0, blocks: newMs.blocks || 0,
            fouls: newMs.fouls || 0, goalsConceded: newMs.goalsConceded || 0,
            skillMoves: newMs.skillMoves || 0, bigChancesMissed: newMs.bigChancesMissed || 0,
          }
        : {
            goals: 0, assists: 0, tackles: 0, cleanSheets: 0, saves: 0, gamesPlayed: 0, motm: 0,
            shots: 0, shotsOnTarget: 0, shotsOffTarget: 0, interceptions: 0, blocks: 0,
            fouls: 0, goalsConceded: 0, skillMoves: 0, bigChancesMissed: 0,
          };

      const seasonTotals = {
        goals: otherTotals.goals + thisGWTotals.goals,
        assists: otherTotals.assists + thisGWTotals.assists,
        shots: otherTotals.shots + thisGWTotals.shots,
        shotsOnTarget: otherTotals.shotsOnTarget + thisGWTotals.shotsOnTarget,
        shotsOffTarget: otherTotals.shotsOffTarget + thisGWTotals.shotsOffTarget,
        tackles: otherTotals.tackles + thisGWTotals.tackles,
        interceptions: otherTotals.interceptions + thisGWTotals.interceptions,
        blocks: otherTotals.blocks + thisGWTotals.blocks,
        fouls: otherTotals.fouls + thisGWTotals.fouls,
        saves: otherTotals.saves + thisGWTotals.saves,
        goalsConceded: otherTotals.goalsConceded + thisGWTotals.goalsConceded,
        gamesPlayed: otherTotals.gamesPlayed + thisGWTotals.gamesPlayed,
        skillMoves: otherTotals.skillMoves + thisGWTotals.skillMoves,
        bigChancesMissed: otherTotals.bigChancesMissed + thisGWTotals.bigChancesMissed,
      };

      return {
        id: pid,
        updates: {
          baseRating: p.baseRating ?? baseRating,
          rating: clampRating(baseRating + otherDeltaSum + thisGWDelta),
          attributes: calculateAttributes(seasonTotals, p.attributes),
          stats: {
            goals: seasonTotals.goals,
            assists: seasonTotals.assists,
            tackles: seasonTotals.tackles,
            cleanSheets: otherTotals.cleanSheets + thisGWTotals.cleanSheets,
            saves: seasonTotals.saves,
            gamesPlayed: seasonTotals.gamesPlayed,
            motm: otherTotals.motm + thisGWTotals.motm,
            shots: seasonTotals.shots,
            shotsOffTarget: seasonTotals.shotsOffTarget,
            skillMoves: seasonTotals.skillMoves,
            bigChancesMissed: seasonTotals.bigChancesMissed,
          },
        },
      };
    }).filter(Boolean);

    setSaving(true);
    await completeGameWeek(editingGW.id, gwUpdates, playerDiffs);
    setSaving(false);
    const motmName = motm ? players.find((p) => p.id === motm)?.name : null;
    addToast(`GW${editingGW.weekNumber} ${isEditing ? 'updated' : 'saved'}!${motmName ? ` MOTM: ${motmName}` : ''}`, 'success');
    closeRecord();
  };

  // ── Create mode ───────────────────────────────────────────────────────────
  if (mode === 'create') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-gpl">New Game Week</h1>
          <button onClick={() => { setMode('idle'); setGwDate(''); }} className="p-2 text-gpl-muted hover:text-gpl"><IconX className="w-5 h-5" /></button>
        </div>
        <div className="gpl-card p-6 max-w-sm space-y-4">
          <div>
            <label className="text-xs text-gpl-muted block mb-1 font-medium">Match Date</label>
            <input type="date" value={gwDate} onChange={(e) => setGwDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm" />
          </div>
          <p className="text-xs text-gpl-muted">Week #{gameWeeks.length + 1} — add the team sheet via Team Generator after creating.</p>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Creating...' : 'Create Game Week'}
            </button>
            <button onClick={() => { setMode('idle'); setGwDate(''); }} className="px-4 py-2.5 rounded-xl gpl-card text-gpl text-sm font-medium">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Record / edit mode ────────────────────────────────────────────────────
  if (mode === 'record' && editingGW) {
    const isEditing = gwCompleted(editingGW);
    const allMatchPlayers = [...form.teamAPlayers, ...form.teamBPlayers];
    const availablePlayers = players.filter((p) => !form.teamAPlayers.includes(p.id) && !form.teamBPlayers.includes(p.id));

    // Auto-computed values
    const autoTeamAScore = form.teamAGoals.filter((g) => g.scorerId).length;
    const autoTeamBScore = form.teamBGoals.filter((g) => g.scorerId).length;

    const teamACS = computeTeamStats(form.teamAPlayers, form.playerPerf);
    const teamBCS = computeTeamStats(form.teamBPlayers, form.playerPerf);
    const totalAct = teamACS.shots + teamACS.skillMovesTotal + teamBCS.shots + teamBCS.skillMovesTotal;
    const autoPossA = totalAct > 0 ? Math.round(Math.max(20, Math.min(80, (teamACS.shots + teamACS.skillMovesTotal) / totalAct * 100))) : 50;
    const autoPossB = 100 - autoPossA;

    const PERF_FIELDS = [
      { key: 'tackles', label: 'Tkl' },
      { key: 'interceptions', label: 'Int' },
      { key: 'blocks', label: 'Blk' },
      { key: 'saves', label: 'Svs' },
      { key: 'shotsOnTarget', label: 'SoT' },
      { key: 'shotsOffTarget', label: 'SoF' },
      { key: 'skillMoves', label: 'Skl' },
      { key: 'bigChancesMissed', label: 'BCM' },
      { key: 'fouls', label: 'Foul' },
      { key: 'goalsConceded', label: 'GC', readOnly: true },
      { key: 'goalsConcededAsGK', label: 'GCK' },
    ];

    return (
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">{isEditing ? 'Edit Result' : 'Record Result'}</h1>
            <p className="text-gpl-muted text-sm">Game Week {editingGW.weekNumber} — {editingGW.date}</p>
          </div>
          <button onClick={closeRecord} className="p-2 text-gpl-muted hover:text-gpl"><IconX className="w-5 h-5" /></button>
        </div>

        <div className="space-y-6">
          {/* Teams */}
          <div className="gpl-card p-5 sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-4">Teams</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[['Team A', 'teamAPlayers', 'teamASubs', '#ef4444'], ['Team B', 'teamBPlayers', 'teamBSubs', '#3b82f6']].map(([name, key, subsKey, color]) => (
                <div key={key}>
                  <h4 className="text-sm font-bold mb-2" style={{ color }}>{name}</h4>
                  <select className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm mb-2" value=""
                    onChange={(e) => addToTeam(key, e.target.value)}>
                    <option value="">Add player...</option>
                    {availablePlayers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                  </select>
                  <div className="space-y-1">
                    {form[key].map((pid) => {
                      const pl = players.find((p) => p.id === pid);
                      const isSub = form[subsKey].includes(pid);
                      return pl ? (
                        <div key={pid} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isSub ? 'bg-amber-500/10' : 'bg-gpl-inset'}`}>
                          <span className="font-medium text-gpl flex-1 truncate">{pl.name}</span>
                          <span className="text-xs text-gpl-muted">{pl.position}</span>
                          <button onClick={() => toggleSub(subsKey, pid)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${isSub ? 'bg-amber-500/20 text-amber-500' : 'bg-gpl-border/30 text-gpl-muted hover:text-gpl'}`}>
                            {isSub ? 'SUB' : 'START'}
                          </button>
                          <button onClick={() => removeFromTeam(key, pid)} className="text-red-400"><IconX className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score & Goals */}
          <div className="gpl-card p-5 sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-4">Score & Goals</h3>

            {/* Auto-computed scores */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-red-400 block mb-1 font-medium">Team A Score</label>
                <div className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm font-bold text-red-400 select-none">
                  {autoTeamAScore}
                </div>
                <p className="text-[10px] text-gpl-muted mt-1">Auto-calculated from goals below</p>
              </div>
              <div>
                <label className="text-xs text-blue-400 block mb-1 font-medium">Team B Score</label>
                <div className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm font-bold text-blue-400 select-none">
                  {autoTeamBScore}
                </div>
                <p className="text-[10px] text-gpl-muted mt-1">Auto-calculated from goals below</p>
              </div>
            </div>

            {[['teamAGoals', 'teamAPlayers', 'teamBPlayers', '#ef4444', 'Team A Goals'], ['teamBGoals', 'teamBPlayers', 'teamAPlayers', '#3b82f6', 'Team B Goals']].map(([goalKey, teamKey, opposingKey, color, label]) => (
              <div key={goalKey} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold" style={{ color }}>{label}</h4>
                  <button onClick={() => setF(goalKey, [...form[goalKey], { scorerId: '', assisterId: '', minute: 0, ownGoal: false }])}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: `${color}15`, color }}>+ Add Goal</button>
                </div>
                {form[goalKey].map((g, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center flex-wrap">
                    <button
                      onClick={() => toggleGoalOG(goalKey, i)}
                      className={`shrink-0 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors ${g.ownGoal ? 'bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/40' : 'bg-gpl-inset text-gpl-muted hover:text-gpl'}`}
                      title="Toggle own goal"
                    >
                      OG
                    </button>
                    <select
                      value={g.scorerId}
                      onChange={(e) => setF(goalKey, form[goalKey].map((x, j) => j === i ? { ...x, scorerId: e.target.value } : x))}
                      className="flex-1 min-w-28 px-3 py-2 rounded-xl gpl-input text-xs"
                    >
                      <option value="">{g.ownGoal ? 'OG scorer (opp)...' : 'Scorer...'}</option>
                      {(g.ownGoal ? form[opposingKey] : form[teamKey]).map((pid) => {
                        const pl = players.find((p) => p.id === pid);
                        return pl ? <option key={pid} value={pid}>{pl.name}</option> : null;
                      })}
                    </select>
                    {!g.ownGoal && (
                      <select
                        value={g.assisterId}
                        onChange={(e) => setF(goalKey, form[goalKey].map((x, j) => j === i ? { ...x, assisterId: e.target.value } : x))}
                        className="flex-1 min-w-28 px-3 py-2 rounded-xl gpl-input text-xs"
                      >
                        <option value="">Assist (opt)...</option>
                        {allMatchPlayers.map((pid) => { const pl = players.find((p) => p.id === pid); return pl ? <option key={pid} value={pid}>{pl.name}</option> : null; })}
                      </select>
                    )}
                    <input type="number" placeholder="Min" min={0} max={120} value={g.minute}
                      onChange={(e) => setF(goalKey, form[goalKey].map((x, j) => j === i ? { ...x, minute: +e.target.value } : x))}
                      className="w-16 shrink-0 px-3 py-2 rounded-xl gpl-input text-xs" />
                    <button onClick={() => setF(goalKey, form[goalKey].filter((_, j) => j !== i))} className="text-red-400 shrink-0 flex items-center justify-center"><IconX className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Player Performance */}
          {allMatchPlayers.length > 0 && (
            <div className="gpl-card p-5 sm:p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-1">Player Performance</h3>
              <p className="text-[10px] text-gpl-muted mb-4">SoT = Shots on Target · SoF = Shots off Target · Skl = Skill Moves · BCM = Big Chances Missed · GC = Goals Conceded (auto) · GCK = Goals Conceded as GK</p>
              {[['teamAPlayers', '#ef4444', 'Team A', autoTeamBScore], ['teamBPlayers', '#3b82f6', 'Team B', autoTeamAScore]].map(([teamKey, color, label, teamGC]) => (
                form[teamKey].length > 0 && (
                  <div key={teamKey} className="mb-5">
                    <h4 className="text-xs font-bold mb-2" style={{ color }}>{label}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gpl-muted">
                            <th className="text-left font-medium pb-2 pr-3">Player</th>
                            {PERF_FIELDS.map(({ key, label }) => (
                              <th key={key} className="font-medium pb-2 px-1 text-center">{label}</th>
                            ))}
                            <th className="font-medium pb-2 px-1 text-center">YC</th>
                            <th className="font-medium pb-2 px-1 text-center">RC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form[teamKey].map((pid) => {
                            const pl = players.find((p) => p.id === pid);
                            const perf = form.playerPerf[pid] || EMPTY_PERF();
                            if (!pl) return null;
                            return (
                              <tr key={pid} className="border-t border-gpl-border">
                                <td className="py-1.5 pr-3 font-medium text-gpl truncate max-w-25">{pl.name.split(' ').pop()}</td>
                                {PERF_FIELDS.map(({ key, readOnly }) => (
                                  <td key={key} className="py-1.5 px-1">
                                    {readOnly ? (
                                      <div className="w-9 px-1 py-1 rounded-lg bg-gpl-inset text-center text-xs text-gpl-muted select-none">{teamGC}</div>
                                    ) : (
                                      <input type="number" min={0} max={30} value={perf[key] ?? 0} onChange={(e) => updatePerf(pid, key, e.target.value)}
                                        className="w-9 px-1 py-1 rounded-lg gpl-input text-center text-xs" />
                                    )}
                                  </td>
                                ))}
                                {['yellowCard', 'redCard'].map((f) => (
                                  <td key={f} className="py-1.5 px-1 text-center">
                                    <input type="checkbox" checked={!!perf[f]} onChange={(e) => updatePerf(pid, f, e.target.checked)}
                                      className="w-4 h-4 rounded accent-blue-600" />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Match Link */}
          <div className="gpl-card p-5 sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-1">Match Recording Link <span className="normal-case font-normal text-gpl-muted">(optional)</span></h3>
            <input
              type="text"
              placeholder="https://..."
              value={form.matchLink}
              onChange={(e) => setF('matchLink', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm"
            />
          </div>

          {/* Match Stats */}
          <div className="gpl-card p-5 sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-1">Match Stats</h3>
            <p className="text-[10px] text-gpl-muted mb-4">Shots, possession and fouls are auto-calculated from player data. Only corners need manual entry.</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {/* Auto-computed rows */}
              {[
                { label: 'Shots', valA: teamACS.shots, valB: teamBCS.shots },
                { label: 'Shots on Target', valA: teamACS.shotsOnTarget, valB: teamBCS.shotsOnTarget },
                { label: 'Possession %', valA: autoPossA, valB: autoPossB },
                { label: 'Fouls', valA: teamACS.fouls, valB: teamBCS.fouls },
              ].map(({ label, valA, valB }) => (
                <div key={label} className="contents">
                  <div className="flex items-center gap-2">
                    <div className="w-16 px-2 py-1.5 rounded-lg gpl-input text-xs text-center font-bold text-red-400">{valA}</div>
                    <span className="text-xs text-gpl-muted flex-1 text-center">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gpl-muted flex-1 text-center">{label}</span>
                    <div className="w-16 px-2 py-1.5 rounded-lg gpl-input text-xs text-center font-bold text-blue-400">{valB}</div>
                  </div>
                </div>
              ))}
              {/* Corners — manual entry */}
              <div className="contents">
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={30} value={form.teamAStats.corners} onChange={(e) => setStat('teamAStats', 'corners', +e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg gpl-input text-xs text-center" />
                  <span className="text-xs text-gpl-muted flex-1 text-center">Corners</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gpl-muted flex-1 text-center">Corners</span>
                  <input type="number" min={0} max={30} value={form.teamBStats.corners} onChange={(e) => setStat('teamBStats', 'corners', +e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg gpl-input text-xs text-center" />
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gpl-muted mt-3 px-1">
              <span className="text-red-400 font-bold">Team A</span>
              <span className="text-blue-400 font-bold">Team B</span>
            </div>
          </div>

          <button onClick={handleRecord} disabled={saving}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold transition-colors text-sm flex items-center justify-center gap-2">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving...' : isEditing ? 'Update Result & Ratings' : 'Save Result & Update Ratings'}
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / list view ──────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Game Week Manager</h1>
          <p className="text-gpl-muted text-sm">{gameWeeks.length} game weeks total</p>
        </div>
        <button onClick={() => setMode('create')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors">
          <IconPlus className="w-4 h-4" /> New Game Week
        </button>
      </div>

      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((gw) => {
              const hasSheet = gw.teamA?.players?.length > 0 && gw.teamB?.players?.length > 0;
              return (
                <div key={gw.id} className="gpl-card p-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-gpl-muted">{gw.date}</div>
                    <div className="text-base font-bold text-gpl">Game Week {gw.weekNumber}</div>
                    <div className="text-xs mt-0.5">
                      {hasSheet
                        ? <span className="text-emerald-500">Team sheet saved ({gw.teamA.players.length + gw.teamB.players.length} players)</span>
                        : <span className="text-amber-500">No team sheet yet — use Team Generator</span>}
                    </div>
                  </div>
                  <button onClick={() => openRecord(gw)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
                    <IconEdit className="w-3.5 h-3.5" /> Record Result
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-3">Completed</h2>
          <div className="space-y-3">
            {[...completed].reverse().map((gw) => {
              const motmP = players.find((p) => p.id === gw.motm);
              return (
                <div key={gw.id} className="gpl-card p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-xs text-gpl-muted">{gw.date}</div>
                      <div className="text-lg font-bold text-gpl">Game Week {gw.weekNumber}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div><span className="text-2xl font-black text-red-500">{gw.teamA.score}</span><span className="text-lg text-gpl-muted mx-2">-</span><span className="text-2xl font-black text-blue-500">{gw.teamB.score}</span></div>
                      {motmP && <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold"><IconStar className="w-3 h-3" /> {motmP.name.split(' ').pop()}</div>}
                      <button onClick={() => openEdit(gw)} className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors" title="Edit result">
                        <IconEdit className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === gw.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-400 font-medium whitespace-nowrap">Delete GW?</span>
                          <button onClick={() => handleDelete(gw)} disabled={deleting}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold transition-colors">
                            {deleting && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {deleting ? '...' : 'Yes'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1.5 rounded-lg gpl-card text-gpl text-xs font-medium">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(gw.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" title="Delete game week">
                          <IconTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameWeeks.length === 0 && (
        <div className="text-center py-20 text-gpl-muted text-sm">No game weeks yet — create one to get started.</div>
      )}
    </div>
  );
}
