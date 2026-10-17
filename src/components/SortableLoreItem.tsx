import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Folder, 
  BookOpen, 
  GripVertical, 
  ChevronDown, 
  Plus, 
  Trash2, 
  ToggleRight, 
  ToggleLeft,
  Edit2,
  Check,
  X,
  Scissors,
  CornerUpLeft,
  FolderPlus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LoreEntry } from '../types';

interface SortableLoreItemProps {
  entry: LoreEntry;
  depth: number;
  isEditing: boolean;
  onEdit: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onToggleAlwaysActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onMoveToRoot?: (id: string) => void;
  onAddChild: (parentId: string, type: 'item' | 'folder') => void;
  onAcceptPruning?: (id: string) => void;
  onRejectPruning?: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  hasChildren: boolean;
}

export const SortableLoreItem: React.FC<SortableLoreItemProps> = ({ 
  entry, 
  depth, 
  isEditing, 
  onEdit, 
  onToggleEnabled, 
  onToggleAlwaysActive, 
  onDelete,
  onMoveToRoot,
  onAddChild,
  onAcceptPruning,
  onRejectPruning,
  isExpanded,
  onToggleExpand,
  hasChildren
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${depth * 20}px`,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/item">
      <div 
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer",
          isEditing ? "bg-indigo-500/10 text-indigo-100" : "hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
        )}
        onClick={() => onEdit(entry.id)}
      >
        <button 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing p-1 hover:text-indigo-400 transition-colors touch-none" 
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5 opacity-20 group-hover/item:opacity-100" />
        </button>

        {entry.type === 'folder' ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleExpand(entry.id); }}
            className="p-1 hover:bg-zinc-700/50 rounded transition-colors"
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !isExpanded && "-rotate-90")} />
          </button>
        ) : (
          <div className="w-5.5" />
        )}

        <div className={cn(
          "p-1 rounded",
          entry.type === 'folder' ? "bg-indigo-500/10 text-indigo-400" : "bg-zinc-800 text-zinc-500"
        )}>
          {entry.type === 'folder' ? <Folder className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
        </div>

        <span className="flex-1 truncate text-xs font-medium">
          {entry.title}
          {entry.isPruningProposal && (
            <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-500 text-[8px] font-bold rounded uppercase tracking-wider">
              Inactive?
            </span>
          )}
          {entry.isProposalOnly && (
            <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[8px] font-bold rounded uppercase tracking-wider">
              New
            </span>
          )}
          {entry.proposedContent && !entry.isProposalOnly && (
            <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-bold rounded uppercase tracking-wider">
              Update
            </span>
          )}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
          {entry.isPruningProposal && onAcceptPruning && onRejectPruning && (
            <div className="flex items-center gap-0.5 mr-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onAcceptPruning(entry.id); }}
                className="p-1 hover:bg-amber-500/20 rounded text-amber-500"
                title="Deactivate (Prune)"
              >
                <Check className="w-3 h-3" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onRejectPruning(entry.id); }}
                className="p-1 hover:bg-zinc-700 rounded text-zinc-500"
                title="Keep Active"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {entry.type === 'folder' && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onAddChild(entry.id, 'item'); }}
                className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-indigo-400"
                title="항목 추가 (Add Entry)"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onAddChild(entry.id, 'folder'); }}
                className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-indigo-400"
                title="하위 폴더 추가 (Add Subfolder)"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
            </>
          )}
          {onMoveToRoot && (depth > 0 || entry.parentId !== null) && (
            <button 
              onClick={(e) => { e.stopPropagation(); onMoveToRoot(entry.id); }}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-indigo-400 transition-colors"
              title="최상위(루트)로 꺼내기"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleEnabled(entry.id, !entry.enabled); }}
            className={cn("p-1 rounded", entry.enabled ? "text-emerald-500" : "text-zinc-600")}
            title={entry.enabled ? "Enabled" : "Disabled"}
          >
            {entry.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
            className="p-1 hover:bg-red-500/20 rounded text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
