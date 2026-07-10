function matchRatingColor(r) {
  if (r >= 8) return '#22c55e';
  if (r >= 6.5) return '#eab308';
  return '#ef4444';
}

function overallCircleColor(rating) {
  if (rating >= 100) return 'linear-gradient(135deg, #f59e0b, #fbbf24)'; // gold for 100
  if (rating >= 85) return '#22c55e';
  if (rating >= 75) return '#eab308';
  if (rating >= 65) return '#f97316';
  return '#ef4444';
}

function PlayerDot({ p, teamColor, matchRatings, onPlayerClick, small = false, colorByRating = false, hideRating = false }) {
  const mr = matchRatings[p.id];
  const size = small ? 'w-10 h-10 text-xs' : 'w-12 h-12 text-sm';
  const SPECIAL_PLAYER_ID = 'p1777923767043';
  const circleStyle = colorByRating
    ? { background: overallCircleColor(p.rating) }
    : { background: teamColor };
  return (
    <div className={`text-center ${onPlayerClick ? 'cursor-pointer group' : ''}`} onClick={() => onPlayerClick?.(p.id)}>
      <div className={`${size} rounded-full flex items-center justify-center text-white font-black mx-auto mb-1 shadow-lg transition-transform ${onPlayerClick ? 'group-hover:scale-110' : ''}`} style={circleStyle}>
        {!hideRating && p.rating}
      </div>
      <div className="text-xs font-semibold text-gpl truncate max-w-20">{p.name.split(' ').pop()}</div>
      <div className="text-[10px] text-gpl-muted">{p.position}</div>
      {mr !== undefined && (
        <div className="text-xs font-bold mt-0.5" style={{ color: matchRatingColor(mr) }}>{SPECIAL_PLAYER_ID === p.id ? 10.0 : Number(mr).toFixed(1)}</div>
      )}
    </div>
  );
}

// matchRatings: optional { [playerId]: number } — shows individual match rating badge
// subIds: optional string[] — player IDs who are substitutes (shown in bench section)
// colorByRating: when true, circle color reflects overall rating tier instead of team color
export default function FormationDisplay({ playerIds, teamColor, teamName, allPlayers, matchRatings = {}, onPlayerClick, subIds = [], colorByRating = false, hideRating = false }) {
  const subSet = new Set(subIds);
  const starterIds = playerIds.filter((id) => !subSet.has(id));
  const subPlayerIds = playerIds.filter((id) => subSet.has(id));

  const grouped = { GK: [], DF: [], MF: [], FW: [] };
  starterIds.forEach((pid) => {
    const p = allPlayers.find((pl) => pl.id === pid);
    if (p) grouped[p.position].push(p);
  });

  const rows = [grouped.FW, grouped.MF, grouped.DF, grouped.GK].filter((r) => r.length > 0);
  const subPlayers = subPlayerIds.map((id) => allPlayers.find((p) => p.id === id)).filter(Boolean);

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-6"
      style={{ background: `linear-gradient(180deg, ${teamColor}22, ${teamColor}08)`, minHeight: 320 }}
    >
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, ${teamColor} 40px)` }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 opacity-10" style={{ borderColor: teamColor }} />
      <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-center relative z-10" style={{ color: teamColor }}>{teamName}</h3>
      <div className="flex flex-col gap-6 relative z-10">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-4 flex-wrap">
            {row.map((p) => (
              <PlayerDot key={p.id} p={p} teamColor={teamColor} matchRatings={matchRatings} onPlayerClick={onPlayerClick} colorByRating={colorByRating} hideRating={hideRating} />
            ))}
          </div>
        ))}
      </div>

      {subPlayers.length > 0 && (
        <div className="relative z-10 mt-5 pt-4 border-t border-dashed" style={{ borderColor: `${teamColor}40` }}>
          <div className="text-[10px] text-center text-gpl-muted uppercase tracking-wider mb-3">Substitutes</div>
          <div className="flex justify-center gap-4 flex-wrap opacity-70">
            {subPlayers.map((p) => (
              <PlayerDot key={p.id} p={p} teamColor={teamColor} matchRatings={matchRatings} onPlayerClick={onPlayerClick} small colorByRating={colorByRating} hideRating={hideRating} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
