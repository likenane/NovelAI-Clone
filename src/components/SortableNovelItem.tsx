import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { 
  Folder, 
  BookOpen, 
  GripVertical, 
  ChevronDown, 
  Plus, 
  Edit2, 
  Download, 
  Trash2 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Novel } from '../types';

export interface SortableNovelItemProps {
  novel: Novel;
  childItems: Novel[];
  allNovels: Novel[];
  depth: number;
  
  editTitle: string;
  onSelect: (novel: Novel) => void;
  onStartEdit: (novel: Novel) => void;
  onEditTitleChange: (title: string) => void;
  onSaveTitle: (novel: Novel) => void;
  onDelete: (id: string) => void;
  onDownload: (novel: Novel) => void;
  onAddChild: (parentId: string, type: 'item' | 'folder') => void;
  
  novelExpandedFolders: string[];
  onToggleExpand: (id: string) => void;
  
  isHidden?: boolean;
  isDraggingFolder?: boolean;
  activeDragId: string | null;
  dragIntent?: { id: string; type: 'reorder' | 'nest' | null; insertBelow: boolean; insertLineTargetId?: string | null; targetParentId?: string | null; predictedOrder?: number; } | null;
  currentNovelId: string | null;
  editingNovelId: string | null;
  isOverlay?: boolean;
}

export const SortableNovelItem: React.FC<SortableNovelItemProps> = (props) => {
  const { 
    novel, childItems, allNovels, depth, 
    onSelect, onStartEdit, onEditTitleChange, onSaveTitle, onDelete, onDownload, onAddChild,
    novelExpandedFolders, onToggleExpand,
    isHidden = false, isDraggingFolder = false, activeDragId, dragIntent, currentNovelId, editingNovelId, editTitle,
    isOverlay = false
  } = props;

  const isActive = currentNovelId === novel.id;
  const isEditing = editingNovelId === novel.id;
  const isExpanded = novelExpandedFolders.includes(novel.id);
  const hasChildren = childItems.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: novel.id,
    disabled: isHidden
  });

  const style = {
    // Only apply the provided transition, but nullify the transform mapping 
    // to prevent sibling items from moving around (Option A: Stable Tree UX)
    transform: undefined,
    transition,
    opacity: (isDragging && !isOverlay) ? 0.4 : 1,
  };

  const isFolderDragging = isDragging || isDraggingFolder;
  const shouldHideChildren = !isExpanded;

  // Render Placeholder for empty folders
  const renderPlaceholder = () => {
    if (novel.type === 'folder' && isExpanded && !hasChildren && !isFolderDragging) {
      return <DroppablePlaceholder folderId={novel.id} depth={depth + 1} />;
    }
    return null;
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "group/item relative flex flex-col",
        isHidden ? "h-0 overflow-hidden opacity-0 pointer-events-none" : "",
        (isDragging && !isOverlay) ? "pointer-events-none" : ""
      )}
      data-type={novel.type}
      data-expanded={isExpanded}
      data-haschildren={hasChildren}
      data-empty={!hasChildren}
      id={`sortable-item-${novel.id}`}
    >
      {/* Drop Lines for Reordering */}
      {!isOverlay && dragIntent?.insertLineTargetId === novel.id && dragIntent.type === 'reorder' && !dragIntent.insertBelow && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 z-10" />
      )}
      {!isOverlay && dragIntent?.insertLineTargetId === novel.id && dragIntent.type === 'reorder' && dragIntent.insertBelow && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 z-10" />
      )}

      <div 
        onClick={() => {
          if (novel.type !== 'folder') onSelect(novel);
        }}
        className={cn(
          "flex flex-col p-3 rounded-xl transition-all border mb-2 cursor-pointer relative overflow-hidden",
          isActive 
            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-100 shadow-lg shadow-indigo-500/5" 
            : "bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700",
          dragIntent?.id === novel.id && dragIntent.type === 'nest'
            ? "bg-indigo-500/20 ring-1 ring-indigo-500 rounded" 
            : ""
        )}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "p-1.5 rounded-lg flex-shrink-0",
            novel.type === 'folder' ? "bg-indigo-500/10" : "bg-zinc-800/50"
          )}>
            {novel.type === 'folder' ? (
              <Folder className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </div>
          
          {isEditing ? (
            <input 
              autoFocus
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              onBlur={() => onSaveTitle(novel)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveTitle(novel)}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-indigo-500 rounded px-2 py-1 text-sm w-full outline-none"
            />
          ) : (
            <span className="truncate font-bold text-sm flex-1 leading-tight">
              {novel.title}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-zinc-800/40">
          <div className="flex items-center gap-1">
            <button 
              {...attributes} 
              {...listeners} 
              className="cursor-pointer active:cursor-grabbing p-1 hover:text-indigo-400 transition-colors touch-none" 
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-3.5 h-3.5 opacity-20 group-hover/item:opacity-100 cursor-grab active:cursor-grabbing" />
            </button>
            
            {novel.type === 'folder' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleExpand(novel.id); }}
                className="p-1 hover:bg-zinc-700/50 rounded transition-colors"
                title="Toggle Folder"
              >
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-zinc-600", !isExpanded && "-rotate-90")} />
              </button>
            )}

            <div className="ml-1 flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                {novel.type === 'folder' ? 'Folder' : 'Novel'}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 transition-all duration-200">
            {novel.type === 'folder' && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddChild(novel.id, 'item'); }}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 transition-colors"
                  title="Add Novel to Folder"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddChild(novel.id, 'folder'); }}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 transition-colors"
                  title="Add Subfolder"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onStartEdit(novel); }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 transition-colors"
              title="Rename"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDownload(novel); }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400 transition-colors"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(novel.id); }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {novel.type === 'folder' && (
        <div 
          className={cn(
            "flex flex-col transition-all duration-200", 
            shouldHideChildren ? "h-0 overflow-hidden opacity-0" : ""
          )}
        >
          <SortableContext 
            items={childItems.map(c => c.id)} 
            strategy={verticalListSortingStrategy}
          >
            {childItems.map(child => (
              <SortableNovelItem
                key={child.id}
                {...props}
                novel={child}
                childItems={allNovels.filter(n => n.parentId === child.id).sort((a,b)=>(a.order||0)-(b.order||0))}
                depth={depth + 1}
                isHidden={shouldHideChildren || isHidden}
                isDraggingFolder={isFolderDragging}
              />
            ))}
          </SortableContext>
          {renderPlaceholder()}
        </div>
      )}
    </div>
  );
};

const DroppablePlaceholder = ({ folderId, depth }: { folderId: string, depth: number }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `placeholder-${folderId}`,
  });

  // Keep same footprint as real NovelItem (roughly 85px height + mb-2)
  return (
    <div
      ref={setNodeRef}
      style={{ marginLeft: `${depth * 16}px` }}
      className={cn(
        "mb-2 p-3 rounded-xl border-2 border-dashed flex items-center justify-center min-h-[85px] transition-all",
        isOver ? "border-indigo-500 bg-indigo-500/20 opacity-100" : "border-zinc-700/50 bg-zinc-900/10 opacity-50"
      )}
    >
      <span className={cn("text-sm font-bold", isOver ? "text-indigo-400" : "text-zinc-500")}>Drop nested item here</span>
    </div>
  );
};
