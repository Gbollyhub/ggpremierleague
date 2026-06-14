import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { IconStar, IconX } from '@/components/ui/Icons';
import FormationDisplay from '@/components/cards/FormationDisplay';
import { POS_COLORS, POSITIONS } from '@/data/constants';

const gwCompleted = (gw) => gw.status === 'completed' || gw.completed === true;

// Normalise goal entries for both old (events[]) and new (goals[]) format
function getTeamGoals(gw, team) {
  if (gw.goals?.length) return gw.goals.filter((g) => g.team === team);
  const teamPlayers = team === 'A' ? gw.teamA.players : gw.teamB.players;
  return (gw.events || [])
    .filter((e) => e.type === 'goal' && teamPlayers.includes(e.playerId))
    .map((e) => ({ scorerId: e.playerId, assisterId: null, minute: e.minute, team }));
}

function StatRow({ label, valA, valB, suffix = '' }) {
  return (
    <div className="flex items-center gap-3 py-2 border-t border-gpl-border first:border-0">
      <span className="w-12 text-right text-sm font-bold text-red-400">{valA}{suffix}</span>
      <span className="text-xs text-gpl-muted flex-1 text-center whitespace-nowrap">{label}</span>
      <span className="w-12 text-sm font-bold text-blue-400 text-left">{valB}{suffix}</span>
    </div>
  );
}

function matchRatingColor(r) {
  if (r >= 8) return '#22c55e';
  if (r >= 6.5) return '#eab308';
  return '#ef4444';
}

