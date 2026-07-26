import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { POS_COLORS, POSITIONS } from '@/data/constants';
import { getRatingColor, getRatingLabel, getPlayerWinRate } from '@/utils/players';
import { ATTR_LABELS } from '@/data/constants';

const SPECIAL_PLAYER_ID = 'p1777923767043';

function win(a, b) {
  if (a > b) return 'a';
  if (b > a) return 'b';
  return 'draw';
}

function CompareRow({ label, valA, valB, suffix = '', isHigherBetter = true }) {
  const result = isHigherBetter ? win(valA, valB) : win(valB, valA);
  return (
    <div className="flex items-center gap-3 py-2.5 border-t border-gpl-border first:border-0">
      <span className={`w-14 text-right text-sm font-bold tabular-nums ${result === 'a' ? 'text-gpl' : 'text-gpl-muted'}`}>
        {valA}{suffix}
        {result === 'a' && <span className="ml-1 text-emerald-500 text-xs">▲</span>}
      </span>
      <span className="text-xs text-gpl-muted flex-1 text-center whitespace-nowrap">{label}</span>
      <span className={`w-14 text-left text-sm font-bold tabular-nums ${result === 'b' ? 'text-gpl' : 'text-gpl-muted'}`}>
        {result === 'b' && <span className="mr-1 text-emerald-500 text-xs">▲</span>}
        {valB}{suffix}
      </span>
    </div>
  );
}

