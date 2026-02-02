import { useState, useCallback } from 'react';
import { Code, Eye, Download, Copy, Check, Maximize2, Minimize2, X } from 'lucide-react';
import CodeSandbox from './CodeSandbox';

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
}

interface CodePreviewPanelProps {
  blocks: CodeBlock[];
  onClose?: () => void;
}

type ViewMode = 'preview' | 'code' | 'split';

const CodePreviewPanel = ({ blocks, onClose }: CodePreviewPanelProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeBlock = blocks[activeBlockIndex];

  // Determine the preview language type
  const getPreviewLanguage = (lang: string): 'html' | 'react' | 'javascript' | 'css' => {
    const normalized = lang.toLowerCase();
    if (['jsx', 'tsx', 'react'].includes(normalized)) return 'react';
    if (['js', 'javascript'].includes(normalized)) return 'javascript';
    if (['css', 'scss', 'sass'].includes(normalized)) return 'css';
    return 'html';
  };

  // Check if code is previewable
  const isPreviewable = (lang: string): boolean => {
    const previewable = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'];
    return previewable.includes(lang.toLowerCase());
  };

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(activeBlock.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeBlock.code]);

  const handleDownload = useCallback(async () => {
    try {
      // Try to use the API for better project generation
      const response = await fetch('/api/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });

      if (response.ok) {
        const { files, projectType } = await response.json();

        if (files.length === 1) {
          // Single file - download directly
          downloadFile(files[0].name, files[0].content);
        } else {
          // Multiple files - create combined download
          // In a production app, you'd use JSZip here
          // For now, download as separate files or combine into HTML
          const projectName = projectType === 'react' ? 'react-project' : 'project';

          // Create a manifest and zip simulation
          const manifest = files.map((f: { name: string }) => f.name).join('\n');

          // Download the main file (index.html or package.json)
          const mainFile = files.find((f: { name: string }) =>
            f.name === 'index.html' || f.name === 'package.json'
          );

          if (mainFile) {
            // For simplicity, download as combined HTML for now
            if (projectType === 'html') {
              downloadFile('project.html', mainFile.content);
            } else {
              // For React, download a setup script
              const setupGuide = `# TabKeep React Project\n\n## Files to create:\n\n${
                files.map((f: { name: string; content: string }) =>
                  `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``
                ).join('\n\n')
              }`;
              downloadFile(`${projectName}-setup.md`, setupGuide);
            }
          }
        }
      } else {
        // Fallback to simple download
        downloadProject(blocks);
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to simple download
      downloadProject(blocks);
    }
  }, [blocks]);

  const canPreview = isPreviewable(activeBlock.language);

  return (
    <div
      className={`
        bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden
        ${isFullscreen ? 'fixed inset-4 z-50' : 'mt-4'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f0f] border-b border-[#333]">
        <div className="flex items-center gap-2">
          {/* File tabs if multiple blocks */}
          {blocks.length > 1 ? (
            <div className="flex gap-1">
              {blocks.map((block, index) => (
                <button
                  key={index}
                  onClick={() => setActiveBlockIndex(index)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    index === activeBlockIndex
                      ? 'bg-[#2a2a2a] text-white'
                      : 'text-[#888] hover:text-white hover:bg-[#1f1f1f]'
                  }`}
                >
                  {block.filename || `${block.language}.${getExtension(block.language)}`}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[#888] font-mono">
              {activeBlock.filename || activeBlock.language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          {canPreview && (
            <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode('code')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'code' ? 'bg-[#2a2a2a] text-white' : 'text-[#666] hover:text-white'
                }`}
                title="Code only"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'split' ? 'bg-[#2a2a2a] text-white' : 'text-[#666] hover:text-white'
                }`}
                title="Split view"
              >
                <div className="w-3.5 h-3.5 flex gap-0.5">
                  <div className="flex-1 border border-current rounded-sm" />
                  <div className="flex-1 border border-current rounded-sm" />
                </div>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'preview' ? 'bg-[#2a2a2a] text-white' : 'text-[#666] hover:text-white'
                }`}
                title="Preview only"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-[#666] hover:text-white hover:bg-[#2a2a2a] transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-[#666] hover:text-white hover:bg-[#2a2a2a] transition-colors"
            title="Download project"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md text-[#666] hover:text-white hover:bg-[#2a2a2a] transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#666] hover:text-white hover:bg-[#2a2a2a] transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={`
          flex
          ${viewMode === 'split' ? 'flex-row' : 'flex-col'}
          ${isFullscreen ? 'h-[calc(100%-44px)]' : 'h-[400px]'}
        `}
      >
        {/* Code panel */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div
            className={`
              overflow-auto bg-[#0f0f0f]
              ${viewMode === 'split' ? 'w-1/2 border-r border-[#333]' : 'flex-1'}
            `}
          >
            <pre className="p-4 text-sm font-mono text-[#e5e5e5] whitespace-pre-wrap">
              <code>{activeBlock.code}</code>
            </pre>
          </div>
        )}

        {/* Preview panel */}
        {canPreview && (viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} bg-white`}>
            <CodeSandbox
              code={activeBlock.code}
              language={getPreviewLanguage(activeBlock.language)}
              className="h-full"
            />
          </div>
        )}

        {/* Non-previewable code message */}
        {!canPreview && viewMode !== 'code' && (
          <div className="flex-1 flex items-center justify-center bg-[#0f0f0f] text-[#666] text-sm">
            Preview not available for {activeBlock.language} files
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get file extension
function getExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    jsx: 'jsx',
    tsx: 'tsx',
    html: 'html',
    css: 'css',
    python: 'py',
    json: 'json',
    react: 'jsx',
  };
  return extensions[language.toLowerCase()] || language;
}

// Download project as zip
async function downloadProject(blocks: CodeBlock[]) {
  // For single file, download directly
  if (blocks.length === 1) {
    const block = blocks[0];
    const filename = block.filename || `code.${getExtension(block.language)}`;
    downloadFile(filename, block.code);
    return;
  }

  // For multiple files, create a simple HTML project
  // In production, you'd use JSZip for proper zip creation
  const htmlBlocks = blocks.filter(b => ['html', 'htm'].includes(b.language.toLowerCase()));
  const cssBlocks = blocks.filter(b => ['css', 'scss'].includes(b.language.toLowerCase()));
  const jsBlocks = blocks.filter(b => ['js', 'javascript', 'jsx', 'tsx'].includes(b.language.toLowerCase()));

  // Create combined HTML file
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TabKeep Generated Project</title>
  <style>
${cssBlocks.map(b => b.code).join('\n\n')}
  </style>
</head>
<body>
${htmlBlocks.map(b => b.code).join('\n\n')}
  <script>
${jsBlocks.map(b => b.code).join('\n\n')}
  </script>
</body>
</html>`;

  downloadFile('project.html', html);
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default CodePreviewPanel;
