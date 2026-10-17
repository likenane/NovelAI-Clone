import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronLeft, 
  Plus, 
  FolderPlus, 
  Upload, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { cn } from '../lib/utils';
import { Novel } from '../types';
import { SortableNovelItem } from './SortableNovelItem';
import { User } from 'firebase/auth';
import { customCollisionDetection } from '../lib/customCollision';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  novels: Novel[];
  currentNovel: Novel | null;
  setCurrentNovel: (novel: Novel | null) => void;
  createNewNovel: (parentId?: string | null, type?: 'item' | 'folder') => void;
  handleUploadNovel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadInputRef: React.RefObject<HTMLInputElement>;
  sensors: any;
  handleNovelDragStart: (event: any) => void;
  handleNovelDragOver: (event: any) => void;
  handleNovelDragEnd: (event: any) => void;
  handleNovelDragCancel: () => void;
  activeDragId: string | null;
  dragIntent: { id: string; type: 'reorder' | 'nest' | null; insertBelow: boolean; insertLineTargetId?: string | null; targetParentId?: string | null; predictedOrder?: number; } | null;
  editingNovelId: string | null;
  editTitle: string;
  startEditingTitle: (novel: Novel) => void;
  setEditTitle: (title: string) => void;
  saveTitle: (novel: Novel) => void;
  setNovelToDelete: (id: string | null) => void;
  downloadNovel: (novel: Novel) => void;
  novelExpandedFolders: string[];
  toggleNovelFolder: (id: string) => void;
  user: User;
  setIsGlobalSettingsOpen: (open: boolean) => void;
  handleLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  novels,
  currentNovel,
  setCurrentNovel,
  createNewNovel,
  handleUploadNovel,
  uploadInputRef,
  sensors,
  handleNovelDragStart,
  handleNovelDragOver,
  handleNovelDragEnd,
  handleNovelDragCancel,
  activeDragId,
  dragIntent,
  editingNovelId,
  editTitle,
  startEditingTitle,
  setEditTitle,
  saveTitle,
  setNovelToDelete,
  downloadNovel,
  novelExpandedFolders,
  toggleNovelFolder,
  user,
  setIsGlobalSettingsOpen,
  handleLogout
}) => {
  const rootNovels = novels.filter(n => !n.parentId).sort((a,b) => (a.order || 0) - (b.order || 0));
  const activeNovelData = activeDragId ? novels.find(n => n.id === activeDragId) : null;
  const isDraggingFolder = activeNovelData?.type === 'folder';

  // Calculate the original depth of the dragged item for overlay re-hydration
  const getDepth = (n: Novel | null, depth = 0): number => {
    if (!n || !n.parentId) return depth;
    const parent = novels.find(p => p.id === n.parentId);
    return getDepth(parent || null, depth + 1);
  };
  const activeDepth = getDepth(activeNovelData);
  return (
    <>
      {/* Sidebar Backdrop (Mobile Only) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            key="sidebar-mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 300 : 0, 
          opacity: isSidebarOpen ? 1 : 0,
          x: isSidebarOpen ? 0 : -300
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "bg-zinc-900 border-r border-zinc-800 flex flex-col z-[70]",
          "fixed inset-y-0 left-0 lg:relative lg:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span>My Novels</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Close Sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {/* New Novel Button at the top of the list */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => createNewNovel()}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">New Novel</span>
            </button>
            <button 
              onClick={() => createNewNovel(null, 'folder')}
              className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-[0.98]"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => uploadInputRef.current?.click()}
              className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-[0.98]"
              title="Upload Novel"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input 
              type="file"
              ref={uploadInputRef}
              onChange={handleUploadNovel}
              accept=".json"
              className="hidden"
            />
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleNovelDragStart}
            onDragOver={handleNovelDragOver}
            onDragEnd={handleNovelDragEnd}
            onDragCancel={handleNovelDragCancel}
          >
            <SortableContext 
              items={rootNovels.map(n => n.id)}
              strategy={verticalListSortingStrategy}
            >
              {rootNovels.map(novel => (
                <SortableNovelItem
                  key={novel.id}
                  novel={novel}
                  childItems={novels.filter(n => n.parentId === novel.id).sort((a,b) => (a.order || 0) - (b.order || 0))}
                  allNovels={novels}
                  depth={0}
                  dragIntent={dragIntent}
                  
                  editTitle={editTitle}
                  onSelect={(n) => {
                    if (currentNovel?.id !== n.id && n.type !== 'folder') {
                      setCurrentNovel(n);
                    }
                  }}
                  onStartEdit={startEditingTitle}
                  onEditTitleChange={setEditTitle}
                  onSaveTitle={saveTitle}
                  onDelete={setNovelToDelete}
                  onDownload={downloadNovel}
                  onAddChild={createNewNovel}
                  
                  novelExpandedFolders={novelExpandedFolders}
                  onToggleExpand={toggleNovelFolder}
                  
                  activeDragId={activeDragId}
                  currentNovelId={currentNovel?.id || null}
                  editingNovelId={editingNovelId}
                />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeNovelData ? (
                <SortableNovelItem
                  novel={activeNovelData}
                  childItems={isDraggingFolder ? novels.filter(n => n.parentId === activeNovelData.id).sort((a,b) => (a.order || 0) - (b.order || 0)) : []}
                  allNovels={novels}
                  depth={activeDepth}
                  
                  editTitle={editTitle}
                  onSelect={() => {}}
                  onStartEdit={() => {}}
                  onEditTitleChange={() => {}}
                  onSaveTitle={() => {}}
                  onDelete={() => {}}
                  onDownload={() => {}}
                  onAddChild={() => {}}
                  
                  novelExpandedFolders={novelExpandedFolders}
                  onToggleExpand={() => {}}
                  
                  activeDragId={activeDragId}
                  currentNovelId={currentNovel?.id || null}
                  editingNovelId={editingNovelId}
                  isHidden={false}
                  isOverlay={true}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={user?.photoURL || ''} className="w-8 h-8 rounded-full border border-zinc-700" alt="" />
            <div className="text-xs truncate max-w-[120px]">
              <p className="font-medium truncate">{user?.displayName}</p>
              <p className="text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsGlobalSettingsOpen(true)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-indigo-400"
              title="Global Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