function PlayerHeader({ player, posColor }) {
  return (
    <div className="text-center p-5 rounded-2xl" style={{ background: `linear-gradient(160deg, ${posColor}18, transparent)` }}>
      <div className="text-5xl font-black mb-1" style={{ color: posColor }}>{ SPECIAL_PLAYER_ID === player.id ? 100 : player.rating}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: getRatingColor(player.rating) }}>
        {getRatingLabel(player.rating)}
      </div>
      <div className="text-lg font-bold text-gpl truncate">{player.name}</div>
      <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: posColor }}>
        {POSITIONS[player.position]}
      </span>
      {player.playstyles?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-3">
          {player.playstyles.map((ps) => (
            <span key={ps} className="text-[9px] px-2 py-0.5 rounded-full border font-medium" style={{ color: posColor, borderColor: `${posColor}50` }}>{ps}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const gwCompleted = (gw) => gw.status === 'completed' || gw.completed === true;

function aggregateGWStats(pid, gameWeeks) {
  const totals = { shots: 0, shotsOnTarget: 0, shotsOffTarget: 0, interceptions: 0, blocks: 0, fouls: 0, goalsConceded: 0, goalsConcededAsGK: 0, yellowCard: 0, redCard: 0, skillMoves: 0, bigChancesMissed: 0, keyPasses: 0 };
  gameWeeks.filter(gwCompleted).forEach((gw) => {
    const ps = gw.playerStats?.[pid];
    if (!ps) return;
    totals.shots += ps.shots || 0;
    totals.shotsOnTarget += ps.shotsOnTarget || 0;
    totals.shotsOffTarget += ps.shotsOffTarget || Math.max(0, (ps.shots || 0) - (ps.shotsOnTarget || 0));
    totals.interceptions += ps.interceptions || 0;
    totals.blocks += ps.blocks || 0;
    totals.fouls += ps.fouls || 0;
    totals.goalsConceded += ps.goalsConceded || ps.goalsConcededAsDF || 0;
    totals.goalsConcededAsGK += ps.goalsConcededAsGK || 0;
    totals.yellowCard += ps.yellowCard ? 1 : 0;
    totals.redCard += ps.redCard ? 1 : 0;
    totals.skillMoves += ps.skillMoves || 0;
    totals.bigChancesMissed += ps.bigChancesMissed || 0;
    totals.keyPasses += ps.keyPasses || 0;
  });
  return totals;
}

export default function PlayerComparePage() {
  const { players, gameWeeks } = useStore();
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');

  const pA = players.find((p) => p.id === idA) || null;
  const pB = players.find((p) => p.id === idB) || null;

  const winRateA = useMemo(() => pA ? getPlayerWinRate(pA.id, gameWeeks) : 0, [pA, gameWeeks]);
  const winRateB = useMemo(() => pB ? getPlayerWinRate(pB.id, gameWeeks) : 0, [pB, gameWeeks]);

  const gwStatsA = useMemo(() => pA ? aggregateGWStats(pA.id, gameWeeks) : {}, [pA, gameWeeks]);
  const gwStatsB = useMemo(() => pB ? aggregateGWStats(pB.id, gameWeeks) : {}, [pB, gameWeeks]);

  const colorA = pA ? POS_COLORS[pA.position] : '#3b82f6';
  const colorB = pB ? POS_COLORS[pB.position] : '#ef4444';

  const attrs = ['pace', 'finishing', 'dribbling', 'passing', 'physical', 'defending', 'gkReflexes'];

  const playerStats = [
    { key: 'goals', label: 'Goals' },
    { key: 'assists', label: 'Assists' },
    { key: 'cleanSheets', label: 'Clean Sheets' },
    { key: 'tackles', label: 'Tackles' },
    { key: 'saves', label: 'Saves' },
    { key: 'motm', label: 'Man of the Match' },
    { key: 'gamesPlayed', label: 'Games Played' },
  ];

  const gwStats = [
    { key: 'keyPasses', label: 'Key Passes' },
    { key: 'shots', label: 'Shots' },
    { key: 'shotsOnTarget', label: 'Shots on Target' },
    { key: 'shotsOffTarget', label: 'Shots off Target', isHigherBetter: false },
    { key: 'skillMoves', label: 'Skill Moves' },
    { key: 'bigChancesMissed', label: 'Big Chances Missed', isHigherBetter: false },
    { key: 'interceptions', label: 'Interceptions' },
    { key: 'blocks', label: 'Blocks' },
    { key: 'goalsConceded', label: 'Goals Conceded', isHigherBetter: false },
    { key: 'goalsConcededAsGK', label: 'GK Goals Conceded', isHigherBetter: false },
    { key: 'fouls', label: 'Fouls', isHigherBetter: false },
    { key: 'yellowCard', label: 'Yellow Cards', isHigherBetter: false },
    { key: 'redCard', label: 'Red Cards', isHigherBetter: false },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Compare Players</h1>
        <p className="text-gpl-muted text-sm">Select two players to compare side by side</p>
      </div>

      {/* Player selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gpl-muted block mb-2">Player A</label>
          <select value={idA} onChange={(e) => setIdA(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm">
            <option value="">Select player...</option>
            {players.filter((p) => p.id !== idB).map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.position} — { SPECIAL_PLAYER_ID === p.id ? 100 : p.rating})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gpl-muted block mb-2">Player B</label>
          <select value={idB} onChange={(e) => setIdB(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm">
            <option value="">Select player...</option>
            {players.filter((p) => p.id !== idA).map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.position} — { SPECIAL_PLAYER_ID === p.id ? 100 : p.rating})</option>
            ))}
          </select>
        </div>
      </div>

      {pA && pB ? (
        <div className="space-y-6">
          {/* Player headers */}
          <div className="grid grid-cols-2 gap-4">
            <PlayerHeader player={pA} posColor={colorA} />
            <PlayerHeader player={pB} posColor={colorB} />
          </div>

          {/* Overall rating comparison */}
          <div className="gpl-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-3 text-center">Overall</h3>
            <CompareRow label="Rating" valA={SPECIAL_PLAYER_ID === pA.id ? 100 : pA.rating} valB={SPECIAL_PLAYER_ID === pB.id ? 100 : pB.rating} />
            <CompareRow label="Win Rate" valA={winRateA} valB={winRateB} suffix="%" />
          </div>

          {/* Attributes */}
          <div className="gpl-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-3 text-center">Attributes</h3>
            {attrs.map((a) => (
              <CompareRow key={a} label={ATTR_LABELS[a] || a} valA={pA.attributes[a] ?? 0} valB={pB.attributes[a] ?? 0} />
            ))}
          </div>

          {/* Season stats */}
          <div className="gpl-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-3 text-center">Season Stats</h3>
            {playerStats.map((s) => (
              <CompareRow key={s.key} label={s.label} valA={pA.stats[s.key] ?? 0} valB={pB.stats[s.key] ?? 0} isHigherBetter={s.isHigherBetter !== false} />
            ))}
            {gwStats.map((s) => (
              <CompareRow key={s.key} label={s.label} valA={gwStatsA[s.key] ?? 0} valB={gwStatsB[s.key] ?? 0} isHigherBetter={s.isHigherBetter !== false} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-24 text-gpl-muted text-sm">
          {!pA && !pB ? 'Select two players above to start comparing.' : 'Now select a second player.'}
        </div>
      )}
    </div>
  );
}
