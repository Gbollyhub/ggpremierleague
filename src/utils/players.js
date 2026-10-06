import { MIN_RATING, MAX_RATING, ATTR_BASE } from '@/data/constants';

export function generatePlayer(id, name, position, rating, stats = {}, playstyles = [], attrs = {}) {
  const clamped = clampRating(rating);
  return {
    id, name, position,
    rating: clamped,
    baseRating: clamped,
    attributes: { pace: 75, finishing: 75, dribbling: 75, passing: 75, physical: 75, defending: 75, gkReflexes: 75, ...attrs },
    stats: { goals: 0, assists: 0, cleanSheets: 0, tackles: 0, saves: 0, shots: 0, motm: 0, gamesPlayed: 0, ...stats },
    playstyles: playstyles || [],
    history: [],
    createdAt: Date.now(),
  };
}

export function clampRating(r) { return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(r))); }

export function getRatingColor(r) {
  if (r >= 85) return '#22c55e';
  if (r >= 75) return '#eab308';
  if (r >= 65) return '#f97316';
  return '#ef4444';
}

export function getRatingLabel(r) {
  if (r >= 90) return 'ELITE';
  if (r >= 85) return 'WORLD CLASS';
  if (r >= 80) return 'GREAT';
  if (r >= 75) return 'GOOD';
  if (r >= 65) return 'DECENT';
  return 'DEVELOPING';
}

// Per-position weight map — organised by position then stat (inverse-expectation principle).
// Rarer actions for a position yield a larger rating impact.
const MATCH_WEIGHTS = {
  GK: {
    goals:            +1.20, assists:          +0.70, shotsOnTarget:    +0.40,
    blocks:           +0.15, interceptions:    +0.15, tackles:          +0.15,
    cleanSheet:       +0.75, saves:            +0.40, skillMoves:       +0.20,
    keyPasses:        +0.30,
    shotsOffTarget:   -0.05, bigChancesMissed: -0.03, goalsConceded:    -0.25,
    fouls:            -0.15, yellowCard:       -0.25, redCard:          -1.50,
    ownGoals:         -1.20,
  },
  DF: {
    goals:            +0.90, assists:          +0.60, shotsOnTarget:    +0.30,
    blocks:           +0.20, interceptions:    +0.20, tackles:          +0.20,
    cleanSheet:       +0.50, saves:            +0.40, skillMoves:       +0.20,
    keyPasses:        +0.25,
    shotsOffTarget:   -0.08, bigChancesMissed: -0.06, goalsConceded:    -0.15,
    fouls:            -0.15, yellowCard:       -0.25, redCard:          -1.50,
    ownGoals:         -1.00,
  },
  MF: {
    goals:            +0.75, assists:          +0.45, shotsOnTarget:    +0.20,
    blocks:           +0.25, interceptions:    +0.25, tackles:          +0.25,
    cleanSheet:       +0.18, saves:            +0.40, skillMoves:       +0.20,
    keyPasses:        +0.20,
    shotsOffTarget:   -0.15, bigChancesMissed: -0.15, goalsConceded:    -0.10,
    fouls:            -0.15, yellowCard:       -0.25, redCard:          -1.50,
    ownGoals:         -1.00,
  },
  FW: {
    goals:            +0.65, assists:          +0.45, shotsOnTarget:    +0.12,
    blocks:           +0.26, interceptions:    +0.30, tackles:          +0.28,
    cleanSheet:       +0.08, saves:            +0.40, skillMoves:       +0.20,
    keyPasses:        +0.20,
    shotsOffTarget:   -0.18, bigChancesMissed: -0.25, goalsConceded:    -0.05,
    fouls:            -0.15, yellowCard:       -0.25, redCard:          -1.50,
    ownGoals:         -1.00,
  },
};

// Position the player actually played in a given match. Falls back to their profile
// position for matches recorded before per-match positions existed.
export function getMatchPosition(player, matchStats) {
  return matchStats?.position || player.position;
}

// candidates: [{ id, position, matchRating, matchStats, isCleanSheet }]
// Highest rating wins; ties broken by goals → assists → saves.
export function getManOfTheMatch(candidates) {
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0].id;

  return candidates.reduce((best, curr) => {
    if (curr.matchRating > best.matchRating) return curr;
    if (curr.matchRating < best.matchRating) return best;
    const cg = curr.matchStats?.goals ?? 0, bg = best.matchStats?.goals ?? 0;
    if (cg !== bg) return cg > bg ? curr : best;
    const ca = curr.matchStats?.assists ?? 0, ba = best.matchStats?.assists ?? 0;
    if (ca !== ba) return ca > ba ? curr : best;
    const cs = curr.matchStats?.saves ?? 0, bs = best.matchStats?.saves ?? 0;
    return cs > bs ? curr : best;
  }).id;
}

