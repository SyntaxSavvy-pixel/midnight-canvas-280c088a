import { useState, useEffect } from 'react';
import { ChevronRight, Sparkles, MessageSquare } from 'lucide-react';

export interface PlanQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
}

export interface PlanModeConfig {
  questions: PlanQuestion[];
}

interface PlanModeInlineProps {
  isActive: boolean;
  config: PlanModeConfig | null;
  onAnswer: (questionId: string, answer: string) => void;
  onComplete: () => void;
  currentQuestionIndex: number;
  answers: Record<string, string>;
}

const PlanModeInline = ({
  isActive,
  config,
  onAnswer,
  onComplete,
  currentQuestionIndex,
  answers,
}: PlanModeInlineProps) => {
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Reset custom input when question changes
  useEffect(() => {
    setCustomInput('');
    setShowCustomInput(false);
  }, [currentQuestionIndex]);

  if (!isActive || !config) return null;

  const currentQuestion = config.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === config.questions.length - 1;
  const progress = ((currentQuestionIndex) / config.questions.length) * 100;

  if (!currentQuestion) return null;

  const handleOptionClick = (option: string) => {
    onAnswer(currentQuestion.id, option);
    setShowCustomInput(false);
    setCustomInput('');
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onAnswer(currentQuestion.id, customInput.trim());
      setShowCustomInput(false);
      setCustomInput('');
    }
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>
          <span className="text-xs font-medium text-[#666]">Planning</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {config.questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx < currentQuestionIndex
                  ? 'w-6 bg-cyan-500'
                  : idx === currentQuestionIndex
                  ? 'w-6 bg-cyan-500/50'
                  : 'w-1.5 bg-[#333]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="bg-[#141414] rounded-2xl border border-[#252525] overflow-hidden">
        {/* Question header */}
        <div className="px-4 py-3 border-b border-[#1f1f1f]">
          <p className="text-[14px] text-[#e5e5e5] leading-relaxed">
            {currentQuestion.question}
          </p>
        </div>

        {/* Options */}
        <div className="p-3">
          <div className="flex flex-wrap gap-2">
            {currentQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => handleOptionClick(option)}
                className={`
                  px-4 py-2 rounded-xl text-[13px] font-medium
                  border transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98]
                  ${answers[currentQuestion.id] === option
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                    : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#aaa] hover:border-[#3a3a3a] hover:text-white hover:bg-[#1f1f1f]'
                  }
                `}
              >
                {option}
              </button>
            ))}

            {/* Something else button */}
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium border border-dashed border-[#333] text-[#666] hover:border-[#444] hover:text-[#888] transition-all duration-200"
              >
                Something else...
              </button>
            ) : (
              <div className="w-full mt-2 flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Tell me what you need..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[13px] text-[#e5e5e5] placeholder-[#555] focus:outline-none focus:border-cyan-500/40 transition-colors"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomSubmit();
                    if (e.key === 'Escape') setShowCustomInput(false);
                  }}
                />
                <button
                  onClick={handleCustomSubmit}
                  disabled={!customInput.trim()}
                  className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                    customInput.trim()
                      ? 'bg-cyan-500 text-white hover:bg-cyan-400'
                      : 'bg-[#1a1a1a] text-[#555] cursor-not-allowed'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Collected answers preview */}
        {Object.keys(answers).length > 0 && (
          <div className="px-4 py-2.5 bg-[#0f0f0f] border-t border-[#1f1f1f]">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(answers).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1a1a1a] text-[11px]"
                >
                  <span className="text-[#555]">{key}:</span>
                  <span className="text-[#888]">{value}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Skip link */}
      <div className="flex justify-center mt-3">
        <button
          onClick={onComplete}
          className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
        >
          Skip planning and generate now
        </button>
      </div>
    </div>
  );
};

export default PlanModeInline;
