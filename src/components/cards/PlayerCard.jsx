import { POS_COLORS, POSITIONS } from '@/data/constants';
import { getRatingColor, getRatingLabel } from '@/utils/players';
import { IconStar } from '@/components/ui/Icons';

export default function PlayerCard({ player, onClick }) {
  const posColor = POS_COLORS[player.position];

  return (
    <div
      className="cursor-pointer group hover:-translate-y-1 transition-transform duration-200"
      onClick={() => onClick?.(player)}
    >
      <div
        className="relative rounded-2xl overflow-hidden gpl-card"
        style={{ background: `linear-gradient(160deg, ${posColor}12, ${posColor}04)` }}
      >
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 pointer-events-none"
          style={{ background: posColor, filter: 'blur(30px)' }}
        />

        <div className="relative p-5">
          {/* Rating & Position */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-4xl font-black text-gpl">{player.rating}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: posColor }}>
                {player.position}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                style={{ background: `${getRatingColor(player.rating)}20`, color: getRatingColor(player.rating) }}
              >
                {getRatingLabel(player.rating)}
              </div>
              {player.stats.motm > 0 && (
                <div className="flex items-center gap-1 text-amber-500">
                  <IconStar className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{player.stats.motm}</span>
                </div>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-gpl mb-0.5 truncate">{player.name}</h3>
          <div className="text-xs text-gpl-muted mb-3">{POSITIONS[player.position]}</div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { l: player.position === 'GK' ? 'SVS' : 'GOL', v: player.position === 'GK' ? player.stats.saves : player.stats.goals },
              { l: player.position === 'GK' ? 'CS' : 'AST', v: player.position === 'GK' ? player.stats.cleanSheets : player.stats.assists },
              { l: 'GP', v: player.stats.gamesPlayed },
            ].map((s) => (
              <div key={s.l} className="text-center py-1.5 px-1 rounded-lg" style={{ background: `${posColor}10` }}>
                <div className="text-base font-bold text-gpl">{s.v}</div>
                <div className="text-[10px] text-gpl-muted uppercase">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Attribute bars */}
          <div className="space-y-1.5">
            {['pace', 'finishing', 'passing', 'defending', 'physical'].map((attr) => (
              <div key={attr} className="flex items-center gap-2">
                <span className="text-[10px] uppercase w-8 text-gpl-muted font-medium">{attr.slice(0, 3)}</span>
                <div className="flex-1 h-1.5 rounded-full bg-gpl-inset overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${player.attributes[attr] ?? 75}%`, background: `linear-gradient(90deg, ${posColor}, ${posColor}aa)` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-gpl w-5 text-right">{player.attributes[attr] ?? 75}</span>
              </div>
            ))}
          </div>

          {player.playstyles?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {player.playstyles.slice(0, 3).map((ps) => (
                <span key={ps} className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-gpl" style={{ color: posColor }}>
                  {ps}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
