import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useStore } from '@/store/useStore';
import { POSITIONS, POS_COLORS } from '@/data/constants';
import { StatCard } from '@/components/ui/SharedUI';
import { IconUsers, IconGoal, IconTrophy, IconShield } from '@/components/ui/Icons';

export default function DashboardPage() {
  const { players, gameWeeks, seedDatabase, resetDatabase, resetPlayerRatings, recalculateAllAttributes, backfillGKAttributes } = useStore();
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [resettingRatings, setResettingRatings] = useState(false);
  const [confirmResetRatings, setConfirmResetRatings] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const handleBackfill = async () => {
    setBackfilling(true);
    await backfillGKAttributes();
    setBackfilling(false);
  };

  const needsBackfill = players.some((p) => p.attributes.gkDiving === undefined || p.attributes.gkReflexes === undefined);

  const handleReset = async () => {
    setResetting(true);
    await resetDatabase();
    setResetting(false);
    setConfirmReset(false);
  };

  const totalGoals = players.reduce((s, p) => s + p.stats.goals, 0);
  const totalAssists = players.reduce((s, p) => s + p.stats.assists, 0);
  const totalCS = players.reduce((s, p) => s + p.stats.cleanSheets, 0);
  const topPerformer = [...players].sort((a, b) => b.rating - a.rating)[0];

  const trendData = gameWeeks.filter((g) => g.completed).map((gw) => ({
    name: `GW${gw.weekNumber}`,
    goals: gw.events.filter((e) => e.type === 'goal').length,
  }));

  const posDist = Object.entries(POSITIONS).map(([k, v]) => ({
    name: v, value: players.filter((p) => p.position === k).length, color: POS_COLORS[k],
  }));

  const handleSeed = async () => {
    setSeeding(true);
    await seedDatabase();
    setSeeding(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Dashboard</h1>
          <p className="text-gpl-muted text-sm">Season overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {needsBackfill && (
            <button onClick={handleBackfill} disabled={backfilling}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 text-sm font-bold transition-colors disabled:opacity-60">
              {backfilling && <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />}
              {backfilling ? 'Updating...' : 'Add GK Attributes'}
            </button>
          )}
          <button onClick={async () => { setRecalculating(true); await recalculateAllAttributes(); setRecalculating(false); }} disabled={recalculating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-sm font-bold transition-colors disabled:opacity-60">
            {recalculating && <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
            {recalculating ? 'Recalculating...' : 'Recalculate Attributes'}
          </button>
          {players.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold transition-colors">
              {seeding && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {seeding ? 'Loading...' : 'Load Sample Data'}
            </button>
          )}
          {!confirmResetRatings ? (
            <button onClick={() => setConfirmResetRatings(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 text-sm font-bold transition-colors">
              Reset Ratings
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-medium">Set all ratings to 75?</span>
              <button onClick={async () => { setResettingRatings(true); await resetPlayerRatings(); setResettingRatings(false); setConfirmResetRatings(false); }} disabled={resettingRatings}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold transition-colors">
                {resettingRatings && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {resettingRatings ? 'Resetting...' : 'Yes, reset'}
              </button>
              <button onClick={() => setConfirmResetRatings(false)} className="px-3 py-2 rounded-xl gpl-card text-gpl text-xs font-medium">Cancel</button>
            </div>
          )}
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 text-sm font-bold transition-colors">
              Reset DB
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400 font-medium">Delete everything?</span>
              <button onClick={handleReset} disabled={resetting}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold transition-colors">
                {resetting && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {resetting ? 'Clearing...' : 'Yes, reset'}
              </button>
              <button onClick={() => setConfirmReset(false)} className="px-3 py-2 rounded-xl gpl-card text-gpl text-xs font-medium">Cancel</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard label="Players" value={players.length} icon={<IconUsers className="w-5 h-5" />} color="#3b82f6" />
        <StatCard label="Total Goals" value={totalGoals} icon={<IconGoal className="w-5 h-5" />} color="#ef4444" />
        <StatCard label="Total Assists" value={totalAssists} icon={<IconTrophy className="w-5 h-5" />} color="#f59e0b" />
        <StatCard label="Clean Sheets" value={totalCS} icon={<IconShield className="w-5 h-5" />} color="#22c55e" />
      </div>

      {topPerformer && (
        <div className="gpl-card p-5 sm:p-6 mb-8 flex items-center gap-4" style={{ background: `linear-gradient(135deg, ${POS_COLORS[topPerformer.position]}12, transparent)` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shrink-0" style={{ background: POS_COLORS[topPerformer.position] }}>{topPerformer.rating}</div>
          <div>
            <div className="text-xs text-gpl-muted uppercase tracking-wider font-medium">Top Performer</div>
            <div className="text-lg font-bold text-gpl">{topPerformer.name}</div>
            <div className="text-xs" style={{ color: POS_COLORS[topPerformer.position] }}>{POSITIONS[topPerformer.position]} — {topPerformer.stats.goals}G {topPerformer.stats.assists}A</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="gpl-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gpl-muted mb-4">Goals per Game Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gpl-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--gpl-text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--gpl-text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--gpl-surface)', border: '1px solid var(--gpl-border)', borderRadius: 12, color: 'var(--gpl-text)' }} />
              <Line type="monotone" dataKey="goals" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="gpl-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gpl-muted mb-4">Squad Composition</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={posDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {posDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--gpl-surface)', border: '1px solid var(--gpl-border)', borderRadius: 12, color: 'var(--gpl-text)' }} />
              <Legend iconType="circle" formatter={(v) => <span className="text-xs text-gpl">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
