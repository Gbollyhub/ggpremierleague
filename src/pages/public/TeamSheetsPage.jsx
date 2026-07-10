import { useStore } from '@/store/useStore';
import FormationDisplay from '@/components/cards/FormationDisplay';
import { calculateWinProbability } from '@/utils/players';

const gwCompleted = (gw) => gw.status === 'completed' || gw.completed === true;

function WinProbabilityBar({ teamA, draw, teamB }) {
  return (
    <div className="gpl-card p-5 sm:p-6 mb-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-4">Win Probability</h3>
      <div className="flex rounded-xl overflow-hidden h-8 mb-3">
        <div className="flex items-center justify-center text-xs font-bold text-white transition-all" style={{ width: `${teamA}%`, background: '#ef4444' }}>
          {teamA >= 12 ? `${teamA}%` : ''}
        </div>
        <div className="flex items-center justify-center text-xs font-bold text-white transition-all" style={{ width: `${draw}%`, background: '#6b7280' }}>
          {draw >= 12 ? `${draw}%` : ''}
        </div>
        <div className="flex items-center justify-center text-xs font-bold text-white transition-all" style={{ width: `${teamB}%`, background: '#3b82f6' }}>
          {teamB >= 12 ? `${teamB}%` : ''}
        </div>
      </div>
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /><span className="text-gpl font-semibold">Team A <span className="text-gpl-muted font-normal">{teamA}%</span></span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" /><span className="text-gpl font-semibold">Draw <span className="text-gpl-muted font-normal">{draw}%</span></span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /><span className="text-gpl font-semibold">Team B <span className="text-gpl-muted font-normal">{teamB}%</span></span></div>
      </div>
    </div>
  );
}

export default function TeamSheetsPage() {
  const { gameWeeks, players } = useStore();

  // Find the soonest upcoming GW that has a saved team sheet
  const upcomingWithSheet = gameWeeks
    .filter((gw) => !gwCompleted(gw) && gw.teamA?.players?.length > 0 && gw.teamB?.players?.length > 0)
    .at(-1);

  // Fallback: most recently completed GW
  const fallbackGW = [...gameWeeks].filter((gw) => gwCompleted(gw)).at(-1);

  const gw = upcomingWithSheet || fallbackGW;
  const isUpcoming = !!upcomingWithSheet;

  const getAvg = (playerIds, subs = []) => {
    const subSet = new Set(subs);
    const starters = playerIds.filter((id) => !subSet.has(id));
    const roster = starters.map((id) => players.find((p) => p.id === id)).filter(Boolean);
    return roster.length ? roster.reduce((s, p) => s + p.rating, 0) / roster.length : 0;
  };

  const avgA = gw ? getAvg(gw.teamA?.players || [], gw.teamA?.subs || []) : 0;
  const avgB = gw ? getAvg(gw.teamB?.players || [], gw.teamB?.subs || []) : 0;
  const prob = avgA && avgB ? calculateWinProbability(avgA, avgB) : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Team Sheets</h1>
        {gw ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gpl-muted text-sm">Game Week {gw.weekNumber} — {gw.date}</span>
            {isUpcoming
              ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 uppercase tracking-wider">Next Match</span>
              : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gpl-border/40 text-gpl-muted uppercase tracking-wider">Last Match</span>}
          </div>
        ) : (
          <p className="text-gpl-muted text-sm">Match day formations</p>
        )}
      </div>

      {gw && prob && isUpcoming && <WinProbabilityBar {...prob} />}

      {gw ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormationDisplay
            playerIds={gw.teamA.players}
            teamColor="#ef4444"
            teamName={gwCompleted(gw) ? `Team A — ${gw.teamA.score} goal(s)` : 'Team A'}
            allPlayers={players}
            subIds={gw.teamA?.subs || []}
          />
          <FormationDisplay
            playerIds={gw.teamB.players}
            teamColor="#3b82f6"
            teamName={gwCompleted(gw) ? `Team B — ${gw.teamB.score} goal(s)` : 'Team B'}
            allPlayers={players}
            subIds={gw.teamB?.subs || []}
          />
        </div>
      ) : (
        <div className="text-center py-20 text-gpl-muted text-sm">
          No team sheet available yet
        </div>
      )}
    </div>
  );
}
