import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { POSITIONS, POS_COLORS, PLAYSTYLES } from '@/data/constants';
import { generatePlayer } from '@/utils/players';
import { IconPlus, IconEdit, IconTrash, IconChevronRight } from '@/components/ui/Icons';

const DEFAULT_FORM = { name: '', position: 'FW', playstyles: [] };

export default function PlayerManagementPage() {
  const { players, addPlayer, updatePlayer, deletePlayer, addToast, setPage, setSelectedPlayer } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  const resetForm = () => { setForm({ ...DEFAULT_FORM }); setEditId(null); };

  const handleSave = () => {
    if (!form.name.trim()) { addToast('Player name is required', 'error'); return; }
    if (editId) {
      updatePlayer(editId, { name: form.name, position: form.position, playstyles: form.playstyles });
      addToast('Player updated', 'success');
    } else {
      addPlayer(generatePlayer(`p${Date.now()}`, form.name, form.position, 75, {}, form.playstyles));
      addToast('Player created', 'success');
    }
    resetForm(); setShowForm(false);
  };

  const handleEdit = (p) => { setForm({ name: p.name, position: p.position, playstyles: p.playstyles || [] }); setEditId(p.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const togglePlaystyle = (ps) => setForm((f) => ({
    ...f,
    playstyles: f.playstyles.includes(ps) ? f.playstyles.filter((s) => s !== ps) : [...f.playstyles, ps],
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gpl mb-1">Player Management</h1>
          <p className="text-gpl-muted text-sm">{players.length} players registered</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors">
          <IconPlus className="w-4 h-4" /> Add Player
        </button>
      </div>

      {showForm && (
        <div className="gpl-card p-6 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gpl-muted mb-4">{editId ? 'Edit Player' : 'New Player'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gpl-muted block mb-1 font-medium">Name</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm" placeholder="Player name" />
            </div>
            <div>
              <label className="text-xs text-gpl-muted block mb-1 font-medium">Position</label>
              <select value={form.position} onChange={(e) => set('position', e.target.value)} className="w-full px-4 py-2.5 rounded-xl gpl-input text-sm">
                {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gpl-muted">Attributes start at 75 and grow automatically based on match performances.</p>
            </div>
          </div>
          <div className="md:col-span-2 mt-2">
            <label className="text-xs text-gpl-muted block mb-2 font-medium">
              Playstyles <span className="text-gpl font-bold">({form.playstyles.length} selected)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYSTYLES.map((ps) => {
                const active = form.playstyles.includes(ps);
                return (
                  <button key={ps} type="button" onClick={() => togglePlaystyle(ps)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${active ? 'bg-blue-600 border-blue-600 text-white' : 'border-gpl-border text-gpl-muted hover:border-blue-500 hover:text-blue-400'}`}>
                    {ps}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors">{editId ? 'Update' : 'Create'} Player</button>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-6 py-2.5 rounded-xl gpl-card text-gpl text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.id} className="gpl-card p-4 flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: POS_COLORS[p.position] }}>{p.rating}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-gpl truncate">{p.name}</div>
              <div className="text-xs text-gpl-muted">{POSITIONS[p.position]} — {p.stats.goals}G {p.stats.assists}A {p.stats.gamesPlayed}GP</div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { setSelectedPlayer(p); setPage('playerDetail'); }} className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors"><IconChevronRight className="w-4 h-4" /></button>
              <button onClick={() => handleEdit(p)} className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-500 transition-colors"><IconEdit className="w-4 h-4" /></button>
              <button onClick={() => { deletePlayer(p.id); addToast('Player deleted', 'success'); }} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"><IconTrash className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
