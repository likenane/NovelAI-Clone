import React, { useState } from 'react';
import { PromptPreset } from '../types';
import { Save, Trash2, Download, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PromptPresetManagerProps {
  currentPrompts: {
    systemPrompt: string;
    codexSystemPrompt: string;
  };
  onApplyPreset: (prompts: PromptPreset['prompts']) => void;
  presets: PromptPreset[];
  savePreset: (name: string, prompts: PromptPreset['prompts']) => Promise<boolean>;
  deletePreset: (id: string) => Promise<boolean>;
  isLoading: boolean;
}

export const PromptPresetManager: React.FC<PromptPresetManagerProps> = ({
  currentPrompts,
  onApplyPreset,
  presets,
  savePreset,
  deletePreset,
  isLoading
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newPresetName.trim()) return;
    setIsSaving(true);
    const success = await savePreset(newPresetName, currentPrompts);
    if (success) {
      setNewPresetName('');
    }
    setIsSaving(false);
  };

  const handleLoad = () => {
    if (!selectedPresetId) return;
    const preset = presets.find(p => p.id === selectedPresetId);
    if (preset) {
      onApplyPreset(preset.prompts);
    }
  };

  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);

  const handleDeleteClick = () => {
    if (!selectedPresetId) return;
    setDeletingPresetId(selectedPresetId);
  };

  const confirmDelete = async () => {
    if (deletingPresetId) {
      await deletePreset(deletingPresetId);
      setSelectedPresetId('');
      setDeletingPresetId(null);
    }
  };

  const cancelDelete = () => {
    setDeletingPresetId(null);
  };

  return (
    <div className="space-y-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
      <h4 className="text-sm font-semibold text-zinc-300">Preset Management</h4>
      
      {/* Load & Delete Row */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Saved Presets</label>
        <div className="flex items-center gap-2">
          <select
            value={selectedPresetId}
            onChange={(e) => setSelectedPresetId(e.target.value)}
            className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={isLoading || presets.length === 0}
          >
            <option value="" disabled>
              {isLoading ? "Loading..." : presets.length === 0 ? "No presets saved" : "Select a preset..."}
            </option>
            {presets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          <button
            onClick={handleLoad}
            disabled={!selectedPresetId}
            className="shrink-0 flex items-center justify-center p-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 text-zinc-200 rounded-lg transition-colors"
            title="Load Preset"
          >
            <Download className="w-4 h-4" />
          </button>
          
          {selectedPresetId === deletingPresetId ? (
            <div className="flex bg-rose-500/10 rounded-lg overflow-hidden border border-rose-500/30">
              <button
                onClick={confirmDelete}
                className="px-3 py-2.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors"
                title="Confirm Delete"
              >
                ✅
              </button>
              <div className="w-px bg-rose-500/30" />
              <button
                onClick={cancelDelete}
                className="px-3 py-2.5 hover:bg-white/5 text-zinc-400 transition-colors"
                title="Cancel"
              >
                ❌
              </button>
            </div>
          ) : (
            <button
              onClick={handleDeleteClick}
              disabled={!selectedPresetId}
              className="shrink-0 flex items-center justify-center p-2.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 disabled:hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
              title="Delete Preset"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Save New Row */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Save Current As</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="New preset name..."
            className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-zinc-600"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <button
            onClick={handleSave}
            disabled={!newPresetName.trim() || isSaving}
            className="shrink-0 flex items-center justify-center p-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-lg transition-colors"
            title="Save Preset"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
