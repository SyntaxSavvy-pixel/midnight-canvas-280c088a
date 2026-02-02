import { useState, useEffect } from 'react';
import { Clock, Sparkles, X } from 'lucide-react';

interface LimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  resetAt?: string;
  showUpgrade?: boolean;
}

const LimitModal = ({ isOpen, onClose, message, resetAt, showUpgrade }: LimitModalProps) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!resetAt) return;

    const updateTimer = () => {
      const now = new Date();
      const resetTime = new Date(resetAt);
      const diff = resetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Ready!');
        // Auto-close and refresh after a short delay
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [resetAt, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 max-w-md w-full animate-fade-in shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5 text-[#666]" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border border-[#333] flex items-center justify-center">
          <Clock className="w-8 h-8 text-[#888]" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-medium text-white text-center mb-2">
          Taking a breather
        </h2>

        {/* Message */}
        <p className="text-[#888] text-center mb-6">
          {message}
        </p>

        {/* Countdown timer */}
        {resetAt && timeLeft && (
          <div className="text-center mb-6">
            <div className="text-4xl font-light text-white mb-1">
              {timeLeft}
            </div>
            <p className="text-sm text-[#555]">until reset</p>
          </div>
        )}

        {/* Upgrade button for free users */}
        {showUpgrade && (
          <button
            onClick={() => {
              // TODO: Implement upgrade flow
              console.log('Upgrade clicked');
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-5 h-5" />
            Upgrade to Pro
          </button>
        )}

        {/* Wait message for Pro users */}
        {!showUpgrade && resetAt && (
          <div className="text-center">
            <p className="text-sm text-[#666]">
              Your thinking limit will reset automatically.
              <br />
              Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LimitModal;