// A game week counts as camera-recorded unless explicitly flagged otherwise (legacy GWs have no flag).
export const isGWRecorded = (gw) => gw?.isRecorded !== false;

// Stats that are only captured when the game is filmed. In goals-only games they are unknown,
// not zero, so they are ignored — as is goalsConceded, which would otherwise be the only
// defensive stat counted and could never be offset by the tackles/saves nobody logged.
const RECORDED_ONLY_STATS = [
  'saves', 'shotsOnTarget', 'blocks', 'interceptions', 'tackles', 'skillMoves', 'keyPasses',
  'goalsConceded', 'fouls', 'shotsOffTarget', 'bigChancesMissed',
];

// Returns individual match rating on a 0–10 scale.
// Formula: rating = clamp(6.0 + Σ(count × position_weight), 0, 10)
// isRecorded = false (goals-only game): only goals, assists, own goals, cards and clean sheet count.
export function calculateMatchRating(player, matchStats, isCleanSheet, isRecorded = true) {
  const {
    goals = 0, assists = 0, tackles = 0, interceptions = 0, blocks = 0,
    saves = 0, shots = 0, shotsOnTarget = 0, shotsOffTarget = 0, fouls = 0,
    yellowCard = false, redCard = false, goalsConceded = 0,
    skillMoves = 0, bigChancesMissed = 0, ownGoals = 0, keyPasses = 0,
  } = matchStats;

  const weights = MATCH_WEIGHTS[getMatchPosition(player, matchStats)];
  const statMap = {
    goals,
    assists,
    saves,
    shotsOnTarget,
    blocks,
    interceptions,
    tackles,
    cleanSheet:       isCleanSheet ? 1 : 0,
    skillMoves,
    keyPasses,
    goalsConceded,
    fouls,
    shotsOffTarget:   shotsOffTarget || Math.max(0, shots - shotsOnTarget),
    bigChancesMissed,
    yellowCard:       yellowCard ? 1 : 0,
    redCard:          redCard ? 1 : 0,
    ownGoals,
  };
  if (!isRecorded) RECORDED_ONLY_STATS.forEach((stat) => { statMap[stat] = 0; });

  let raw = 6.0;
  for (const [stat, count] of Object.entries(statMap)) {
    if (!count) continue;
    raw += Math.round((weights[stat] ?? 0) * count * 100) / 100;
  }

  return Math.max(0, Math.min(10, Math.round(raw * 100) / 100));
}

// Card delta = how far the match rating beat (or fell short of) what was expected of the player.
// 1.5 × 0.5 = 0.75 card points per match-rating point: beating expectation by 2.0 → +1.5.
// Clamping to card range happens in replaySeason / clampRating().
const DELTA_SCALE = 1.5;
const SMOOTHING_FACTOR = 0.5;

export function calculateRatingDelta(matchRating, expectedMatchRating) {
  return Math.round((matchRating - expectedMatchRating) * DELTA_SCALE * SMOOTHING_FACTOR * 100) / 100;
}

// Each attribute blends 25% toward the newly calculated value from the player's current value.
// This prevents single-game spikes and makes attributes drift gradually toward true season form.
const ATTR_SMOOTH = 0.25;

export function calculateAttributes(seasonStats, currentAttrs = {}) {
  const {
    goals = 0, assists = 0, shots = 0, shotsOnTarget = 0,
    tackles = 0, interceptions = 0, blocks = 0, fouls = 0,
    saves = 0, goalsConceded = 0, goalsConcededAsGK = 0, gamesPlayed = 0,
    skillMoves = 0, bigChancesMissed = 0, keyPasses = 0, sprints = 0,
    recordedGames = gamesPlayed,
  } = seasonStats;

  // Goals, assists and goals conceded are known for every game; everything else only for
  // camera-recorded games, so those are averaged over recorded games (rgp) only.
  const gp = Math.max(gamesPlayed, 1);
  const rgp = Math.max(recordedGames, 1);
  const shotAccuracy = shots > 0 ? shotsOnTarget / shots : 0;
  const missRate     = shots > 0 ? Math.max(0, shots - shotsOnTarget) / shots : 0;

  const smooth = (key, raw) => {
    const current = currentAttrs[key] ?? ATTR_BASE;
    const blended = current + (raw - current) * ATTR_SMOOTH;
    return Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(blended)));
  };

  return {
    pace:       smooth('pace',       ATTR_BASE + (sprints / rgp) * 2),
    finishing:  smooth('finishing',  ATTR_BASE + (goals / gp) * 7 + shotAccuracy * 8 - missRate * 4 - (bigChancesMissed / rgp) * 2),
    dribbling:  smooth('dribbling',  ATTR_BASE + (skillMoves / rgp) * 8),
    passing:    smooth('passing',    ATTR_BASE + (assists / gp) * 8 + (keyPasses / rgp) * 3 + (shotsOnTarget / rgp) * 1.5),
    physical:   smooth('physical',   ATTR_BASE + (tackles / rgp) * 1.5 - (fouls / rgp) * 2),
    defending:  smooth('defending',  ATTR_BASE + (interceptions / rgp) * 1.0 + (tackles / rgp) * 0.7 + (blocks / rgp) * 0.5 - (fouls / rgp) * 1.5 - (goalsConceded / gp) * 1.5),
    gkReflexes: smooth('gkReflexes', ATTR_BASE + (saves / rgp) * 3 - (goalsConcededAsGK / rgp) * 1.5),
  };
}

