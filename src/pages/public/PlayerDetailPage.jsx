import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { POS_COLORS, POSITIONS } from '@/data/constants';
import { getRatingColor, getRatingLabel, getPlayerWinRate } from '@/utils/players';
import { ATTR_LABELS, ATTR_BASE } from '@/data/constants';
import { ProgressBar } from '@/components/ui/SharedUI';
import PlayerRadarChart from '@/components/charts/PlayerRadarChart';
import { IconArrowLeft } from '@/components/ui/Icons';

const gwCompleted = (gw) => gw.status === 'completed' || gw.completed === true;

export default function PlayerDetailPage() {
  const { selectedPlayer: p, setPage, gameWeeks } = useStore();
  if (!p) return null;

  const posColor = POS_COLORS[p.position];
  const winRate = useMemo(() => getPlayerWinRate(p.id, gameWeeks), [gameWeeks, p.id]);

  const gwStats = useMemo(() => {
    const totals = { shots: 0, shotsOnTarget: 0, shotsOffTarget: 0, interceptions: 0, blocks: 0, fouls: 0, goalsConceded: 0, goalsConcededAsGK: 0, yellowCard: 0, redCard: 0, skillMoves: 0, bigChancesMissed: 0 };
    gameWeeks.filter(gwCompleted).forEach((gw) => {
      const ps = gw.playerStats?.[p.id];
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
    });
    return totals;
  }, [gameWeeks, p.id]);

  const quickStats = [
    { l: 'Games', v: p.stats.gamesPlayed },
    { l: 'MOTM', v: p.stats.motm },
    { l: 'Win Rate', v: `${winRate}%` },
    { l: p.position === 'GK' ? 'Saves' : 'Goals', v: p.position === 'GK' ? p.stats.saves : p.stats.goals },
  ];

  const seasonStats = [
    { l: 'Goals', v: p.stats.goals, c: '#ef4444' },
    { l: 'Assists', v: p.stats.assists, c: '#3b82f6' },
    { l: 'Shots', v: gwStats.shots, c: '#ec4899' },
    { l: 'Shots on Target', v: gwStats.shotsOnTarget, c: '#f97316' },
    { l: 'Shots off Target', v: gwStats.shotsOffTarget, c: '#fb923c' },
    { l: 'Skill Moves', v: gwStats.skillMoves, c: '#a78bfa' },
    { l: 'Big Chances Missed', v: gwStats.bigChancesMissed, c: '#f43f5e' },
    { l: 'Clean Sheets', v: p.stats.cleanSheets, c: '#22c55e' },
    { l: 'Tackles', v: p.stats.tackles, c: '#f59e0b' },
    { l: 'Interceptions', v: gwStats.interceptions, c: '#06b6d4' },
    { l: 'Blocks', v: gwStats.blocks, c: '#8b5cf6' },
    { l: 'Saves', v: p.stats.saves, c: '#6366f1' },
    { l: 'Goals Conceded', v: gwStats.goalsConceded, c: '#f43f5e' },
    { l: 'GK Goals Conceded', v: gwStats.goalsConcededAsGK, c: '#f43f5e' },
    { l: 'Fouls', v: gwStats.fouls, c: '#94a3b8' },
    { l: 'Yellow Cards', v: gwStats.yellowCard, c: '#eab308' },
    { l: 'Red Cards', v: gwStats.redCard, c: '#ef4444' },
  ];

  return (
    <div>
      <button onClick={() => setPage('players')}
        className="flex items-center gap-2 text-gpl-muted hover:text-gpl-secondary mb-6 text-sm font-medium transition-colors">
        <IconArrowLeft className="w-4 h-4" /> Back to Players
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="gpl-card p-6 text-center" style={{ background: `linear-gradient(160deg, ${posColor}12, transparent)` }}>
            <div className="text-6xl font-black text-gpl mb-2">{p.rating}</div>
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: getRatingColor(p.rating) }}>
              {getRatingLabel(p.rating)}
            </div>
            <h2 className="text-2xl font-bold text-gpl mb-2">{p.name}</h2>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: posColor }}>
              {POSITIONS[p.position]}
            </span>

            {p.playstyles.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {p.playstyles.map((ps) => (
                  <span key={ps} className="text-[10px] px-2.5 py-1 rounded-full font-medium border border-gpl" style={{ color: posColor }}>{ps}</span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6">
              {quickStats.map((s) => (
                <div key={s.l} className="p-3 rounded-xl bg-gpl-inset">
                  <div className="text-xl font-bold text-gpl">{s.v}</div>
                  <div className="text-[10px] text-gpl-muted uppercase">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="gpl-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gpl-muted mb-4">Attributes</h3>
            <PlayerRadarChart player={p} />
          </div>

          <div className="gpl-card p-6 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gpl-muted mb-4">Attribute Breakdown</h3>
            {Object.entries(p.attributes).map(([attr, val]) => {
              const diff = val - ATTR_BASE;
              return (
                <div key={attr} className="flex items-center gap-2">
                  <div className="flex-1">
                    <ProgressBar label={ATTR_LABELS[attr] || attr} value={val} color={posColor} />
                  </div>
                  <div className="w-14 text-right shrink-0">
                    {diff > 0 && <span className="text-xs font-bold text-emerald-500">▲ +{diff}</span>}
                    {diff < 0 && <span className="text-xs font-bold text-red-400">▼ {diff}</span>}
                    {diff === 0 && <span className="text-xs text-gpl-muted">—</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="gpl-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gpl-muted mb-4">Season Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {seasonStats.map((s) => (
                <div key={s.l} className="p-4 rounded-xl bg-gpl-inset text-center">
                  <div className="text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
                  <div className="text-[10px] text-gpl-muted uppercase mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
