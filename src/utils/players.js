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

// ── Attributes ──────────────────────────────────────────────────────────────
// Attributes describe *skills*, measured relative to the league, and are rebuilt from scratch on
// every replay (no dependence on previous values, so they're always reproducible).
// Each attribute blends a few components (a per-game rate or a per-shot ratio). Each component uses
// empirical Bayes, so the data decides how much of a player's number is ability vs. luck:
//   talentVar  = spread of raw rates among well-sampled players − spread that chance alone produces
//                (chance for per-game stats = this league's measured game-to-game variation ÷ games;
//                 for per-shot ratios = binomial p(1−p) ÷ attempts)
//   reliability_i = talentVar / (talentVar + chanceVar_i)      (more games → closer to 1)
//   estimate_i = leagueRate + reliability_i × (raw_i − leagueRate)
//   z_i        = (estimate_i − leagueRate) / √talentVar
// Components are blended with signed weights, scaled so 8 points = 1 SD of ability, around 75.
// 75 = league average; ~83 = top ~15%; ~91 = top ~2%; clamped to 50–99.
// Only the player's own actions count — team goals conceded is not individual defending.
const ATTR_SD_POINTS = 8;
const MIN_LEAGUE_EVENTS = 30;    // a per-game stat logged fewer times than this league-wide is too sparse to rate
const QUALIFY_FILMED_GAMES = 3;  // sample needed to help measure the league spread
const QUALIFY_SHOTS_FACED = 5;
const PROVISIONAL_FILMED_GAMES = 4;

// Each component has a signed weight (negative = fewer is better) and is either
//   kind 'rate'  — a per-game value read from each game's stats, over filmed games or all games
//                  (goals/assists are known in every game; everything else only when filmed), or
//   kind 'ratio' — successes / attempts summed from the season totals.
const filmed = (value) => ({ kind: 'rate', scope: 'filmed', value });
const ATTRIBUTE_MODEL = {
  finishing: [
    { kind: 'rate', scope: 'all', value: (ms) => ms.goals || 0, w: 0.35 },
    { kind: 'ratio', get: (t) => [t.attrGoals, t.attrShots], w: 0.35 },             // conversion
    { kind: 'ratio', get: (t) => [t.attrShotsOnTarget, t.attrShots], w: 0.15 },     // accuracy
    { ...filmed((ms) => ms.bigChancesMissed || 0), w: -0.15 },
  ],
  passing: [
    { kind: 'rate', scope: 'all', value: (ms) => ms.assists || 0, w: 0.6 },
    { ...filmed((ms) => ms.keyPasses || 0), w: 0.4 },
  ],
  dribbling: [
    { ...filmed((ms) => ms.skillMoves || 0), w: 1 },
  ],
  defending: [
    { ...filmed((ms) => (ms.interceptions || 0) + (ms.tackles || 0) + (ms.blocks || 0)), w: 0.85 },
    { ...filmed((ms) => ms.fouls || 0), w: -0.15 },
  ],
  physical: [
    { ...filmed((ms) => ms.tackles || 0), w: 0.45 },
    { ...filmed((ms) => ms.blocks || 0), w: 0.35 },
    { ...filmed((ms) => ms.fouls || 0), w: -0.2 },
  ],
  pace: [
    { ...filmed((ms) => ms.sprints || 0), w: 1 },
  ],
  gkReflexes: [
    { kind: 'ratio', get: (t) => [t.keeperSaves, t.keeperSaves + t.keeperConceded], w: 1 }, // save %
  ],
};

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const variance = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
};
const correlation = (xs, ys) => {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
};

// For a per-game component: each player's list of per-game values.
function perGameValues(t, { scope, value }) {
  return (scope === 'all' ? t.gameLog : t.gameLog.filter((g) => g.isRecorded)).map((g) => value(g.ms));
}

