import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { POSITIONS } from '@/data/constants';
import PlayerCard from '@/components/cards/PlayerCard';
import { IconSearch } from '@/components/ui/Icons';

export default function PlayersPage() {
  const { players } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rating');

  const filtered = useMemo(() => {
    let list = [...players];
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (posFilter !== 'ALL') list = list.filter((p) => p.position === posFilter);
    if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'goals') list.sort((a, b) => b.stats.goals - a.stats.goals);
    else if (sortBy === 'assists') list.sort((a, b) => b.stats.assists - a.stats.assists);
    return list;
  }, [players, search, posFilter, sortBy]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Players</h1>
        <p className="text-gpl-muted text-sm">George Green Premier League squad</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gpl-muted">
            <IconSearch className="w-4 h-4" />
          </div>
          <input type="text" placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl gpl-input text-sm" />
        </div>
        <div className="flex gap-3">
          <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)} className="px-4 py-2.5 rounded-xl gpl-input text-sm flex-1 sm:flex-none">
            <option value="ALL">All Positions</option>
            {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-4 py-2.5 rounded-xl gpl-input text-sm flex-1 sm:flex-none">
            <option value="rating">Sort by Rating</option>
            <option value="goals">Sort by Goals</option>
            <option value="assists">Sort by Assists</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <PlayerCard key={p.id} player={p} onClick={() => navigate(`/players/${p.id}`)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-gpl-muted">No players found</div>
      )}
    </div>
  );
}