function MatchReportModal({ pid, gw, players, onClose }) {
  const p = players.find((pl) => pl.id === pid);
  if (!p || !gw) return null;
  const ps = gw.playerStats?.[pid] || {};
  const mr = ps.matchRating;
  const posColor = POS_COLORS[p.position];

  const shotsOffTarget = ps.shotsOffTarget ?? Math.max(0, (ps.shots ?? 0) - (ps.shotsOnTarget ?? 0));
  const statRows = [
    { label: 'Goals', value: ps.goals ?? 0 },
    { label: 'Assists', value: ps.assists ?? 0 },
    { label: 'Goals Conceded', value: ps.goalsConceded ?? ps.goalsConcededAsDF ?? 0 },
    { label: 'GK Goals Conceded', value: ps.goalsConcededAsGK ?? 0 },
    { label: 'Saves', value: ps.saves ?? 0 },
    { label: 'Shots', value: ps.shots ?? 0 },
    { label: 'Shots on Target', value: ps.shotsOnTarget ?? 0 },
    { label: 'Shots off Target', value: shotsOffTarget },
    { label: 'Skill Moves', value: ps.skillMoves ?? 0 },
    { label: 'Big Chances Missed', value: ps.bigChancesMissed ?? 0 },
    { label: 'Tackles', value: ps.tackles ?? 0 },
    { label: 'Interceptions', value: ps.interceptions ?? 0 },
    { label: 'Blocks', value: ps.blocks ?? 0 },
    { label: 'Fouls', value: ps.fouls ?? 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative gpl-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5" style={{ background: `linear-gradient(160deg, ${posColor}22, transparent)` }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-lg font-bold text-gpl">{p.name}</div>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: posColor }}>{POSITIONS[p.position]}</span>
            </div>
            <div className="flex items-center gap-3">
              {mr !== undefined && (
                <div className="text-center">
                  <div className="text-3xl font-black" style={{ color: matchRatingColor(mr) }}>{Number(mr).toFixed(1)}</div>
                  <div className="text-[9px] text-gpl-muted uppercase tracking-wider">Rating</div>
                </div>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gpl-inset text-gpl-muted">
                <IconX className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-0">
            {statRows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-t border-gpl-border first:border-0">
                <span className="text-xs text-gpl-muted">{label}</span>
                <span className="text-sm font-bold text-gpl">{value}</span>
              </div>
            ))}
          </div>

          {(ps.yellowCard || ps.redCard) && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gpl-border">
              {ps.yellowCard && <span className="text-xs px-2 py-0.5 rounded font-bold bg-yellow-400/20 text-yellow-400">Yellow Card</span>}
              {ps.redCard && <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-500/20 text-red-400">Red Card</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GameWeekPage() {
  const { gameWeeks, players } = useStore();
  const completed = gameWeeks.filter(gwCompleted);
  const [selectedGW, setSelectedGW] = useState(completed.length > 0 ? completed[completed.length - 1].id : null);
  const [matchReportPid, setMatchReportPid] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const gw = gameWeeks.find((g) => g.id === selectedGW);

  const teamAGoals = useMemo(() => gw ? getTeamGoals(gw, 'A') : [], [gw]);
  const teamBGoals = useMemo(() => gw ? getTeamGoals(gw, 'B') : [], [gw]);

  const getPlayerName = (pid) => players.find((p) => p.id === pid)?.name || 'Unknown';

  const hasMatchStats = gw && (gw.teamA?.shots !== undefined || gw.teamA?.possession !== undefined);

  // Extract only the matchRating number per player (playerStats stores the full object)
  const matchRatings = useMemo(() => {
    if (!gw?.playerStats) return {};
    return Object.fromEntries(
      Object.entries(gw.playerStats).map(([pid, s]) => [pid, s.matchRating])
    );
  }, [gw]);

  // Derive yellow/red card counts from playerStats
  const cardCounts = useMemo(() => {
    if (!gw?.playerStats) return null;
    return Object.entries(gw.playerStats).reduce(
      (acc, [pid, s]) => {
        const inA = gw.teamA.players.includes(pid);
        if (s.yellowCard) inA ? acc.aY++ : acc.bY++;
        if (s.redCard) inA ? acc.aR++ : acc.bR++;
        return acc;
      },
      { aY: 0, bY: 0, aR: 0, bR: 0 },
    );
  }, [gw]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Game Weeks</h1>
        <p className="text-gpl-muted text-sm">Match results and statistics</p>
      </div>

      {/* GW selector */}
      <div className="flex gap-2 flex-wrap mb-6">
        {completed.map((g) => (
          <button key={g.id} onClick={() => { setSelectedGW(g.id); setVideoOpen(false); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedGW === g.id ? 'bg-blue-600 text-white shadow-sm' : 'gpl-card text-gpl hover:shadow-md'}`}>
            GW {g.weekNumber}
          </button>
        ))}
      </div>

      {matchReportPid && gw && (
        <MatchReportModal pid={matchReportPid} gw={gw} players={players} onClose={() => setMatchReportPid(null)} />
      )}

      {videoOpen && gw?.matchLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setVideoOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">Game Week {gw.weekNumber} — {gw.date}</span>
              <button onClick={() => setVideoOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <video controls autoPlay className="w-full rounded-2xl shadow-2xl bg-black" style={{ maxHeight: '70vh' }}>
              <source src={gw.matchLink.replace('dl=0', 'raw=1')} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {gw ? (
        <div className="space-y-6">

          {/* Score card + goal scorers */}
          <div className="gpl-card p-6 sm:p-8">
            <div className="text-xs text-gpl-muted uppercase tracking-wider text-center mb-6">{gw.date}</div>

            {/* Score */}
            <div className="flex items-start justify-between gap-4">
              {/* Team A scorers */}
              <div className="flex-1 space-y-1">
                {teamAGoals.map((g, i) => (
                  <div key={i} className="text-right">
                    <span className="text-[14px] font-semibold text-gpl">{getPlayerName(g.scorerId)}</span>
                    {g.assisterId && <div className="text-xs text-gpl-muted">(ast. {getPlayerName(g.assisterId)})</div>}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-black text-red-500">{gw.teamA.score}</div>
                  <div className="text-xs font-bold text-red-400 mt-1">Team A</div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gpl-muted">–</div>
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-black text-blue-500">{gw.teamB.score}</div>
                  <div className="text-xs font-bold text-blue-400 mt-1">Team B</div>
                </div>
              </div>

              {/* Team B scorers */}
              <div className="flex-1 space-y-1">
                {teamBGoals.map((g, i) => (
                  <div key={i}>
                    <span className="text-[14px] font-semibold text-gpl">{getPlayerName(g.scorerId)}</span>
                    {g.assisterId && <div className="text-xs text-gpl-muted">(ast. {getPlayerName(g.assisterId)})</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Watch match button */}
            {gw.matchLink && (
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => setVideoOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Watch Match
                </button>
              </div>
            )}

            {/* MOTM */}
            {gw.motm && (() => { const mp = players.find((p) => p.id === gw.motm); return mp ? (
              <div className="mt-6 flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-500">
                  <IconStar className="w-4 h-4" />
                  <span className="text-sm font-bold">Man of the Match: {mp.name}</span>
                </div>
              </div>
            ) : null; })()}
          </div>

          {/* Side-by-side match stats */}
          {hasMatchStats && (
            <div className="gpl-card p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-1 text-center">Match Stats</h3>
              <div className="flex justify-between text-[12px] font-bold mb-3">
                <span className="text-red-400">Team A</span>
                <span className="text-blue-400">Team B</span>
              </div>
              <StatRow label="Shots" valA={gw.teamA.shots ?? 0} valB={gw.teamB.shots ?? 0} />
              <StatRow label="Shots on Target" valA={gw.teamA.shotsOnTarget ?? 0} valB={gw.teamB.shotsOnTarget ?? 0} />
              <StatRow label="Possession" valA={gw.teamA.possession ?? 0} valB={gw.teamB.possession ?? 0} suffix="%" />
              <StatRow label="Corners" valA={gw.teamA.corners ?? 0} valB={gw.teamB.corners ?? 0} />
              <StatRow label="Fouls" valA={gw.teamA.fouls ?? 0} valB={gw.teamB.fouls ?? 0} />
              {cardCounts && <>
                <StatRow label="Yellow Cards" valA={cardCounts.aY} valB={cardCounts.bY} />
                <StatRow label="Red Cards" valA={cardCounts.aR} valB={cardCounts.bR} />
              </>}
            </div>
          )}

          {/* Team sheets with match ratings */}
          {(gw.teamA?.players?.length > 0 || gw.teamB?.players?.length > 0) && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-3">Team Sheets</h3>
              <p className="text-[14px] text-gpl-muted mb-3">Tap a player to see their match report</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormationDisplay
                  playerIds={gw.teamA.players}
                  teamColor="#ef4444"
                  teamName={`Team A — ${gw.teamA.score} goal(s)`}
                  allPlayers={players}
                  matchRatings={matchRatings}
                  onPlayerClick={setMatchReportPid}
                />
                <FormationDisplay
                  playerIds={gw.teamB.players}
                  teamColor="#3b82f6"
                  teamName={`Team B — ${gw.teamB.score} goal(s)`}
                  allPlayers={players}
                  matchRatings={matchRatings}
                  onPlayerClick={setMatchReportPid}
                />
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center py-20 text-gpl-muted text-sm">
          {completed.length === 0 ? 'No completed game weeks yet.' : 'Select a game week above.'}
        </div>
      )}
    </div>
  );
}