// One component → { [id]: z } on the ability scale, or null if it can't separate players
// (too sparse, too few qualified players, or all differences explainable by chance).
function componentScores(ids, totalsById, qualifiedIds, component) {
  let n, raw, league, chanceVar;
  if (component.kind === 'rate') {
    const vals = Object.fromEntries(ids.map((id) => [id, perGameValues(totalsById[id], component)]));
    const sumAll = ids.reduce((s, id) => s + vals[id].reduce((a, v) => a + v, 0), 0);
    const nAll = ids.reduce((s, id) => s + vals[id].length, 0);
    if (!nAll || sumAll < MIN_LEAGUE_EVENTS) return null;
    league = sumAll / nAll;
    // Game-to-game variation within players, pooled across the league (one-way ANOVA within-group variance)
    let ss = 0, dof = 0;
    ids.forEach((id) => {
      const v = vals[id];
      if (v.length < 2) return;
      const m = mean(v);
      ss += v.reduce((a, x) => a + (x - m) ** 2, 0);
      dof += v.length - 1;
    });
    const withinVar = dof > 0 ? ss / dof : league; // fallback: Poisson
    n = (id) => vals[id].length;
    raw = (id) => (vals[id].length ? mean(vals[id]) : league);
    chanceVar = (id) => (n(id) > 0 ? withinVar / n(id) : Infinity);
  } else {
    const pairs = Object.fromEntries(ids.map((id) => [id, component.get(totalsById[id])]));
    const sumNum = ids.reduce((s, id) => s + pairs[id][0], 0);
    const sumDen = ids.reduce((s, id) => s + pairs[id][1], 0);
    if (sumDen <= 0) return null;
    league = sumNum / sumDen;
    n = (id) => pairs[id][1];
    raw = (id) => (pairs[id][1] > 0 ? pairs[id][0] / pairs[id][1] : league);
    chanceVar = (id) => (n(id) > 0 ? (league * (1 - league)) / n(id) : Infinity);
  }
  if (qualifiedIds.length < 3) return null;
  const talentVar = variance(qualifiedIds.map(raw)) - mean(qualifiedIds.map(chanceVar));
  if (!(talentVar > 1e-12)) return null;
  const talentSd = Math.sqrt(talentVar);
  return Object.fromEntries(ids.map((id) => {
    const reliability = talentVar / (talentVar + chanceVar(id)); // 0 when no sample
    return [id, (reliability * (raw(id) - league)) / talentSd];
  }));
}

// totalsById: { [playerId]: season totals from replaySeason }
// Returns { [playerId]: { attributes, attributeMeta } }
export function calculateLeagueAttributes(totalsById) {
  const ids = Object.keys(totalsById);
  const untracked = [];
  const isQualified = {
    default: (t) => t.recordedGames >= QUALIFY_FILMED_GAMES,
    gkReflexes: (t) => t.keeperSaves + t.keeperConceded >= QUALIFY_SHOTS_FACED,
  };

  const attrValues = {};
  for (const [attr, components] of Object.entries(ATTRIBUTE_MODEL)) {
    const qualifiedIds = ids.filter((id) => (isQualified[attr] || isQualified.default)(totalsById[id]));
    const used = components
      .map((c) => ({ w: c.w, z: componentScores(ids, totalsById, qualifiedIds, c) }))
      .filter((c) => c.z);
    if (!used.length) {
      untracked.push(attr);
      attrValues[attr] = Object.fromEntries(ids.map((id) => [id, ATTR_BASE]));
      continue;
    }
    // Blend, then divide by the blend's own ability SD: √(Σᵢ Σⱼ wᵢ wⱼ ρᵢⱼ), with ρ measured among
    // qualified players — so every attribute uses the same 8-points-per-SD scale.
    const blendVar = used.reduce((s, a) => s + used.reduce((t, b) => t + a.w * b.w * (a === b ? 1
      : correlation(qualifiedIds.map((id) => a.z[id]), qualifiedIds.map((id) => b.z[id]))), 0), 0);
    const blendSd = Math.sqrt(Math.max(blendVar, 1e-12));
    attrValues[attr] = Object.fromEntries(ids.map((id) => {
      const blend = used.reduce((s, c) => s + c.w * c.z[id], 0) / blendSd;
      return [id, clampRating(ATTR_BASE + blend * ATTR_SD_POINTS)];
    }));
  }

  return Object.fromEntries(ids.map((id) => {
    const t = totalsById[id];
    const shotsFaced = t.keeperSaves + t.keeperConceded;
    const attributes = Object.fromEntries(Object.keys(ATTRIBUTE_MODEL).map((attr) => [attr, attrValues[attr][id]]));
    if (shotsFaced === 0) attributes.gkReflexes = ATTR_BASE;
    return [id, {
      attributes,
      attributeMeta: {
        gamesPlayed: t.gamesPlayed,
        filmedGames: t.recordedGames,
        shotsFaced,
        untracked,
        provisional: t.recordedGames < PROVISIONAL_FILMED_GAMES,
      },
    }];
  }));
}

