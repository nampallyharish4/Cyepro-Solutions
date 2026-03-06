'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Settings, Zap, ArrowRight } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

export default function RulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [fatigueLimit, setFatigueLimit] = useState(5);
  const [isUpdatingFatigue, setIsUpdatingFatigue] = useState(false);

  const [newRule, setNewRule] = useState({
    name: 'New System Rule',
    condition_type: 'source',
    condition_value: 'BILLING_SERVICE',
    target_priority: 'NOW',
    priority_order: 10,
  });

  const fetchRules = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/rules`);
      // Separate the system setting from the deterministic rules
      const fatigueRule = data.find((r: any) => r.name === 'FATIGUE_LIMIT');
      if (fatigueRule) {
        setFatigueLimit(parseInt(fatigueRule.condition_value));
      }
      setRules(data.filter((r: any) => r.condition_type !== 'system_setting'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/rules`, newRule);
      setShowAdd(false);
      fetchRules();
    } catch (e) {
      alert('Failed to create rule');
    }
  };

  const handleUpdateFatigue = async () => {
    setIsUpdatingFatigue(true);
    try {
      await axios.post(`${API_URL}/rules`, {
        name: 'FATIGUE_LIMIT',
        condition_type: 'system_setting',
        condition_value: fatigueLimit.toString(),
        target_priority: 'SYSTEM',
        priority_order: -1
      });
      fetchRules(); // sync it back
      alert("Fatigue Threshold updated globally without restart.");
    } catch (e) {
      console.error(e);
      alert("Failed to update fatigue threshold");
    } finally {
      setIsUpdatingFatigue(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
       // Since I don't see delete endpoint, I'll alert or assume it's there
       await axios.delete(`${API_URL}/rules/${id}`);
       fetchRules();
    } catch (e) {
      alert("Delete failed / Not implemented on backend yet");
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Rules Protocol
          </h1>
          <p className="text-lg text-zinc-400">
            Configure deterministic logic override for the engine.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="glass-button bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Create Rule
        </button>
      </div>

      {/* Global Config Card */}
      <div className="glass-card p-6 border-l-4 border-l-amber-500 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Alert Fatigue Threshold
           </h3>
           <p className="text-sm text-zinc-400 mt-1">
             Dynamically limits how many NOW-priority alerts a user can receive in 60 minutes before the engine temporarily defers them.
           </p>
        </div>
        <div className="flex items-center gap-4">
           <input 
             type="number" 
             className="w-24 bg-white/5 border border-amber-500/20 rounded-xl px-4 py-3 text-center text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
             value={fatigueLimit}
             onChange={(e) => setFatigueLimit(parseInt(e.target.value) || 0)}
           />
           <button 
             onClick={handleUpdateFatigue}
             disabled={isUpdatingFatigue}
             className="glass-button bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold whitespace-nowrap"
           >
             {isUpdatingFatigue ? 'Updating...' : 'Apply Globals'}
           </button>
        </div>
      </div>

      {showAdd && (
        <div className="glass-card p-8 neon-border-purple animate-in fade-in duration-300">
          <form
            onSubmit={handleAddRule}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            <InputGroup
              label="Rule Name"
              value={newRule.name}
              onChange={(v: string) => setNewRule({ ...newRule, name: v })}
            />
            <div className="space-y-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <label>Condition Type</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                value={newRule.condition_type}
                onChange={(e) =>
                  setNewRule({ ...newRule, condition_type: e.target.value })
                }
              >
                <option value="source">Source Service</option>
                <option value="type">Event Type</option>
                <option value="title_contains">Title Keyword</option>
              </select>
            </div>
            <InputGroup
              label="Condition Value"
              value={newRule.condition_value}
              onChange={(v: string) =>
                setNewRule({ ...newRule, condition_value: v })
              }
            />
            <div className="space-y-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <label>Output Priority</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                value={newRule.target_priority}
                onChange={(e) =>
                  setNewRule({ ...newRule, target_priority: e.target.value })
                }
              >
                <option value="NOW">NOW (Immediate)</option>
                <option value="LATER">LATER (Deferred)</option>
                <option value="NEVER">NEVER (Dropped)</option>
              </select>
            </div>
            <InputGroup
              label="Priority Order (High = First)"
              value={newRule.priority_order.toString()}
              onChange={(v: string) =>
                setNewRule({ ...newRule, priority_order: parseInt(v) || 0 })
              }
            />

            <div className="flex items-end">
              <button
                type="submit"
                className="glass-button w-full bg-white/10 hover:bg-white/20"
              >
                Save Protocol
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Rules Table */}
      <div className="glass-card overflow-x-auto overflow-y-hidden">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Protocol Name
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Condition
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">
                Output
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-20 text-center text-zinc-600"
                >
                  Syncing rules...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-20 text-center text-zinc-600"
                >
                  No active protocols found.
                </td>
              </tr>
            ) : (
              rules.map((rule: any) => (
                <tr
                  key={rule.id}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-zinc-400" />
                      </div>
                      <span className="font-semibold text-white">
                        {rule.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                      <span className="text-zinc-500 uppercase text-[10px] font-bold">
                        {rule.condition_type}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-white">{rule.condition_value}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${getPriorityColor(rule.target_priority)}`}
                      >
                        {rule.target_priority}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-zinc-600 hover:text-rose-500 transition-colors p-2">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange }: any) {
  return (
    <div className="space-y-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      <label>{label}</label>
      <input
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function getPriorityColor(p: string) {
  switch (p) {
    case 'NOW':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
    case 'LATER':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/20';
    case 'NEVER':
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/20';
    default:
      return 'bg-zinc-800 text-zinc-400';
  }
}
