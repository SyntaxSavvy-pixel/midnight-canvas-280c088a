import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface CodeSandboxProps {
  code: string;
  language: 'html' | 'react' | 'javascript' | 'css';
  className?: string;
}

// React CDN URLs
const REACT_URLS = {
  react: 'https://unpkg.com/react@18/umd/react.development.js',
  reactDom: 'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  babel: 'https://unpkg.com/@babel/standalone@7.23.5/babel.min.js',
};

const CodeSandbox = ({ code, language, className = '' }: CodeSandboxProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !code) return;

    setIsLoading(true);
    setError(null);

    const renderContent = () => {
      try {
        let htmlContent = '';

        if (language === 'html' || language === 'css') {
          htmlContent = generateHTMLDocument(code, language);
        } else if (language === 'javascript') {
          htmlContent = generateJSDocument(code);
        } else if (language === 'react') {
          htmlContent = generateReactDocument(code);
        }

        // Write to iframe
        const doc = iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
        }

        // Give iframe time to render
        setTimeout(() => setIsLoading(false), 200);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render preview');
        setIsLoading(false);
      }
    };

    // Small delay to ensure iframe is ready
    const timer = setTimeout(renderContent, 50);
    return () => clearTimeout(timer);
  }, [code, language]);

  // Listen for errors from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'preview-error') {
        setError(event.data.message);
        setIsLoading(false);
      }
      if (event.data?.type === 'preview-ready') {
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!code) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-400 ${className}`}>
        <span className="text-sm">No code to preview</span>
      </div>
    );
  }

  return (
    <div className={`relative bg-white overflow-hidden ${className}`}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            <span className="text-xs text-gray-400">Loading preview...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 p-4 z-10">
          <div className="flex items-start gap-2 text-red-600 text-sm max-w-full">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        </div>
      )}

      {/* Sandbox iframe */}
      <iframe
        ref={iframeRef}
        title="Code Preview"
        sandbox="allow-scripts allow-modals allow-same-origin"
        className="w-full h-full border-0 bg-white"
        style={{ minHeight: '200px' }}
      />
    </div>
  );
};

// Generate HTML document for pure HTML/CSS
function generateHTMLDocument(code: string, language: string): string {
  if (language === 'css') {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 16px; }
    ${code}
  </style>
</head>
<body>
  <div class="preview-container">
    <h1>CSS Preview</h1>
    <p>Your CSS styles are applied to this page.</p>
    <button>Sample Button</button>
    <div class="box" style="width: 100px; height: 100px; background: #eee; margin-top: 16px;"></div>
  </div>
  <script>window.parent.postMessage({ type: 'preview-ready' }, '*');</script>
</body>
</html>`;
  }

  // Check if code is a full HTML document or just a fragment
  if (code.includes('<!DOCTYPE') || code.includes('<html')) {
    // Inject error handler and ready signal
    const injectedScript = `
<script>
  window.onerror = function(msg, url, line) {
    window.parent.postMessage({ type: 'preview-error', message: msg }, '*');
    return true;
  };
  window.parent.postMessage({ type: 'preview-ready' }, '*');
</script>`;

    // Insert before </body> or at end
    if (code.includes('</body>')) {
      return code.replace('</body>', injectedScript + '</body>');
    }
    return code + injectedScript;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
${code}
<script>
  window.onerror = function(msg, url, line) {
    window.parent.postMessage({ type: 'preview-error', message: msg }, '*');
    return true;
  };
  window.parent.postMessage({ type: 'preview-ready' }, '*');
</script>
</body>
</html>`;
}

// Generate document for JavaScript
function generateJSDocument(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; }
    #output { white-space: pre-wrap; font-family: 'SF Mono', Menlo, monospace; background: #f5f5f5; padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    window.onerror = function(msg, url, line) {
      window.parent.postMessage({ type: 'preview-error', message: msg }, '*');
      return true;
    };

    // Capture console.log output
    const output = document.getElementById('output');
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    function formatValue(val) {
      if (val === undefined) return 'undefined';
      if (val === null) return 'null';
      if (typeof val === 'object') return JSON.stringify(val, null, 2);
      return String(val);
    }

    console.log = function(...args) {
      originalLog.apply(console, args);
      output.textContent += args.map(formatValue).join(' ') + '\\n';
    };

    console.error = function(...args) {
      originalError.apply(console, args);
      output.innerHTML += '<span style="color: #dc2626;">' + args.map(formatValue).join(' ') + '</span>\\n';
    };

    console.warn = function(...args) {
      originalWarn.apply(console, args);
      output.innerHTML += '<span style="color: #ca8a04;">' + args.map(formatValue).join(' ') + '</span>\\n';
    };

    try {
      ${code}
      window.parent.postMessage({ type: 'preview-ready' }, '*');
    } catch (e) {
      window.parent.postMessage({ type: 'preview-error', message: e.message }, '*');
    }
  </script>
</body>
</html>`;
}

// Generate document for React
function generateReactDocument(code: string): string {
  // Escape the code for embedding
  const escapedCode = code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="${REACT_URLS.react}"></script>
  <script src="${REACT_URLS.reactDom}"></script>
  <script src="${REACT_URLS.babel}"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.onerror = function(msg, url, line) {
      window.parent.postMessage({ type: 'preview-error', message: msg }, '*');
      return true;
    };
  </script>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useCallback, useMemo, useContext, createContext } = React;

    try {
      ${escapedCode}

      // Try to find and render the main component
      const componentNames = ['App', 'Component', 'Main', 'Root', 'Page', 'Home'];
      let MainComponent = null;

      for (const name of componentNames) {
        if (typeof window[name] === 'function') {
          MainComponent = window[name];
          break;
        }
      }

      // Check if any function component was defined
      if (!MainComponent) {
        const definedFunctions = Object.keys(window).filter(
          key => typeof window[key] === 'function' &&
          /^[A-Z]/.test(key) &&
          !['Array', 'Boolean', 'Date', 'Error', 'Function', 'JSON', 'Math', 'Number', 'Object', 'RegExp', 'String', 'Promise', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Proxy', 'Reflect', 'Intl', 'WebAssembly', 'React', 'ReactDOM'].includes(key)
        );
        if (definedFunctions.length > 0) {
          MainComponent = window[definedFunctions[0]];
        }
      }

      if (MainComponent) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(MainComponent));
        window.parent.postMessage({ type: 'preview-ready' }, '*');
      } else {
        document.getElementById('root').innerHTML = '<div style="padding: 20px; color: #666; text-align: center;"><p>No React component found.</p><p style="font-size: 12px; margin-top: 8px;">Define a component named App or use function ComponentName() { ... }</p></div>';
        window.parent.postMessage({ type: 'preview-ready' }, '*');
      }
    } catch (e) {
      window.parent.postMessage({ type: 'preview-error', message: e.message }, '*');
    }
  </script>
</body>
</html>`;
}

export default CodeSandbox;
