import React from 'react';
import { Sparkles } from 'lucide-react';
import { FullScreenTextEditor } from './FullScreenTextEditor';

interface FullScreenPromptEditorProps {
  fullScreenEdit: { type: 'system' | 'codexSystem', value: string } | null;
  setFullScreenEdit: (val: { type: 'system' | 'codexSystem', value: string } | null) => void;
  applyFullScreenEdit: () => void;
}

export const FullScreenPromptEditor: React.FC<FullScreenPromptEditorProps> = ({
  fullScreenEdit,
  setFullScreenEdit,
  applyFullScreenEdit
}) => {
  const getTitle = (type: string) => {
    switch (type) {
      case 'system': return 'System Prompt Editor';
      case 'codexSystem': return 'Codex System Prompt Editor';
      default: return 'Prompt Editor';
    }
  };

  return (
    <FullScreenTextEditor
      isOpen={!!fullScreenEdit}
      onClose={() => setFullScreenEdit(null)}
      value={fullScreenEdit?.value || ''}
      onChange={(val) => {
        if (fullScreenEdit) {
          setFullScreenEdit({ ...fullScreenEdit, value: val });
        }
      }}
      title={fullScreenEdit ? getTitle(fullScreenEdit.type) : ''}
      description="Refine your AI's behavior and writing style in detail."
      icon={<Sparkles className="w-5 h-5 text-indigo-400" />}
      saveMode="manual"
      onApply={applyFullScreenEdit}
      zIndex="z-[120]"
      placeholder="Enter your detailed prompt instructions here..."
    />
  );
};

