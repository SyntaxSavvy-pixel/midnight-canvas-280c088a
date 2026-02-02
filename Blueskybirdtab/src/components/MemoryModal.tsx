import { useEffect, useRef } from 'react';
import { X, Crown, Sparkles } from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: 'Free' | 'Pro' | 'Max';
  used: number;
  limit: number;
  cooldownUntil?: string | null;
}

const MemoryModal = ({ isOpen, onClose, plan, used, limit, cooldownUntil }: MemoryModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const percentage = Math.min(Math.round((used / limit) * 100), 100);

  // Calculate reset time
  const getResetText = () => {
    if (plan === 'Pro' && cooldownUntil) {
      const now = new Date();
      const cooldown = new Date(cooldownUntil);
      if (now < cooldown) {
        const diff = cooldown.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `Resets in ${hours}h ${minutes}m`;
      }
    }
    if (plan === 'Pro') return 'Resets in 3 hr 0 min';
    // For free, calculate days until month end
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `Resets in ${daysLeft} days`;
  };

  // Weekly reset (like Claude's)
  const getWeeklyResetText = () => {
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(17, 0, 0, 0); // 5 PM
    return `Resets Mon 5:00 PM`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg mx-4 bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-[#e5e5e5]">Usage</h2>
            <span className={`text-xs px-2 py-0.5 rounded-md ${
              plan === 'Max'
                ? 'bg-purple-500/15 text-purple-400'
                : plan === 'Pro'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-[#252525] text-[#777]'
            }`}>
              {plan === 'Max' && <Sparkles className="w-3 h-3 inline mr-1" />}
              {plan === 'Pro' && <Crown className="w-3 h-3 inline mr-1" />}
              {plan}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5 text-[#666]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {plan === 'Max' ? (
            // Max users - unlimited
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-[#e5e5e5] mb-2">Unlimited Usage</h3>
              <p className="text-sm text-[#666]">You have no usage limits on your Max plan.</p>
            </div>
          ) : (
            <>
              {/* Plan usage limits */}
              <div>
                <h3 className="text-sm font-medium text-[#e5e5e5] mb-4">Plan usage limits</h3>

                {/* Current session */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm text-[#ccc]">Current session</p>
                      <p className="text-xs text-[#666]">{getResetText()}</p>
                    </div>
                    <span className="text-sm text-[#888]">{percentage}% used</span>
                  </div>
                  <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentage >= 90
                          ? 'bg-red-500'
                          : percentage >= 70
                            ? 'bg-amber-500'
                            : 'bg-[#3b82f6]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-[#1f1f1f] my-4" />

                {/* Weekly limits */}
                <h3 className="text-sm font-medium text-[#e5e5e5] mb-1">Weekly limits</h3>
                <a href="#" className="text-xs text-[#666] hover:text-[#888] underline mb-4 inline-block">
                  Learn more about usage limits
                </a>

                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm text-[#ccc]">All models</p>
                      <p className="text-xs text-[#666]">{getWeeklyResetText()}</p>
                    </div>
                    <span className="text-sm text-[#888]">{Math.min(percentage + 10, 100)}% used</span>
                  </div>
                  <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-[#3b82f6]"
                      style={{ width: `${Math.min(percentage + 10, 100)}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-[#555] mt-4">Last updated: just now</p>
              </div>

              {/* Upgrade prompt for free users */}
              {plan === 'Free' && (
                <div className="pt-4 border-t border-[#1f1f1f]">
                  <p className="text-sm text-[#888] mb-3">
                    Need more? Upgrade to <span className="text-amber-400">Pro</span> for 5x more usage and cross-chat memory.
                  </p>
                  <button className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all">
                    Upgrade to Pro
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryModal;
