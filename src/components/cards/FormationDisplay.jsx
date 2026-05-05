function matchRatingColor(r) {
  if (r >= 8) return '#22c55e';
  if (r >= 6.5) return '#eab308';
  return '#ef4444';
}

// matchRatings: optional { [playerId]: number } — shows individual match rating badge
export default function FormationDisplay({ playerIds, teamColor, teamName, allPlayers, matchRatings = {}, onPlayerClick }) {
  const grouped = { GK: [], DF: [], MF: [], FW: [] };
  playerIds.forEach((pid) => {
    const p = allPlayers.find((pl) => pl.id === pid);
    if (p) grouped[p.position].push(p);
  });

  const rows = [grouped.FW, grouped.MF, grouped.DF, grouped.GK].filter((r) => r.length > 0);

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
            {row.map((p) => {
              const mr = matchRatings[p.id];
              return (
                <div key={p.id} className={`text-center ${onPlayerClick ? 'cursor-pointer group' : ''}`} onClick={() => onPlayerClick?.(p.id)}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-black mx-auto mb-1 shadow-lg transition-transform ${onPlayerClick ? 'group-hover:scale-110' : ''}`} style={{ background: teamColor }}>
                    {p.rating}
                  </div>
                  <div className="text-xs font-semibold text-gpl truncate max-w-20">{p.name.split(' ').pop()}</div>
                  <div className="text-[10px] text-gpl-muted">{p.position}</div>
                  {mr !== undefined && (
                    <div className="text-xs font-bold mt-0.5" style={{ color: matchRatingColor(mr) }}>{Number(mr).toFixed(1)}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
