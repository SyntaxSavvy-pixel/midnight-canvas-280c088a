import { useState, useEffect, useRef } from 'react';
import { Sparkles, Crown, X, Zap } from 'lucide-react';

interface UsageIndicatorProps {
  plan: 'Free' | 'Pro' | 'Max';
  used: number;
  limit: number;
  cooldownUntil?: string | null;
}

const UsageIndicator = ({ plan, used, limit, cooldownUntil }: UsageIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const percentage = Math.min(Math.round((used / limit) * 100), 100);
  const isLow = percentage >= 70;
  const isCritical = percentage >= 90;

  // Calculate cooldown time remaining
  const getCooldownText = () => {
    if (!cooldownUntil) return null;
    const now = new Date();
    const cooldown = new Date(cooldownUntil);
    if (now >= cooldown) return null;

    const diff = cooldown.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const cooldownText = getCooldownText();

  // Max users see simple unlimited badge
  if (plan === 'Max') {
    return (
      <div className="fixed bottom-24 right-6 z-50">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-purple-400 font-medium">Unlimited</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-50" ref={popupRef}>
      {/* Popup */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#e5e5e5]">Usage</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                plan === 'Pro'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-[#2a2a2a] text-[#888]'
              }`}>
                {plan === 'Pro' && <Crown className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />}
                {plan}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4 text-[#666]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Main usage bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#888]">
                  {plan === 'Pro' ? 'Daily usage' : 'Monthly usage'}
                </span>
                <span className={`text-xs font-medium ${
                  isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-[#888]'
                }`}>
                  {percentage}%
                </span>
              </div>
              <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isCritical
                      ? 'bg-red-500'
                      : isLow
                        ? 'bg-amber-500'
                        : plan === 'Pro'
                          ? 'bg-amber-400'
                          : 'bg-[#555]'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Pro: Cooldown bar (like Claude's weekend limit) */}
            {plan === 'Pro' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#888]">Cooldown</span>
                  <span className="text-xs text-[#666]">
                    {cooldownText ? `Resets in ${cooldownText}` : 'Available'}
                  </span>
                </div>
                <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cooldownText ? 'bg-amber-500/50' : 'bg-emerald-500/50'
                    }`}
                    style={{ width: cooldownText ? '100%' : '0%' }}
                  />
                </div>
              </div>
            )}

            {/* Free: Upgrade prompt */}
            {plan === 'Free' && percentage >= 50 && (
              <div className="pt-2 border-t border-[#222]">
                <p className="text-[11px] text-[#666] leading-relaxed">
                  Running low? <span className="text-amber-400">Pro</span> gives you 5x more usage + cross-chat memory.
                </p>
              </div>
            )}

            {/* Info text */}
            <p className="text-[10px] text-[#555]">
              {plan === 'Pro'
                ? 'Usage resets every 3 hours after hitting the limit'
                : 'Resets at the start of each month'}
            </p>
          </div>
        </div>
      )}

      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl
          border transition-all duration-200
          ${isOpen
            ? 'bg-[#1a1a1a] border-[#333]'
            : 'bg-[#141414]/90 border-[#252525] hover:border-[#333] hover:bg-[#1a1a1a]'
          }
        `}
      >
        <Zap className={`w-3.5 h-3.5 ${
          isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : plan === 'Pro' ? 'text-amber-400' : 'text-[#666]'
        }`} />

        {/* Mini progress bar */}
        <div className="w-16 h-1.5 bg-[#252525] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCritical
                ? 'bg-red-500'
                : isLow
                  ? 'bg-amber-500'
                  : plan === 'Pro'
                    ? 'bg-amber-400'
                    : 'bg-[#555]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <span className={`text-xs font-medium ${
          isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-[#777]'
        }`}>
          {percentage}%
        </span>
      </button>
    </div>
  );
};

export default UsageIndicator;
