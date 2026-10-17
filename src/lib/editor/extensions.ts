import { Mark, mergeAttributes, Extension, Node } from '@tiptap/react';

export const GlobalShortcuts = Extension.create({
  name: 'globalShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        this.options.onGenerate();
        return true;
      },
    }
  },
});

export const Instruction = Node.create({
  name: 'instruction',
  group: 'inline',
  inline: true,
  content: 'text*',
  selectable: true,
  draggable: false,
  atom: false,
  parseHTML() {
    return [{ tag: 'span[data-instruction]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span', 
      mergeAttributes(HTMLAttributes, { 
        'data-instruction': '',
        class: 'instruction-node inline bg-indigo-500/15 text-indigo-300 font-bold border-b border-indigo-500/40 px-1 mx-0.5 rounded-sm cursor-text' 
      }), 
      0
    ]
  },
  renderText({ node }) {
    return `{${node.textContent}}`
  },
  addCommands() {
    return {
      setInstruction: () => ({ state, chain }) => {
        const { selection } = state;
        const { $from } = selection;
        
        if ($from.parent.type.name === 'instruction') {
          return false;
        }

        const startOfParagraph = $from.start($from.depth);
        const endOfParagraph = $from.end($from.depth);
        let textContent = $from.parent.textContent;

        textContent = textContent.replace(/[\{\}]/g, '');

        if (textContent.trim().length > 0) {
          return chain()
            .focus()
            .command(({ tr, state }) => {
              const node = state.schema.nodes.instruction.create({}, state.schema.text(textContent));
              tr.replaceWith(startOfParagraph, endOfParagraph, node);
              const pos = startOfParagraph + textContent.length + 1;
              tr.setSelection((state.selection.constructor as any).create(tr.doc, pos));
              return true;
            });
        } else {
          return chain()
            .focus()
            .insertContent({ 
              type: 'instruction',
              content: [{ type: 'text', text: '  ' }]
            })
            .command(({ tr, state }) => {
              const { to } = state.selection;
              tr.setSelection((state.selection.constructor as any).create(tr.doc, to - 2));
              return true;
            });
        }
      },
    } as any
  },
  addKeyboardShortcuts() {
    return {
      '{': () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'instruction') {
          return true;
        }

        return (this.editor.commands as any).setInstruction();
      },
      '}': () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'instruction') {
          return true;
        }
        return false;
      },
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'instruction') {
          const posAfterParagraph = $from.after(1);
          
          return this.editor.chain()
            .setMeta('prevent-recursion', true)
            .insertContentAt(posAfterParagraph, { type: 'paragraph' })
            .setTextSelection(posAfterParagraph + 1)
            .run();
        }

        return false;
      },
      Backspace: () => {
        const { state, commands } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        if ($from.parent.type.name === 'instruction') {
          if ($from.parentOffset === 0 || $from.parent.textContent.length <= 1) {
            return commands.deleteNode('instruction');
          }
        }
        
        if ($from.nodeBefore?.type.name === 'instruction') {
          return commands.deleteNode('instruction');
        }

        return false;
      },
      Delete: () => {
        const { state, commands } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        if ($from.nodeAfter?.type.name === 'instruction') {
          return commands.deleteNode('instruction');
        }

        return false;
      },
    }
  },
});

export const AIHighlight = Mark.create({
  name: 'aiHighlight',
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'bg-indigo-500/20 text-indigo-400 transition-colors duration-1000',
      },
    }
  },
  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => {
          const hasClass = (element as HTMLElement).classList.contains('bg-indigo-500/20');
          return hasClass ? {} : false;
        },
      },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
});
