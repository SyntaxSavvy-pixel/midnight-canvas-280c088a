import { useState, useRef, KeyboardEvent } from 'react';
import { ArrowUp, Paperclip, File, Plus, Trash, Loader2 } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { usePerplexicaChat } from '@/contexts/PerplexicaChatContext';
import { cn } from '@/lib/utils';
import OptimizationModeSelector from './OptimizationModeSelector';

const PerplexicaMessageInput = () => {
  const { loading, sendMessage, uploadFiles, files, removeFile, clearFiles } = usePerplexicaChat();
  const [message, setMessage] = useState('');
  const [textareaRows, setTextareaRows] = useState(1);
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || loading) return;

    await sendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    try {
      await uploadFiles(e.target.files);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative bg-secondary/50 backdrop-blur-sm p-3 flex items-end overflow-visible border border-border/50 shadow-lg transition-all duration-200',
          mode === 'multi' ? 'flex-col rounded-2xl space-y-2' : 'flex-row rounded-full space-x-2'
        )}
      >
        {/* Left side controls */}
        <div className={cn(
          'flex items-center gap-2',
          mode === 'multi' ? 'w-full' : ''
        )}>
          <OptimizationModeSelector />

          {/* File Upload Button */}
          {files.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/80 transition duration-200 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Paperclip size={18} />
              )}
            </button>
          ) : (
            <FilesList />
          )}

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt,.doc"
            multiple
            hidden
          />
        </div>

        {/* Textarea */}
        <TextareaAutosize
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onHeightChange={(height, props) => {
            const rows = Math.ceil(height / props.rowHeight);
            setTextareaRows(rows);
            setMode(rows >= 2 ? 'multi' : 'single');
          }}
          placeholder={loading ? "AI is thinking..." : "Ask anything..."}
          disabled={loading}
          className="flex-1 bg-transparent placeholder:text-muted-foreground/50 text-sm resize-none focus:outline-none max-h-32 disabled:opacity-50"
          maxRows={6}
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={message.trim().length === 0 || loading}
          className="bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition duration-200 rounded-full p-2.5 shrink-0"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ArrowUp size={18} />
          )}
        </button>
      </form>
    </div>
  );
};

const FilesList = () => {
  const { files, removeFile, clearFiles } = usePerplexicaChat();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { uploadFiles } = usePerplexicaChat();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    try {
      await uploadFiles(e.target.files);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative group">
      <button
        type="button"
        className="p-2 text-primary hover:text-primary/80 rounded-xl hover:bg-secondary/80 transition duration-200 flex items-center gap-1"
      >
        <File size={18} />
        <span className="text-xs">{files.length}</span>
      </button>

      {/* Dropdown */}
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Attached files</h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {uploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Add</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={clearFiles}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Trash size={14} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt,.doc"
            multiple
            hidden
          />

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.fileId}
                className="flex items-center gap-2 p-2 bg-secondary/50 rounded-md"
              >
                <div className="bg-secondary p-1.5 rounded">
                  <File size={14} className="text-muted-foreground" />
                </div>
                <p className="text-xs flex-1 truncate">
                  {file.fileName.length > 25
                    ? file.fileName.substring(0, 25) + '...' + file.fileExtension
                    : file.fileName}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerplexicaMessageInput;
