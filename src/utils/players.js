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
    shotsOffTarget:   -0.05, bigChancesMissed: -0.03, goalsConceded:    -0.28,
    fouls:            -0.28, yellowCard:       -0.45, redCard:          -1.50,
  },
  DF: {
    goals:            +0.90, assists:          +0.60, shotsOnTarget:    +0.30,
    blocks:           +0.20, interceptions:    +0.20, tackles:          +0.20,
    cleanSheet:       +0.50, saves:            +0.40, skillMoves:       +0.20,
    shotsOffTarget:   -0.08, bigChancesMissed: -0.06, goalsConceded:    -0.18,
    fouls:            -0.20, yellowCard:       -0.35, redCard:          -1.50,
  },
  MF: {
    goals:            +0.75, assists:          +0.50, shotsOnTarget:    +0.20,
    blocks:           +0.32, interceptions:    +0.30, tackles:          +0.28,
    cleanSheet:       +0.18, saves:            +0.40, skillMoves:       +0.20,
    shotsOffTarget:   -0.12, bigChancesMissed: -0.15, goalsConceded:    -0.08,
    fouls:            -0.15, yellowCard:       -0.28, redCard:          -1.50,
  },
  FW: {
    goals:            +0.65, assists:          +0.45, shotsOnTarget:    +0.12,
    blocks:           +0.50, interceptions:    +0.48, tackles:          +0.42,
    cleanSheet:       +0.08, saves:            +0.40, skillMoves:       +0.20,
    shotsOffTarget:   -0.18, bigChancesMissed: -0.30, goalsConceded:    -0.03,
    fouls:            -0.10, yellowCard:       -0.22, redCard:          -1.50,
  },
};

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

// Returns individual match rating on a 0–10 scale.
// Formula: rating = clamp(6.0 + Σ(count × position_weight), 0, 10)
export function calculateMatchRating(player, matchStats, isCleanSheet) {
  const {
    goals = 0, assists = 0, tackles = 0, interceptions = 0, blocks = 0,
    saves = 0, shots = 0, shotsOnTarget = 0, shotsOffTarget = 0, fouls = 0,
    yellowCard = false, redCard = false, goalsConceded = 0,
    skillMoves = 0, bigChancesMissed = 0,
  } = matchStats;

  const pos = player.position;
  const weights = MATCH_WEIGHTS[pos];
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
    goalsConceded,
    fouls,
    shotsOffTarget:   shotsOffTarget || Math.max(0, shots - shotsOnTarget),
    bigChancesMissed,
    yellowCard:       yellowCard ? 1 : 0,
    redCard:          redCard ? 1 : 0,
  };

  let raw = 6.0;
  for (const [stat, count] of Object.entries(statMap)) {
    if (!count) continue;
    raw += Math.round((weights[stat] ?? 0) * count * 100) / 100;
  }

  return Math.max(0, Math.min(10, Math.round(raw * 100) / 100));
}

// Card delta derived directly from match rating distance from 6.0 baseline.
// Scaling factor of 1.5: MOTM (~9.0) → +4.5, average (6.0) → 0, shocker (~4.0) → -3.0.
// Clamping to card range happens at the call site via clampRating().
const DELTA_SCALE = 1.5;
const SMOOTHING_FACTOR = 0.35;

export function calculateRatingDelta(player, matchStats, isCleanSheet) {
  const matchRating = calculateMatchRating(player, matchStats, isCleanSheet);
  return Math.round((matchRating - 6.0) * DELTA_SCALE * SMOOTHING_FACTOR * 100) / 100;
}

// Each attribute blends 25% toward the newly calculated value from the player's current value.
// This prevents single-game spikes and makes attributes drift gradually toward true season form.
const ATTR_SMOOTH = 0.25;

export function calculateAttributes(seasonStats, currentAttrs = {}) {
  const {
    goals = 0, assists = 0, shots = 0, shotsOnTarget = 0,
    tackles = 0, interceptions = 0, blocks = 0, fouls = 0,
    saves = 0, goalsConceded = 0, gamesPlayed = 0,
    skillMoves = 0, bigChancesMissed = 0,
  } = seasonStats;

  const gp = Math.max(gamesPlayed, 1);
  const shotAccuracy = shots > 0 ? shotsOnTarget / shots : 0;
  const missRate     = shots > 0 ? Math.max(0, shots - shotsOnTarget) / shots : 0;

  const smooth = (key, raw) => {
    const current = currentAttrs[key] ?? ATTR_BASE;
    const blended = current + (raw - current) * ATTR_SMOOTH;
    return Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(blended)));
  };

  return {
    pace:       ATTR_BASE,
    finishing:  smooth('finishing',  ATTR_BASE + (goals / gp) * 7 + shotAccuracy * 8 - missRate * 4 - (bigChancesMissed / gp) * 2),
    dribbling:  smooth('dribbling',  ATTR_BASE + (skillMoves / gp) * 8),
    passing:    smooth('passing',    ATTR_BASE + (assists / gp) * 8 + (shotsOnTarget / gp) * 1.5),
    physical:   smooth('physical',   ATTR_BASE + (tackles / gp) * 1.5 - (fouls / gp) * 2),
    defending:  smooth('defending',  ATTR_BASE + (interceptions / gp) * 1.0 + (tackles / gp) * 0.7 + (blocks / gp) * 0.5 - (fouls / gp) * 1.5),
    gkReflexes: smooth('gkReflexes', ATTR_BASE + (saves / gp) * 3 - (goalsConceded / gp) * 1.5),
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