// UI helper: whether an attribute value is backed by data for this player.
// 'ok' | 'not-tracked' (not enough league-wide data to rate anyone yet) | 'no-data' (player has no sample)
// Finishing and passing include goals/assists, known for every game; the rest need filmed games.
const ATTRS_FROM_ALL_GAMES = ['finishing', 'passing'];
export function getAttributeStatus(player, attr) {
  const meta = player.attributeMeta;
  if (!meta) return 'ok'; // legacy docs from before attribute metadata existed
  if (meta.untracked?.includes(attr)) return 'not-tracked';
  if (attr === 'gkReflexes') return meta.shotsFaced > 0 ? 'ok' : 'no-data';
  if (ATTRS_FROM_ALL_GAMES.includes(attr)) return meta.gamesPlayed > 0 ? 'ok' : 'no-data';
  return meta.filmedGames > 0 ? 'ok' : 'no-data';
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
  // Attribute-only inputs (filmed games): shots with goals counted as on target, time in goal
  attrGoals: 0, attrShots: 0, attrShotsOnTarget: 0, keeperSaves: 0, keeperConceded: 0,
  gameLog: [], // [{ ms, isRecorded }] — per-game values for the attribute model
});

function addToTotals(totals, ms, isCS, isMotm, isRecorded, position) {
  totals.gameLog.push({ ms, isRecorded });
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

  // A goal is always a shot on target, even if it wasn't also entered as one.
  const goals = ms.goals || 0;
  const sot = Math.max(ms.shotsOnTarget || 0, goals);
  const shots = Math.max((ms.shotsOnTarget || 0) + (ms.shotsOffTarget || 0), ms.shots || 0, sot);
  totals.attrGoals += goals;
  totals.attrShots += shots;
  totals.attrShotsOnTarget += sot;

  // Keepers rotate, so time in goal is any game with saves or goals conceded in goal. A stint only
  // counts when goals conceded in goal is actually known: entered as "conceded as GK", the match
  // keeper (falls back to the team total), or a clean sheet. Outfielders with saves but a blank
  // "conceded as GK" are skipped — treating blank as 0 would make them look perfect.
  const saves = ms.saves || 0;
  const gck = ms.goalsConcededAsGK || 0;
  const teamConceded = ms.goalsConceded || 0;
  if (saves > 0 || gck > 0 || position === 'GK') {
    let conceded = null;
    if (gck > 0) conceded = gck;
    else if (position === 'GK' || teamConceded === 0) conceded = teamConceded;
    if (conceded !== null) {
      totals.keeperSaves += saves;
      totals.keeperConceded += conceded;
    }
  }
}

// Replays every completed game week in order for the whole league and rebuilds each player's
// rating, season stats and attributes from their baseRating. Ratings are league-relative, so a
// change to any game week can shift every player's rating — always replay the full set.
// Returns { players: { [id]: { baseRating, rating, attributes, attributeMeta, stats } },
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
    entries.forEach(({ pid, ms, isCS, pos }) => addToTotals(totals[pid], ms, isCS, gw.motm === pid, isRecorded, pos));
  }

  const leagueAttributes = calculateLeagueAttributes(totals);
  const result = {};
  for (const p of players) {
    const t = totals[p.id];
    result[p.id] = {
      baseRating: p.baseRating ?? p.rating,
      rating: clampRating(running[p.id]),
      ...leagueAttributes[p.id],
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

// Per-player season averages of match rating and expected match rating (the bar each match was
// judged against in replaySeason), over the same matches. Goals-only games are weighted the same way
// they count toward the overall rating (UNRECORDED_WEIGHT), so avgMatchRating − avgExpected moves in
// line with the overall rating. Values are null for players with no games.
// Returns { [playerId]: { avgMatchRating, avgExpected, games } }
export function getRatingSummaries(players, gameWeeks) {
  const { matches } = replaySeason(players, gameWeeks);
  const acc = Object.fromEntries(players.map((p) => [p.id, { mr: 0, exp: 0, w: 0, games: 0 }]));
  gameWeeks.filter(isGWCompleted).forEach((gw) => {
    const weight = isGWRecorded(gw) ? 1 : UNRECORDED_WEIGHT;
    Object.entries(matches[gw.id] || {}).forEach(([pid, m]) => {
      if (!acc[pid]) return;
      acc[pid].mr += m.matchRating * weight; acc[pid].exp += m.expected * weight;
      acc[pid].w += weight; acc[pid].games += 1;
    });
  });
  const round = (v) => Math.round(v * 100) / 100;
  return Object.fromEntries(Object.entries(acc).map(([pid, { mr, exp, w, games }]) => [pid, {
    avgMatchRating: games ? round(mr / w) : null,
    avgExpected: games ? round(exp / w) : null,
    games,
  }]));
}

export function getMatchRatingColor(r) {
  if (r >= 8) return '#22c55e';
  if (r >= 6.5) return '#eab308';
  return '#ef4444';
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
