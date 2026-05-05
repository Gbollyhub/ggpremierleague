import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { POS_COLORS, POSITIONS } from '@/data/constants';
import { Tabs } from '@/components/ui/SharedUI';

export default function LeaderboardPage() {
  const { players } = useStore();
  const [tab, setTab] = useState('goals');

  const sorted = useMemo(() => {
    const list = [...players];
    switch (tab) {
      case 'goals': return list.sort((a, b) => b.stats.goals - a.stats.goals);
      case 'assists': return list.sort((a, b) => b.stats.assists - a.stats.assists);
      case 'rating': return list.sort((a, b) => b.rating - a.rating);
      case 'motm': return list.sort((a, b) => b.stats.motm - a.stats.motm);
      default: return list;
    }
  }, [players, tab]);

  const getVal = (p) => (tab === 'rating' ? p.rating : p.stats[tab] || 0);
  const medalColors = ['bg-amber-500 text-black', 'bg-gray-400 text-black', 'bg-amber-700 text-white'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Leaderboard</h1>
        <p className="text-gpl-muted text-sm">Season rankings</p>
      </div>

      <div className="mb-6 overflow-x-auto">
        <Tabs tabs={[{ id: 'goals', label: 'Goals' }, { id: 'assists', label: 'Assists' }, { id: 'rating', label: 'Rating' }, { id: 'motm', label: 'MOTM' }]} active={tab} onChange={setTab} />
      </div>

      <div className="space-y-2">
        {sorted.slice(0, 10).map((p, i) => (
          <div key={p.id} className="gpl-card p-4 flex items-center gap-3 sm:gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${i < 3 ? medalColors[i] : 'bg-gpl-inset text-gpl-muted'}`}>
              {i + 1}
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: POS_COLORS[p.position] }}>
              {p.rating}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gpl truncate">{p.name}</div>
              <div className="text-xs text-gpl-muted">{POSITIONS[p.position]}</div>
            </div>
            <div className="text-xl font-black" style={{ color: POS_COLORS[p.position] }}>{getVal(p)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
