export { default as CodeSandbox } from './CodeSandbox';
export { default as CodePreviewPanel } from './CodePreviewPanel';
export type { CodeBlock } from './CodePreviewPanel';

// Utility to parse code blocks from markdown content
export function parseCodeBlocks(content: string): { language: string; code: string; filename?: string }[] {
  const codeBlockRegex = /```(\w+)?(?:\s+(\S+))?\n([\s\S]*?)```/g;
  const blocks: { language: string; code: string; filename?: string }[] = [];

  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [, language = 'text', filename, code] = match;
    blocks.push({
      language: language.toLowerCase(),
      code: code.trim(),
      filename: filename || undefined,
    });
  }

  return blocks;
}

// Check if content contains previewable code
export function hasPreviewableCode(content: string): boolean {
  const blocks = parseCodeBlocks(content);
  const previewableLanguages = ['html', 'htm', 'jsx', 'tsx', 'react', 'javascript', 'js', 'css'];

  return blocks.some(block =>
    previewableLanguages.includes(block.language.toLowerCase())
  );
}