const isGWCompleted = (gw) => gw.status === 'completed' || gw.completed === true;

// Expected match rating (Elo-style):
//   expected = positionAvg + (ratingBeforeMatch − leagueAvgOverall) × EXPECTATION_SLOPE
// positionAvg is the running average match rating for that position over every game up to and
// including this one, shrunk toward the league average until the position has POSITION_PRIOR_APPS
// appearances (keeps small samples, e.g. GKs, from swinging wildly).
// A slope of 0.05 means a player 20 points above the league average must play 1.0 better to hold steady.
// Recorded and goals-only games keep separate averages, since their match ratings aren't comparable,
// and goals-only games move ratings at half weight because we know less about them.
const EXPECTATION_SLOPE = 0.05;
const POSITION_PRIOR_APPS = 20;
const UNRECORDED_WEIGHT = 0.5;

const EMPTY_TOTALS = () => ({
  goals: 0, assists: 0, tackles: 0, cleanSheets: 0, saves: 0, gamesPlayed: 0, motm: 0,
  shots: 0, shotsOnTarget: 0, shotsOffTarget: 0, interceptions: 0, blocks: 0,
  fouls: 0, goalsConceded: 0, goalsConcededAsGK: 0, skillMoves: 0, bigChancesMissed: 0,
  keyPasses: 0, sprints: 0, recordedGames: 0,
});

function addToTotals(totals, ms, isCS, isMotm, isRecorded) {
  totals.goals += ms.goals || 0;
  totals.assists += ms.assists || 0;
  totals.cleanSheets += isCS ? 1 : 0;
  totals.gamesPlayed += 1;
  totals.motm += isMotm ? 1 : 0;
  totals.goalsConceded += ms.goalsConceded || ms.goalsConcededAsDF || 0;
  if (!isRecorded) return;
  totals.recordedGames += 1;
  totals.tackles += ms.tackles || 0;
  totals.saves += ms.saves || 0;
  totals.shots += ms.shots || 0;
  totals.shotsOnTarget += ms.shotsOnTarget || 0;
  totals.shotsOffTarget += ms.shotsOffTarget || 0;
  totals.interceptions += ms.interceptions || 0;
  totals.blocks += ms.blocks || 0;
  totals.fouls += ms.fouls || 0;
  totals.goalsConcededAsGK += ms.goalsConcededAsGK || 0;
  totals.skillMoves += ms.skillMoves || 0;
  totals.bigChancesMissed += ms.bigChancesMissed || 0;
  totals.keyPasses += ms.keyPasses || 0;
  totals.sprints += ms.sprints || 0;
}

