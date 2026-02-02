import { useState, useEffect } from 'react';
import { X, Code, Eye, Download, Copy, Check, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { CodeSandbox } from './CodePreview';

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

interface PreviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  codeBlocks: CodeBlock[];
  isStreaming?: boolean;
}

type ViewMode = 'preview' | 'code';

const PreviewSidebar = ({ isOpen, onClose, codeBlocks = [], isStreaming }: PreviewSidebarProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);
  const [isRendering, setIsRendering] = useState(false);

  const activeBlock = codeBlocks[activeBlockIndex] || { language: 'html', code: '' };

  // Reset to first block when blocks change
  useEffect(() => {
    if (codeBlocks.length > 0 && activeBlockIndex >= codeBlocks.length) {
      setActiveBlockIndex(0);
    }
  }, [codeBlocks, activeBlockIndex]);

  // Refresh preview when streaming completes
  useEffect(() => {
    if (!isStreaming && codeBlocks.length > 0) {
      setIsRendering(true);
      setKey(prev => prev + 1);
      // Small delay to show rendering state
      const timer = setTimeout(() => setIsRendering(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, codeBlocks]);

  // Show rendering state when code changes during streaming
  useEffect(() => {
    if (isStreaming && activeBlock.code) {
      setIsRendering(true);
      const timer = setTimeout(() => {
        setKey(prev => prev + 1);
        setIsRendering(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, activeBlock.code?.length]);

  const getPreviewLanguage = (lang: string): 'html' | 'react' | 'javascript' | 'css' => {
    const normalized = lang.toLowerCase();
    if (['jsx', 'tsx', 'react'].includes(normalized)) return 'react';
    if (['js', 'javascript'].includes(normalized)) return 'javascript';
    if (['css', 'scss', 'sass'].includes(normalized)) return 'css';
    return 'html';
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeBlock.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = getExtension(activeBlock.language);
    const filename = activeBlock.filename || `code.${ext}`;
    const blob = new Blob([activeBlock.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenExternal = () => {
    // Create a blob URL and open in new tab
    const html = generateFullHTML(activeBlock.code, activeBlock.language);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleRefresh = () => {
    setIsRendering(true);
    setKey(prev => prev + 1);
    setTimeout(() => setIsRendering(false), 500);
  };

  return (
    <div
      className={`
        h-screen bg-[#0f0f0f] border-l border-[#1a1a1a] flex flex-col overflow-hidden
        transition-all duration-300 ease-out
        ${isOpen ? 'w-[500px]' : 'w-0'}
      `}
    >
      {/* Header - min-width prevents content collapse during transition */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] min-w-[500px]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#e5e5e5]">Preview</span>
          {(isStreaming || isRendering) && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isStreaming ? 'Generating...' : 'Rendering...'}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4 text-[#666]" />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] min-w-[500px]">
        {/* View mode toggle */}
        <div className="flex bg-[#1a1a1a] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${viewMode === 'preview' ? 'bg-[#2a2a2a] text-white' : 'text-[#666] hover:text-white'
              }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${viewMode === 'code' ? 'bg-[#2a2a2a] text-white' : 'text-[#666] hover:text-white'
              }`}
          >
            <Code className="w-3.5 h-3.5" />
            Code
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className={`p-1.5 rounded-md text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors ${isRendering ? 'animate-spin' : ''}`}
            title="Refresh"
            disabled={isRendering}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded-md text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File tabs if multiple blocks */}
      {codeBlocks.length > 1 && (
        <div className="flex gap-1 px-4 py-2 border-b border-[#1a1a1a] bg-[#0a0a0a] overflow-x-auto min-w-[500px]">
          {codeBlocks.map((block, index) => (
            <button
              key={index}
              onClick={() => setActiveBlockIndex(index)}
              className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${index === activeBlockIndex
                  ? 'bg-[#2a2a2a] text-white'
                  : 'text-[#666] hover:text-white hover:bg-[#1a1a1a]'
                }`}
            >
              {block.filename || `${block.language}.${getExtension(block.language)}`}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden relative min-w-[500px]">
        {viewMode === 'preview' ? (
          <div className="h-full flex items-start justify-center p-4 bg-[#1a1a1a] overflow-auto">
            <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300">
              {activeBlock.code ? (
                <>
                  {/* Loading overlay */}
                  {isRendering && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        <span className="text-xs text-gray-500">Rendering preview...</span>
                      </div>
                    </div>
                  )}
                  <CodeSandbox
                    key={key}
                    code={activeBlock.code}
                    language={getPreviewLanguage(activeBlock.language)}
                    className="h-full"
                  />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 p-8">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Code className="w-6 h-6 text-gray-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Waiting for code...</p>
                    <p className="text-xs text-gray-400 mt-1">Ask me to create something!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto bg-[#0a0a0a]">
            {activeBlock.code ? (
              <pre className="p-4 text-sm font-mono text-[#e5e5e5] whitespace-pre-wrap">
                <code>{activeBlock.code}</code>
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-[#666] text-sm">
                No code yet...
              </div>
            )}
          </div>
        )}

        {/* Streaming indicator overlay */}
        {isStreaming && activeBlock.code && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-xs text-[#888]">Generating code...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
function getExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js', typescript: 'ts', jsx: 'jsx', tsx: 'tsx',
    html: 'html', css: 'css', python: 'py', json: 'json', react: 'jsx',
  };
  return extensions[language.toLowerCase()] || language;
}

function generateFullHTML(code: string, language: string): string {
  const lang = language.toLowerCase();

  if (lang === 'html' || code.includes('<!DOCTYPE') || code.includes('<html')) {
    return code;
  }

  if (['jsx', 'tsx', 'react'].includes(lang)) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7.23.5/babel.min.js"></script>
  <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: system-ui, sans-serif; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef } = React;
    ${code}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(typeof App !== 'undefined' ? App : Component));
  </script>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: system-ui, sans-serif; padding: 16px; }</style>
</head>
<body>
${code}
</body>
</html>`;
}

export default PreviewSidebar;
