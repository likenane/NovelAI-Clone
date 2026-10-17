import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  novelToDelete: string | null;
  setNovelToDelete: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  novelToDelete,
  setNovelToDelete,
  onDelete
}) => {
  return (
    <AnimatePresence>
      {novelToDelete && (
        <motion.div 
          key="delete-modal-overlay"
          className="fixed inset-0 z-[190] flex items-center justify-center p-4"
        >
          <motion.div 
            key="delete-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNovelToDelete(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            key="delete-modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full space-y-6"
          >
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold">Delete Novel?</h3>
              <p className="text-sm text-zinc-400">This action cannot be undone. All story content will be permanently removed.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setNovelToDelete(null)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDelete(novelToDelete);
                  setNovelToDelete(null);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
