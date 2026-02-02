import { useState, useEffect, useRef } from 'react';
import {
     ArrowLeft, ArrowRight, RotateCcw,
     Mic, Search, Globe, Lock,
     ShieldCheck, ShieldAlert, Key, Puzzle, // Extensions
     Battery, BatteryCharging, Maximize
 } from 'lucide-react';
import { useBattery } from '@/hooks/useBattery';
import { useLayout } from '@/contexts/LayoutContext';
import ThemeDropdown from './ThemeDropdown';

interface CommandHeaderProps {
    url?: string;
    onNavigate: (url: string) => void;
    onRefresh?: () => void;
    onBack?: () => void;
    onForward?: () => void;
    isLoading?: boolean;
    isWebMode?: boolean;
    onOpenThemeStudio?: () => void;
}

const CommandHeader = ({
    url = '',
    onNavigate,
    onRefresh,
    onBack,
    onForward,
    isLoading = false,
    isWebMode = false,
    onOpenThemeStudio
}: CommandHeaderProps) => {
    const [inputVal, setInputVal] = useState(url);
    const [isFocused, setIsFocused] = useState(false);
    const [adBlockEnabled, setAdBlockEnabled] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const { level, charging } = useBattery();
    const { setImmersiveMode } = useLayout();

    useEffect(() => {
        if (!isFocused) {
            setInputVal(url);
        }
    }, [url, isFocused]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputVal.trim()) {
            onNavigate(inputVal.trim());
            inputRef.current?.blur();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            inputRef.current?.blur();
            setInputVal(url);
        }
    };

    // Format URL for display when not focused
    const displayValue = isFocused ? inputVal : (
        url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : ''
    );

    return (
        <div className="flex items-center gap-2 px-3 py-2 w-full bg-[var(--bg-background)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] z-50 sticky top-0 transition-all duration-300">

            {/* Navigation Controls (Left) */}
            <div className="flex items-center gap-1">
                <button
                    onClick={onBack}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 transition-all"
                    disabled={!onBack}
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={onForward}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 transition-all"
                    disabled={!onForward}
                >
                    <ArrowRight className="w-4 h-4" />
                </button>
                <button
                    onClick={onRefresh}
                    className={`p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] transition-all ${isLoading ? 'animate-spin' : ''}`}
                    disabled={!onRefresh}
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Omnibox (Center) */}
            <div className={`
         flex-1 flex items-center gap-2 px-3 py-1.5 h-9 
         bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] 
         focus-within:border-[var(--theme-accent)] focus-within:ring-1 focus-within:ring-[var(--theme-accent)]/20
         transition-all duration-200 shadow-sm
      `}>
                {/* Icon Context */}
                <div className="flex-shrink-0 text-[var(--text-secondary)]">
                    {isWebMode ? (
                        url.startsWith('https') ? <Lock className="w-3.5 h-3.5 text-green-500" /> : <Globe className="w-3.5 h-3.5" />
                    ) : (
                        <Search className="w-3.5 h-3.5" />
                    )}
                </div>

                <form onSubmit={handleSubmit} className="flex-1 min-w-0">
                    <input
                        ref={inputRef}
                        type="text"
                        value={isFocused ? inputVal : displayValue}
                        onChange={(e) => setInputVal(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search or enter URL..."
                        className="w-full bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                    />
                </form>

                {/* Mic (Active) */}
                <button className="p-1 rounded-full hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--theme-accent)] transition-colors">
                    <Mic className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Extensions Tray (Right) */}
            <div className="flex items-center gap-1 pl-1">
                <div className="hidden sm:flex items-center gap-3 px-3 mr-2 border-r border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]" title={`${Math.round(level * 100)}%${charging ? ' Charging' : ''}`}>
                        {charging ? <BatteryCharging className="w-3.5 h-3.5" /> : <Battery className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setAdBlockEnabled(!adBlockEnabled)}
                        title={adBlockEnabled ? "AdShield Active" : "AdShield Paused"}
                        className="p-1.5 rounded-md hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                        {adBlockEnabled ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
                    </button>
                    <button
                        onClick={() => setImmersiveMode(true)}
                        title="Enter Focus Mode"
                        className="p-1.5 rounded-md hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                        <Maximize className="w-4 h-4" />
                    </button>
                </div>

                 <div className="w-[1px] h-4 bg-[var(--border-subtle)] mx-1" />

                 {/* Theme Dropdown Menu */}
                 <ThemeDropdown onOpenThemeStudio={onOpenThemeStudio} />

                 {/* Theme Dropdown Menu */}
                 <ThemeDropdown onOpenThemeStudio={onOpenThemeStudio || (() => {})} />
            </div>

        </div>
    );
};

export default CommandHeader;
