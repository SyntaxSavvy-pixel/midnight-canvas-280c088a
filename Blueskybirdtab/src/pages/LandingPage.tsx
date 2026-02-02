import { useState, useEffect } from 'react';
import { Download, ArrowRight, Laptop, Monitor } from 'lucide-react';

interface LandingPageProps {
    onSignIn: () => void;
}

const LandingPage = ({ onSignIn }: LandingPageProps) => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [os, setOs] = useState<'mac' | 'windows' | 'linux' | 'other'>('other');

    useEffect(() => {
        // Detect OS for custom download button text
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.includes('mac')) setOs('mac');
        else if (userAgent.includes('win')) setOs('windows');
        else if (userAgent.includes('linux')) setOs('linux');

        // Listen for PWA install prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleDownload = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                }
                setInstallPrompt(null);
            });
        } else {
            // Fallback instructions if PWA prompt not available (already installed or not supported)
            alert("To install TabKeep:\n\nChrome: Click the install icon in the address bar.\nSafari: Share > Add to Home Screen.");
        }
    };

    return (
        <div className="min-h-screen w-full bg-[var(--bg-background)] text-[var(--text-primary)] flex flex-col items-center relative overflow-hidden font-sans selection:bg-blue-500/30">

            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[120px]" />
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
                        opacity: 0.4
                    }}
                />
            </div>

            {/* Nav */}
            <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <img src="/favicon.png" alt="Logo" className="w-8 h-8 rounded-lg" />
                    <span className="font-semibold text-lg tracking-tight">TabKeep</span>
                </div>
                <button
                    onClick={onSignIn}
                    className="px-5 py-2 rounded-full border border-[var(--border-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-sm font-medium transition-all"
                >
                    Sign In
                </button>
            </nav>

            {/* Hero */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 max-w-4xl mx-auto mt-[-8vh]">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8 animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    New Engine v2.0
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-8 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                    The browser <br /> for your mind.
                </h1>

                <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mb-12 leading-relaxed">
                    TabKeep represents a shift in how we interact with the internet.
                    Focused, fluid, and designed to keep you in the flow.
                </p>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={handleDownload}
                        className="group relative px-8 py-4 rounded-full bg-[#e5e5e5] text-black font-semibold text-base transition-transform hover:scale-105 active:scale-95 flex items-center gap-3 w-full md:w-auto justify-center"
                    >
                        <Download className="w-5 h-5" />
                        <span>
                            Download for {os === 'mac' ? 'Mac' : os === 'linux' ? 'Linux' : 'Windows'}
                        </span>
                        <span className="absolute inset-0 rounded-full ring-2 ring-white/50 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button
                        onClick={onSignIn}
                        className="px-8 py-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium text-base hover:bg-[var(--bg-surface-hover)] transition-all flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        Open in Browser
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="mt-8 flex items-center gap-6 text-[var(--text-secondary)] text-xs font-medium">
                    <span className="flex items-center gap-1.5"><Monitor className="w-4 h-4" /> macOS</span>
                    <span className="flex items-center gap-1.5"><Laptop className="w-4 h-4" /> Windows</span>
                    <span className="flex items-center gap-1.5"><Laptop className="w-4 h-4" /> Linux</span>
                </div>
            </main>

            {/* Footer Visual */}
            <div className="w-full max-w-5xl mx-auto px-4 mt-12 mb-0 relative z-10 translate-y-[20%] opacity-80">
                <div className="rounded-t-2xl border-t border-l border-r border-[var(--border-primary)] bg-[var(--bg-surface)] p-2 shadow-2xl">
                    <div className="w-full h-8 bg-[var(--bg-background)] rounded-t-lg mb-2 flex items-center px-4 gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[#333]" />
                            <div className="w-3 h-3 rounded-full bg-[#333]" />
                            <div className="w-3 h-3 rounded-full bg-[#333]" />
                        </div>
                    </div>
                    <div className="w-full aspect-[16/9] bg-[#0a0a0a] rounded-b-lg relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-[#333] font-mono text-sm group-hover:text-[#555] transition-colors">TabKeep Interface Preview</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LandingPage;
