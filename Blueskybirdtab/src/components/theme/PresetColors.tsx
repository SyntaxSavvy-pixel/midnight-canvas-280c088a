import { Check } from 'lucide-react';

interface PresetColorsProps {
  colors: string[];
  activeColor: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#ffffff', // White
];

const PresetColors: React.FC<PresetColorsProps> = ({ colors = PRESET_COLORS, activeColor, onChange }) => {
  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map((color) => {
        const isActive = activeColor.toLowerCase() === color.toLowerCase();

        return (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`
              w-8 h-8 rounded-full transition-all duration-200 relative
              hover:scale-110 active:scale-95 border-2
              ${isActive ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-surface)]' : 'hover:ring-2 hover:ring-offset-2 hover:ring-offset-[var(--bg-surface)]'}
            `}
            style={{
              backgroundColor: color,
              borderColor: isActive ? color : 'rgba(255,255,255,0.1)',
              ringColor: color,
            }}
            title={color}
          >
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className={`w-3.5 h-3.5 ${color === '#ffffff' ? 'text-black' : 'text-white'} drop-shadow-md`} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PresetColors;