// Replays every completed game week in order for the whole league and rebuilds each player's
// rating, season stats and attributes from their baseRating. Ratings are league-relative, so a
// change to any game week can shift every player's rating — always replay the full set.
// Returns { players: { [id]: { baseRating, rating, attributes, stats } },
//           matches: { [gwId]: { [playerId]: { matchRating, expected, delta } } } }
export function replaySeason(players, gameWeeks) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const running = Object.fromEntries(players.map((p) => [p.id, p.baseRating ?? p.rating]));
  const totals = Object.fromEntries(players.map((p) => [p.id, EMPTY_TOTALS()]));
  const appeared = new Set();
  // Running match-rating averages, kept separately for recorded and goals-only games
  const newLevel = () => ({ posSum: { GK: 0, DF: 0, MF: 0, FW: 0 }, posCount: { GK: 0, DF: 0, MF: 0, FW: 0 }, sum: 0, count: 0 });
  const levels = { recorded: newLevel(), goalsOnly: newLevel() };
  const matches = {};

  const ordered = gameWeeks.filter(isGWCompleted).sort((a, b) =>
    (a.weekNumber - b.weekNumber) || String(a.date).localeCompare(String(b.date)));

  for (const gw of ordered) {
    const isRecorded = isGWRecorded(gw);
    const lvl = levels[isRecorded ? 'recorded' : 'goalsOnly'];
    const weight = isRecorded ? 1 : UNRECORDED_WEIGHT;
    const entries = [];
    for (const [side, opp] of [['teamA', 'teamB'], ['teamB', 'teamA']]) {
      for (const pid of gw[side]?.players || []) {
        const p = byId[pid];
        if (!p) continue;
        const ms = gw.playerStats?.[pid] || {};
        const isCS = +(gw[opp]?.score || 0) === 0;
        entries.push({ pid, ms, isCS, pos: getMatchPosition(p, ms), mr: calculateMatchRating(p, ms, isCS, isRecorded) });
      }
    }

    // Averages include this game week, so each match is judged against the league as it stood then.
    entries.forEach(({ pid, pos, mr }) => {
      lvl.posSum[pos] += mr; lvl.posCount[pos] += 1; lvl.sum += mr; lvl.count += 1;
      appeared.add(pid);
    });
    const leagueAvgMR = lvl.count ? lvl.sum / lvl.count : 6.0;
    const positionAvg = (pos) =>
      (lvl.posSum[pos] + POSITION_PRIOR_APPS * leagueAvgMR) / (lvl.posCount[pos] + POSITION_PRIOR_APPS);
    const leagueAvgOverall = [...appeared].reduce((s, id) => s + running[id], 0) / appeared.size;

    // Deltas are computed from pre-match ratings for everyone, then applied together.
    // Each game week is zero-sum (like Elo): expectations are shifted by the match's mean residual,
    // so the league as a whole can neither inflate nor deflate — only relative performance moves ratings.
    matches[gw.id] = {};
    const rawExpected = entries.map(({ pid, pos }) =>
      positionAvg(pos) + (running[pid] - leagueAvgOverall) * EXPECTATION_SLOPE);
    const meanResidual = entries.length
      ? entries.reduce((s, { mr }, i) => s + (mr - rawExpected[i]), 0) / entries.length
      : 0;
    const deltas = entries.map(({ pid, mr }, i) => {
      const expected = rawExpected[i] + meanResidual;
      const delta = Math.round(calculateRatingDelta(mr, expected) * weight * 100) / 100;
      matches[gw.id][pid] = { matchRating: mr, expected: Math.round(expected * 100) / 100, delta };
      return [pid, delta];
    });
    deltas.forEach(([pid, delta]) => {
      running[pid] = Math.min(MAX_RATING, Math.max(MIN_RATING, running[pid] + delta));
    });
    entries.forEach(({ pid, ms, isCS }) => addToTotals(totals[pid], ms, isCS, gw.motm === pid, isRecorded));
  }

  const result = {};
  for (const p of players) {
    const t = totals[p.id];
    result[p.id] = {
      baseRating: p.baseRating ?? p.rating,
      rating: clampRating(running[p.id]),
      attributes: calculateAttributes(t, p.attributes),
      stats: {
        goals: t.goals, assists: t.assists, tackles: t.tackles,
        cleanSheets: t.cleanSheets, saves: t.saves,
        gamesPlayed: t.gamesPlayed, motm: t.motm,
        shots: t.shots, shotsOffTarget: t.shotsOffTarget,
        skillMoves: t.skillMoves, bigChancesMissed: t.bigChancesMissed,
      },
    };
  }
  return { players: result, matches };
}

export function calculateWinProbability(avgA, avgB) {
  const diff = avgA - avgB;
  const advantage = 0.3 * Math.tanh(diff / 15);
  const draw = Math.max(10, 25 - Math.round(Math.abs(advantage) * 80));
  const remaining = 100 - draw;
  const teamA = Math.round((0.5 + advantage) * remaining);
  const teamB = remaining - teamA;
  return { teamA, draw, teamB };
}

export function getPlayerWinRate(pid, gameWeeks) {
  let w = 0, t = 0;
  gameWeeks.filter(gw => gw.completed).forEach(gw => {
    const inA = gw.teamA.players.includes(pid);
    const inB = gw.teamB.players.includes(pid);
    if (inA || inB) { t++; if ((inA && gw.teamA.score > gw.teamB.score) || (inB && gw.teamB.score > gw.teamA.score)) w++; }
  });
  return t > 0 ? Math.round((w / t) * 100) : 0;
}

export function generateBalancedTeams(pool) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const grouped = { FW: [], MF: [], DF: [], GK: [] };
  shuffled.forEach(p => grouped[p.position]?.push(p));
  const a = [], b = [];
  Object.values(grouped).forEach(pos => {
    for (let i = 0; i < pos.length; i += 2) {
      if (i + 1 < pos.length) {
        if (Math.random() < 0.5) { a.push(pos[i]); b.push(pos[i + 1]); }
        else { b.push(pos[i]); a.push(pos[i + 1]); }
      } else {
        const ar = a.reduce((s, pl) => s + pl.rating, 0);
        const br = b.reduce((s, pl) => s + pl.rating, 0);
        (ar <= br ? a : b).push(pos[i]);
      }
    }
  });
  return { teamA: a, teamB: b };
}
