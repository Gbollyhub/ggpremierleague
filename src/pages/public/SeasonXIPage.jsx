import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import FormationDisplay from '@/components/cards/FormationDisplay';

// Slots per position for each squad size
const FORMATION_SLOTS = {
  6:  { GK: 1, DF: 2, MF: 2, FW: 1 },
  7:  { GK: 1, DF: 2, MF: 2, FW: 2 },
  8:  { GK: 1, DF: 3, MF: 2, FW: 2 },
  9:  { GK: 1, DF: 3, MF: 2, FW: 3 },
  10: { GK: 1, DF: 3, MF: 3, FW: 3 },
  11: { GK: 1, DF: 4, MF: 3, FW: 3 },
};

function formationLabel(slots) {
  return [slots.DF, slots.MF, slots.FW].join('-');
}

function buildSeasonXI(players, count) {
  const slots = FORMATION_SLOTS[count];
  const byPos = { GK: [], DF: [], MF: [], FW: [] };
  [...players]
    .sort((a, b) => b.rating - a.rating)
    .forEach((p) => { if (byPos[p.position]) byPos[p.position].push(p); });

  const selected = [];
  ['GK', 'DF', 'MF', 'FW'].forEach((pos) => {
    selected.push(...byPos[pos].slice(0, slots[pos] || 0));
  });
  return selected;
}

export default function SeasonXIPage() {
  const { players } = useStore();
  const [count, setCount] = useState(11);

  const xi = useMemo(() => buildSeasonXI(players, count), [players, count]);
  const slots = FORMATION_SLOTS[count];
  const avgRating = xi.length
    ? Math.round(xi.reduce((s, p) => s + p.rating, 0) / xi.length)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Season XI</h1>
        <p className="text-gpl-muted text-sm">Top-rated players by position</p>
      </div>

      {/* Squad size selector */}
      <div className="gpl-card p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-3">Squad Size</div>
            <div className="flex gap-2 flex-wrap">
              {[6, 7, 8, 9, 10, 11].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                    count === n
                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                      : 'gpl-card text-gpl hover:shadow-md'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {xi.length > 0 && (
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-black text-amber-500">{formationLabel(slots)}</div>
                <div className="text-[10px] text-gpl-muted uppercase tracking-wider">Formation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-gpl">{avgRating}</div>
                <div className="text-[10px] text-gpl-muted uppercase tracking-wider">Avg Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-gpl">{xi.length}</div>
                <div className="text-[10px] text-gpl-muted uppercase tracking-wider">Players</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-20 text-gpl-muted text-sm">No players in the squad yet.</div>
      ) : (
        <div className="space-y-6">
          <FormationDisplay
            playerIds={xi.map((p) => p.id)}
            teamColor="#f59e0b"
            teamName={`Season ${count === 11 ? 'XI' : count} — ${formationLabel(slots)}`}
            allPlayers={players}
          />

          {/* Roster list */}
          <div className="gpl-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gpl-muted mb-4">Squad</h3>
            <div className="space-y-2">
              {['GK', 'DF', 'MF', 'FW'].map((pos) => {
                const posPlayers = xi.filter((p) => p.position === pos);
                if (!posPlayers.length) return null;
                const labels = { GK: 'Goalkeeper', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' };
                return (
                  <div key={pos}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gpl-muted mb-1 mt-3 first:mt-0">{labels[pos]}</div>
                    {posPlayers.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-t border-gpl-border first:border-0">
                        <span className="text-sm font-semibold text-gpl">{p.name}</span>
                        <span className="text-sm font-black text-amber-500">{p.rating}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
