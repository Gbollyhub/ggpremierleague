import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { POS_COLORS, POSITIONS } from '@/data/constants';
import { generateBalancedTeams } from '@/utils/players';
import { IconShuffle, IconCheck } from '@/components/ui/Icons';

const gwCompleted = (gw) => gw.status === 'completed' || gw.completed === true;

export default function TeamGeneratorPage() {
  const { players, gameWeeks, updateGameWeekSheet, addToast } = useStore();
  const [selected, setSelected] = useState(new Set());
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [selectedGW, setSelectedGW] = useState('');
  const [saving, setSaving] = useState(false);

  const upcomingGWs = gameWeeks.filter((gw) => !gwCompleted(gw));

  const toggle = (id) => { setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); setGenerated(false); };
  const selectAll = () => { setSelected(new Set(players.map((p) => p.id))); setGenerated(false); };
  const clearAll = () => { setSelected(new Set()); setGenerated(false); };

  const generate = () => {
    if (selected.size < 4) { addToast('Select at least 4 players', 'error'); return; }
    const pool = players.filter((p) => selected.has(p.id));
    const { teamA: a, teamB: b } = generateBalancedTeams(pool);
    setTeamA(a); setTeamB(b); setGenerated(true); addToast('Teams generated!', 'success');
  };

  const handleSaveSheet = async () => {
    if (!selectedGW) { addToast('Select a game week', 'error'); return; }
    setSaving(true);
    await updateGameWeekSheet(selectedGW, teamA.map((p) => p.id), teamB.map((p) => p.id));
    setSaving(false);
    addToast('Team sheet saved to game week!', 'success');
    // Reset to default mode
    setGenerated(false);
    setTeamA([]); setTeamB([]);
    setSelected(new Set());
    setSelectedGW('');
  };

  const avgRating = (team) => team.length ? Math.round(team.reduce((s, p) => s + p.rating, 0) / team.length) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Team Generator</h1>
          <p className="text-gpl-muted text-sm">Select players and auto-balance teams</p>
        </div>
        <button onClick={generate} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors">
          <IconShuffle className="w-4 h-4" /> Generate Teams
        </button>
      </div>

      <div className="gpl-card p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gpl-muted">Available Players ({selected.size}/{players.length})</h3>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-500 font-medium">Select All</button>
            <button onClick={clearAll} className="text-xs px-3 py-1.5 rounded-lg bg-red-600/10 text-red-500 font-medium">Clear</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {players.map((p) => (
            <button key={p.id} onClick={() => toggle(p.id)}
              className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all text-sm ${selected.has(p.id) ? 'bg-blue-600/10 ring-1 ring-blue-500' : 'bg-gpl-inset hover:ring-1 ring-gpl-border'}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: POS_COLORS[p.position] }}>{p.rating}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gpl truncate text-xs">{p.name}</div>
                <div className="text-[10px] text-gpl-muted">{p.position}</div>
              </div>
              {selected.has(p.id) && <div className="ml-auto text-blue-500 shrink-0"><IconCheck className="w-4 h-4" /></div>}
            </button>
          ))}
        </div>
      </div>

      {generated && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {[[teamA, '#ef4444', 'Team A'], [teamB, '#3b82f6', 'Team B']].map(([team, color, name]) => (
              <div key={name} className="gpl-card p-6" style={{ background: `linear-gradient(160deg, ${color}10, transparent)` }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold" style={{ color }}>{name}</h3>
                  <span className="text-sm text-gpl-muted">Avg: <span className="font-bold text-gpl">{avgRating(team)}</span></span>
                </div>
                <div className="space-y-2">
                  {team.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gpl-inset">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: color }}>{p.rating}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gpl truncate">{p.name}</div>
                        <div className="text-xs text-gpl-muted">{POSITIONS[p.position]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Save to game week */}
          <div className="gpl-card p-5 sm:p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gpl-muted mb-4">Save Team Sheet to Game Week</h3>
            {upcomingGWs.length === 0 ? (
              <p className="text-sm text-gpl-muted">No upcoming game weeks — create one in Game Week Manager first.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <select value={selectedGW} onChange={(e) => setSelectedGW(e.target.value)} className="px-4 py-2.5 rounded-xl gpl-input text-sm flex-1 min-w-48">
                  <option value="">Select game week...</option>
                  {upcomingGWs.map((gw) => <option key={gw.id} value={gw.id}>GW{gw.weekNumber} — {gw.date}</option>)}
                </select>
                <button onClick={handleSaveSheet} disabled={saving || !selectedGW}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold transition-colors">
                  {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Saving...' : 'Save Sheet'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
