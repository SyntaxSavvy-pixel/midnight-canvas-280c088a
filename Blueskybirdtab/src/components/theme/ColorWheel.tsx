import { useRef, useEffect, useState, MouseEvent as ReactMouseEvent } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { hexToHsl, hslToHex } from '@/lib/colorUtils';

interface ColorWheelProps {
  color: string;
  onChange: (color: string) => void;
  size?: number;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ color, onChange, size = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(50);

  // Parse initial color
  useEffect(() => {
    const { h, s, l } = hexToHsl(color);
    setHue(h);
    setSaturation(s);
    setLightness(l);
  }, [color]);

  // Draw color wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw color wheel
    for (let i = 0; i < 360; i++) {
      const startAngle = (i - 90) * Math.PI / 180;
      const endAngle = (i - 89) * Math.PI / 180;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = `hsl(${i}, 100%, 50%)`;
      ctx.fill();
    }

    // Create saturation gradient overlay
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw current selection indicator
    const hueRad = (hue - 90) * Math.PI / 180;
    const distance = (saturation / 100) * radius * 0.9;
    const x = centerX + distance * Math.cos(hueRad);
    const y = centerY + distance * Math.sin(hueRad);

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [size, hue, saturation, lightness]);

  const handleMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    updateFromPosition(e);
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    updateFromPosition(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateFromPosition = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    const distance = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x) * 180 / Math.PI + 90;

    // Calculate saturation (0-100)
    const newSaturation = Math.min(100, (distance / radius) * 100);

    setHue(angle < 0 ? angle + 360 : angle);
    setSaturation(newSaturation);

    const newColor = hslToHex(angle < 0 ? angle + 360 : angle, newSaturation, lightness);
    onChange(newColor);
  };

  const handleReset = () => {
    onChange('#3b82f6');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair"
        />
      </div>

      {/* Lightness Slider */}
      <div className="w-full space-y-2">
        <div className="flex justify-between text-[10px] font-medium text-[var(--text-secondary)]">
          <span>Lightness</span>
          <span>{lightness}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={lightness}
          onChange={(e) => {
            const newLightness = Number(e.target.value);
            setLightness(newLightness);
            const newColor = hslToHex(hue, saturation, newLightness);
            onChange(newColor);
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${hslToHex(hue, saturation, 0)}, ${hslToHex(hue, saturation, 50)}, ${hslToHex(hue, saturation, 100)})`,
          }}
        />
      </div>

      {/* Current Color Display */}
      <div className="flex items-center gap-3 w-full">
        <div
          className="w-10 h-10 rounded-lg border-2 border-[var(--border-subtle)] shadow-lg"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1">
          <input
            type="text"
            value={color.toUpperCase()}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm font-mono focus:outline-none focus:border-[var(--theme-accent)] transition-colors"
          />
        </div>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ColorWheel;
