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

// Inverse-expectation weight matrix — stat keys map to per-position weights.
// Our position codes: GK, DF, MF, FW (matching the rest of the codebase).
const MATCH_WEIGHTS = {
  goals:          { GK:  1.10, DF:  0.90, MF:  0.80, FW:  0.75 },
  assists:        { GK:  0.55, DF:  0.60, MF:  0.50, FW:  0.45 },
  saves:          { GK:  0.40, DF:  0.40, MF:  0.40, FW:  0.40 }, // flat — sunday league GK rotation
  shotsOnTarget:  { GK:  0.30, DF:  0.25, MF:  0.20, FW:  0.18 },
  blocks:         { GK:  0.25, DF:  0.30, MF:  0.20, FW:  0.10 },
  interceptions:  { GK:  0.25, DF:  0.30, MF:  0.25, FW:  0.10 },
  tackles:        { GK:  0.25, DF:  0.25, MF:  0.25, FW:  0.15 },
  cleanSheet:     { GK:  0.75, DF:  0.50, MF:  0.15, FW:  0.00 },
  goalsConceded:  { GK: -0.20, DF: -0.15, MF: -0.10, FW: -0.05 },
  fouls:          { GK: -0.20, DF: -0.15, MF: -0.15, FW: -0.15 },
  shotsOffTarget: { GK: -0.05, DF: -0.05, MF: -0.10, FW: -0.15 },
  yellowCard:     { GK: -0.40, DF: -0.30, MF: -0.30, FW: -0.30 },
  redCard:        { GK: -1.50, DF: -1.50, MF: -1.50, FW: -1.50 },
};

// candidates: [{ id, position, matchRating, matchStats, isCleanSheet }]
// 4-step waterfall — returns the MOTM player id
export function getManOfTheMatch(candidates) {
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0].id;

  const scored = candidates.map((c) => {
    const pos = c.position;
    const ms = c.matchStats;
    const statMap = { ...ms, cleanSheet: c.isCleanSheet ? 1 : 0 };

    // Step 2: big moments — goals weighted 2×, assists 1×
    const bigMoments = (ms.goals || 0) * 2 + (ms.assists || 0);

    // Step 3: count of distinct positive stat types this player contributed
    const positiveTypes = Object.entries(MATCH_WEIGHTS).filter(([stat, weights]) => {
      return (weights[pos] ?? 0) > 0 && (Number(statMap[stat]) || 0) > 0;
    }).length;

    // Step 4: sum of all positive deltas from the weight matrix
    const positiveDeltaSum = Object.entries(MATCH_WEIGHTS).reduce((sum, [stat, weights]) => {
      const weight = weights[pos] ?? 0;
      const delta = Math.round(weight * (Number(statMap[stat]) || 0) * 100) / 100;
      return delta > 0 ? sum + delta : sum;
    }, 0);

    return { ...c, bigMoments, positiveTypes, positiveDeltaSum };
  });

  scored.sort((a, b) => {
    // Step 1: highest match rating — outright winner if gap > 0.1
    const ratingDiff = b.matchRating - a.matchRating;
    if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
    // Step 2: big moments (goals × 2 + assists)
    if (b.bigMoments !== a.bigMoments) return b.bigMoments - a.bigMoments;
    // Step 3: most distinct positive stat types
    if (b.positiveTypes !== a.positiveTypes) return b.positiveTypes - a.positiveTypes;
    // Step 4: highest total positive impact
    return b.positiveDeltaSum - a.positiveDeltaSum;
  });

  return scored[0].id;
}

// Returns individual match rating on a 0–10 scale.
// Formula: rating = clamp(6.0 + Σ(count × position_weight), 0, 10)
export function calculateMatchRating(player, matchStats, isCleanSheet) {
  const {
    goals = 0, assists = 0, tackles = 0, interceptions = 0, blocks = 0,
    saves = 0, shots = 0, shotsOnTarget = 0, fouls = 0,
    yellowCard = false, redCard = false, goalsConceded = 0,
  } = matchStats;

  const pos = player.position;
  const statMap = {
    goals,
    assists,
    saves,
    shotsOnTarget,
    blocks,
    interceptions,
    tackles,
    cleanSheet:     isCleanSheet ? 1 : 0,
    goalsConceded,
    fouls,
    shotsOffTarget: Math.max(0, shots - shotsOnTarget),
    yellowCard:     yellowCard ? 1 : 0,
    redCard:        redCard ? 1 : 0,
  };

  let raw = 6.0;
  for (const [stat, count] of Object.entries(statMap)) {
    if (!count) continue;
    const weight = MATCH_WEIGHTS[stat]?.[pos] ?? 0;
    raw += Math.round(weight * count * 100) / 100;
  }

  return Math.max(0, Math.min(10, Math.round(raw * 100) / 100));
}

// Card delta derived directly from match rating distance from 6.0 baseline.
// Scaling factor of 1.5: MOTM (~9.0) → +4.5, average (6.0) → 0, shocker (~4.0) → -3.0.
// Clamping to card range happens at the call site via clampRating().
const DELTA_SCALE = 1.5;

export function calculateRatingDelta(player, matchStats, isCleanSheet) {
  const matchRating = calculateMatchRating(player, matchStats, isCleanSheet);
  return Math.round((matchRating - 6.0) * DELTA_SCALE * 100) / 100;
}

// Derives all 7 attributes from per-game rates across the season.
// Pace and Dribbling are static at ATTR_BASE until a specific mechanic is defined.
export function calculateAttributes(seasonStats) {
  const {
    goals = 0, assists = 0, shots = 0, shotsOnTarget = 0,
    tackles = 0, interceptions = 0, blocks = 0, fouls = 0,
    saves = 0, goalsConceded = 0, gamesPlayed = 0,
  } = seasonStats;

  const gp = Math.max(gamesPlayed, 1);
  const shotAccuracy = shots > 0 ? shotsOnTarget / shots : 0;
  const missRate     = shots > 0 ? Math.max(0, shots - shotsOnTarget) / shots : 0;
  const clamp = (v) => Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(v)));

  return {
    pace:       ATTR_BASE,
    finishing:  clamp(ATTR_BASE + (goals / gp) * 5  + shotAccuracy * 8 - missRate * 4),
    dribbling:  ATTR_BASE,
    passing:    clamp(ATTR_BASE + (assists / gp) * 8),
    physical:   clamp(ATTR_BASE + (tackles / gp) * 1.5 - (fouls / gp) * 2),
    defending:  clamp(ATTR_BASE + (interceptions / gp) * 1.0 + (tackles / gp) * 0.7 + (blocks / gp) * 0.5 - (fouls / gp) * 1.5),
    gkReflexes: clamp(ATTR_BASE + (saves / gp) * 2  - (goalsConceded / gp) * 2),
  };
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
