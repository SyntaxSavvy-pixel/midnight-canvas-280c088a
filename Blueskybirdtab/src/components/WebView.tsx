import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface WebViewProps {
    url: string;
    onUrlChange?: (url: string) => void;
    className?: string;
}

const WebView = ({ url, onUrlChange, className = '' }: WebViewProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setError(null);
        setIsLoading(true);
    }, [url]);

    const handleLoad = () => {
        setIsLoading(false);
        setError(null);
    };

    const handleError = () => {
        setIsLoading(false);
        setError('Failed to load page. Some sites cannot be embedded due to security restrictions.');
    };

    // Check if URL is likely to have X-Frame-Options restrictions
    const isLikelyRestricted = (url: string) => {
        // We allow google via igu=1 hack
        const restrictedDomains = ['facebook.com', 'twitter.com', 'instagram.com'];
        return restrictedDomains.some(domain => url.includes(domain));
    };

    if (error || isLikelyRestricted(url)) {
        return (
            <div className={`flex flex-col items-center justify-center h-full bg-[var(--bg-background)] ${className}`}>
                <div className="max-w-md text-center space-y-4 p-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">
                        Cannot Embed This Site
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {error || 'This website cannot be displayed in an embedded frame due to security restrictions.'}
                    </p>
                    <button
                        onClick={() => window.open(url, '_blank')}
                        className="px-4 py-2 bg-[var(--theme-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Open in New Tab
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-background)]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
                    </div>
                </div>
            )}
            <iframe
                ref={iframeRef}
                src={url}
                onLoad={handleLoad}
                onError={handleError}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                title="Web content"
            />
        </div>
    );
};

export default WebView;
