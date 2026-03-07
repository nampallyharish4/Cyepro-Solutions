'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Shield,
  Zap,
  ArrowRight,
  Pencil,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function RulesManager() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [fatigueLimit, setFatigueLimit] = useState(5);
  const [fatigueRuleId, setFatigueRuleId] = useState<string | null>(null);
  const [isUpdatingFatigue, setIsUpdatingFatigue] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [newRule, setNewRule] = useState({
    name: '',
    condition_type: 'source',
    condition_value: '',
    target_priority: 'NOW',
    priority_order: 10,
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error') => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [],
  );

  const fetchRules = async () => {
    try {
      const { data } = await api.get('/rules');
      const fatigueRule = data.find((r: any) => r.name === 'FATIGUE_LIMIT');
      if (fatigueRule) {
        setFatigueLimit(parseInt(fatigueRule.condition_value));
        setFatigueRuleId(fatigueRule.id);
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
    if (!newRule.name.trim() || !newRule.condition_value.trim()) {
      showToast('Rule name and condition value are required.', 'error');
      return;
    }
    try {
      await api.post('/rules', newRule);
      setShowAdd(false);
      setNewRule({
        name: '',
        condition_type: 'source',
        condition_value: '',
        target_priority: 'NOW',
        priority_order: 10,
      });
      showToast('Rule created — engine will use it immediately.', 'success');
      fetchRules();
    } catch {
      showToast('Failed to create rule.', 'error');
    }
  };

  const handleUpdateFatigue = async () => {
    if (fatigueLimit < 1) {
      showToast('Fatigue threshold must be at least 1.', 'error');
      return;
    }
    setIsUpdatingFatigue(true);
    try {
      if (fatigueRuleId) {
        // UPDATE existing fatigue rule — not INSERT duplicate
        await api.put(`/rules/${fatigueRuleId}`, {
          condition_value: fatigueLimit.toString(),
        });
      } else {
        // First time — create it
        await api.post('/rules', {
          name: 'FATIGUE_LIMIT',
          condition_type: 'system_setting',
          condition_value: fatigueLimit.toString(),
          target_priority: 'SYSTEM',
          priority_order: -1,
        });
      }
      showToast(
        'Fatigue threshold updated globally — no restart required.',
        'success',
      );
      fetchRules();
    } catch {
      showToast('Failed to update fatigue threshold.', 'error');
    } finally {
      setIsUpdatingFatigue(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await api.delete(`/rules/${id}`);
      setDeleteConfirmId(null);
      showToast('Rule soft-deleted — recoverable from database.', 'success');
      fetchRules();
    } catch {
      showToast('Delete failed.', 'error');
    }
  };

  const startEdit = (rule: any) => {
    setEditingId(rule.id);
    setEditForm({
      name: rule.name,
      condition_type: rule.condition_type,
      condition_value: rule.condition_value,
      target_priority: rule.target_priority,
      priority_order: rule.priority_order,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editForm.name?.trim() || !editForm.condition_value?.trim()) {
      showToast('Name and condition value cannot be empty.', 'error');
      return;
    }
    try {
      await api.put(`/rules/${editingId}`, editForm);
      setEditingId(null);
      setEditForm({});
      showToast('Rule updated — engine picks up changes live.', 'success');
      fetchRules();
    } catch {
      showToast('Failed to update rule.', 'error');
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg backdrop-blur-xl border animate-in slide-in-from-right duration-300 ${
              t.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Rules Protocol
          </h1>
          <p className="text-sm sm:text-lg text-zinc-400">
            Configure deterministic logic overrides — applied before AI, no
            restart needed.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="glass-button bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" />
          Create Rule
        </button>
      </div>

      {/* Global Fatigue Config */}
      <div className="glass-card p-5 sm:p-6 border-l-4 border-l-amber-500 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-amber-500 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Alert Fatigue Threshold
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Max NOW-priority alerts a user can receive within 60 min. Exceeding
            this auto-defers to LATER.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            className="w-20 bg-white/5 border border-amber-500/20 rounded-xl px-3 py-2.5 text-center text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            value={fatigueLimit}
            onChange={(e) => setFatigueLimit(parseInt(e.target.value) || 1)}
          />
          <button
            onClick={handleUpdateFatigue}
            disabled={isUpdatingFatigue}
            className="glass-button bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold whitespace-nowrap text-sm"
          >
            {isUpdatingFatigue ? 'Saving...' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Create Rule Form */}
      {showAdd && (
        <div className="glass-card p-5 sm:p-8 neon-border-purple animate-in fade-in duration-300">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-5">
            New Classification Rule
          </h3>
          <form
            onSubmit={handleAddRule}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <InputGroup
              label="Rule Name"
              placeholder="e.g. Block Marketing Spam"
              value={newRule.name}
              onChange={(v: string) => setNewRule({ ...newRule, name: v })}
              required
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Condition Type
              </label>
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
                <option value="metadata_match">Metadata Match</option>
              </select>
            </div>
            <InputGroup
              label={
                newRule.condition_type === 'metadata_match'
                  ? 'Condition (key=value)'
                  : 'Condition Value'
              }
              placeholder={
                newRule.condition_type === 'metadata_match'
                  ? 'e.g. region=us-east'
                  : 'e.g. BILLING_SERVICE'
              }
              value={newRule.condition_value}
              onChange={(v: string) =>
                setNewRule({ ...newRule, condition_value: v })
              }
              required
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Output Priority
              </label>
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
              label="Priority Order"
              placeholder="Higher = evaluated first"
              value={newRule.priority_order.toString()}
              onChange={(v: string) =>
                setNewRule({ ...newRule, priority_order: parseInt(v) || 0 })
              }
            />
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="glass-button flex-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold"
              >
                Save Protocol
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="glass-button text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rules — Desktop Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <table className="w-full text-left">
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
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">
                Order
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">
                Updated
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
                  colSpan={6}
                  className="px-6 py-20 text-center text-zinc-600"
                >
                  Syncing rules...
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-20 text-center text-zinc-600"
                >
                  No active protocols. Create one above.
                </td>
              </tr>
            ) : (
              rules.map((rule: any) => (
                <tr
                  key={rule.id}
                  className="group hover:bg-white/5 transition-colors"
                >
                  {/* Name */}
                  <td className="px-6 py-5">
                    {editingId === rule.id ? (
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          <Shield className="h-4 w-4 text-zinc-400" />
                        </div>
                        <span className="font-semibold text-white">
                          {rule.name}
                        </span>
                      </div>
                    )}
                  </td>
                  {/* Condition */}
                  <td className="px-6 py-5">
                    {editingId === rule.id ? (
                      <div className="flex gap-2">
                        <select
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
                          value={editForm.condition_type}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              condition_type: e.target.value,
                            })
                          }
                        >
                          <option value="source">source</option>
                          <option value="type">type</option>
                          <option value="title_contains">title_contains</option>
                          <option value="metadata_match">metadata_match</option>
                        </select>
                        <input
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                          value={editForm.condition_value}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              condition_value: e.target.value,
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                        <span className="text-zinc-500 uppercase text-[10px] font-bold">
                          {rule.condition_type}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-white">
                          {rule.condition_value}
                        </span>
                      </div>
                    )}
                  </td>
                  {/* Output */}
                  <td className="px-6 py-5">
                    {editingId === rule.id ? (
                      <select
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none mx-auto block"
                        value={editForm.target_priority}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            target_priority: e.target.value,
                          })
                        }
                      >
                        <option value="NOW">NOW</option>
                        <option value="LATER">LATER</option>
                        <option value="NEVER">NEVER</option>
                      </select>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${getPriorityColor(rule.target_priority)}`}
                        >
                          {rule.target_priority}
                        </span>
                      </div>
                    )}
                  </td>
                  {/* Order */}
                  <td className="px-6 py-5 text-center">
                    {editingId === rule.id ? (
                      <input
                        type="number"
                        className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none mx-auto block"
                        value={editForm.priority_order}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            priority_order: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      <span className="text-sm text-zinc-400">
                        {rule.priority_order}
                      </span>
                    )}
                  </td>
                  {/* Updated */}
                  <td className="px-6 py-5 text-center">
                    <span className="text-xs text-zinc-500 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(rule.updated_at || rule.created_at)}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-5 text-right">
                    {editingId === rule.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors p-2"
                          title="Save"
                        >
                          <Save className="h-5 w-5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-zinc-600 hover:text-zinc-400 transition-colors p-2"
                          title="Cancel"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : deleteConfirmId === rule.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-xs text-rose-400 mr-1">
                          Delete?
                        </span>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-rose-400 hover:text-rose-300 transition-colors p-1.5 rounded-lg bg-rose-500/10"
                          title="Confirm delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-zinc-600 hover:text-zinc-400 transition-colors p-1.5"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(rule)}
                          className="text-zinc-600 hover:text-purple-400 transition-colors p-2"
                          title="Edit rule"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(rule.id)}
                          className="text-zinc-600 hover:text-rose-500 transition-colors p-2"
                          title="Delete rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Rules — Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="glass-card p-10 text-center text-zinc-600">
            Syncing rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="glass-card p-10 text-center text-zinc-600">
            No active protocols. Create one above.
          </div>
        ) : (
          rules.map((rule: any) => (
            <div key={rule.id} className="glass-card p-4 space-y-3">
              {editingId === rule.id ? (
                /* Mobile Edit Mode */
                <div className="space-y-3">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    value={editForm.name}
                    placeholder="Rule name"
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
                      value={editForm.condition_type}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          condition_type: e.target.value,
                        })
                      }
                    >
                      <option value="source">source</option>
                      <option value="type">type</option>
                      <option value="title_contains">title_contains</option>
                      <option value="metadata_match">metadata_match</option>
                    </select>
                    <input
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      value={editForm.condition_value}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          condition_value: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      value={editForm.target_priority}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          target_priority: e.target.value,
                        })
                      }
                    >
                      <option value="NOW">NOW</option>
                      <option value="LATER">LATER</option>
                      <option value="NEVER">NEVER</option>
                    </select>
                    <input
                      type="number"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none"
                      value={editForm.priority_order}
                      placeholder="Order"
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          priority_order: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 glass-button bg-emerald-500/15 text-emerald-400 font-bold flex items-center justify-center gap-2 text-sm"
                    >
                      <Save className="h-4 w-4" /> Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="glass-button text-zinc-500 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Mobile View Mode */
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Shield className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">
                          {rule.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDate(rule.updated_at || rule.created_at)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase shrink-0 ${getPriorityColor(rule.target_priority)}`}
                    >
                      {rule.target_priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-white/5 px-3 py-1.5 rounded-lg">
                    <span className="text-zinc-500 uppercase text-[10px] font-bold">
                      {rule.condition_type}
                    </span>
                    <ArrowRight className="h-3 w-3 text-zinc-600" />
                    <span className="text-white text-xs">
                      {rule.condition_value}
                    </span>
                    <span className="ml-auto text-zinc-600 text-[10px]">
                      #{rule.priority_order}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => startEdit(rule)}
                      className="flex-1 glass-button text-xs text-zinc-400 hover:text-purple-400 flex items-center justify-center gap-1.5 py-2"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    {deleteConfirmId === rule.id ? (
                      <>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="flex-1 glass-button text-xs bg-rose-500/10 text-rose-400 flex items-center justify-center gap-1.5 py-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="glass-button text-xs text-zinc-500 py-2 px-3"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(rule.id)}
                        className="flex-1 glass-button text-xs text-zinc-500 hover:text-rose-400 flex items-center justify-center gap-1.5 py-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function InputGroup({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <input
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required={required}
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
