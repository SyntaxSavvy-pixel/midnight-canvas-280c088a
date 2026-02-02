import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { Note } from '@/hooks/useNotes';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onCreateNote: (title?: string, content?: string) => Promise<Note>;
  onUpdateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

const NotesPanel = ({
  isOpen,
  onClose,
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: NotesPanelProps) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimatingOut(false);
      setIsVisible(true);
    } else if (isVisible) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
        setSelectedNote(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Load selected note content
  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
    }
  }, [selectedNote]);

  // Auto-save with debounce
  useEffect(() => {
    if (!selectedNote) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (editTitle !== selectedNote.title || editContent !== selectedNote.content) {
        onUpdateNote(selectedNote.id, { title: editTitle, content: editContent });
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editTitle, editContent, selectedNote, onUpdateNote]);

  const handleCreateNote = async () => {
    const newNote = await onCreateNote();
    setSelectedNote(newNote);
    setTimeout(() => contentRef.current?.focus(), 100);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDeleteNote(id);
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const handleBack = () => {
    setSelectedNote(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isVisible && !isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-40
          transition-opacity duration-300
          ${isOpen && !isAnimatingOut ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-[360px] max-w-[90vw]
          bg-[#0f0f0f] border-l border-[#1a1a1a]
          z-50 flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen && !isAnimatingOut ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1a1a1a]">
          {selectedNote ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[#888] hover:text-[#ccc] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
          ) : (
            <h2 className="text-sm font-medium text-[#e5e5e5]">Notes</h2>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4 text-[#555]" />
          </button>
        </div>

        {/* Content */}
        {selectedNote ? (
          // Note Editor
          <div className="flex-1 flex flex-col overflow-hidden">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Note title..."
              className="px-4 py-3 bg-transparent text-[#e5e5e5] text-base font-medium placeholder:text-[#444] focus:outline-none border-b border-[#1a1a1a]"
            />
            <textarea
              ref={contentRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write your note..."
              className="flex-1 px-4 py-3 bg-transparent text-[#ccc] text-sm leading-relaxed placeholder:text-[#444] focus:outline-none resize-none"
            />
            <div className="px-4 py-2 border-t border-[#1a1a1a] text-[10px] text-[#444]">
              Last edited {formatDate(selectedNote.updatedAt)}
            </div>
          </div>
        ) : (
          // Notes List
          <div className="flex-1 overflow-y-auto">
            {/* New Note Button */}
            <div className="p-3">
              <button
                onClick={handleCreateNote}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-[#252525] text-[#ccc] text-sm font-medium hover:bg-[#1f1f1f] hover:border-[#2a2a2a] transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            </div>

            {/* Notes */}
            {notes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#444]">
                No notes yet. Create one to get started.
              </p>
            ) : (
              <div className="px-3 space-y-1">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-[#141414] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e5e5e5] truncate">
                        {note.title || 'Untitled Note'}
                      </p>
                      <p className="text-xs text-[#555] truncate mt-0.5">
                        {note.content || 'No content'}
                      </p>
                      <p className="text-[10px] text-[#444] mt-1">
                        {formatDate(note.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#555]" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default NotesPanel;
