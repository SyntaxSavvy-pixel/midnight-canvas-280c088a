import { useState, useRef, useEffect, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Palette, Lock, Maximize, Settings } from 'lucide-react';

interface DropdownItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ThemeDropdownProps {
  onOpenThemeStudio: () => void;
}

const ThemeDropdown: React.FC<ThemeDropdownProps> = ({ onOpenThemeStudio }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle mount state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems: DropdownItem[] = [
    {
      label: 'Theme',
      icon: <Palette className="w-4 h-4" />,
      onClick: () => {
        onOpenThemeStudio();
        setIsOpen(false);
      },
    },
    {
      label: 'Lock Browser',
      icon: <Lock className="w-4 h-4" />,
      onClick: () => {
        setIsOpen(false);
      },
    },
    {
      label: 'Focus Mode',
      icon: <Maximize className="w-4 h-4" />,
      onClick: () => {
        setIsOpen(false);
      },
    },
    {
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        setIsOpen(false);
      },
    },
  ];

  const dropdownContent = (
    <div
      className="
        absolute top-full right-0 mt-2 w-56
        bg-[var(--bg-surface)] backdrop-blur-xl
        border border-[var(--border-primary)]
        rounded-xl shadow-2xl
        overflow-hidden
        animate-in fade-in slide-in-from-top-2
        duration-200
      "
      style={{ zIndex: 9999 }}
    >
      {/* Menu Items */}
      <div className="py-1.5">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5
              text-left transition-all duration-150
              hover:bg-[var(--bg-surface-hover)]
              ${item.danger ? 'text-red-400 hover:text-red-300' : 'text-[var(--text-primary)] hover:text-[var(--text-primary)]'}
            `}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-[var(--border-subtle)] mx-2" />

      {/* Additional Options */}
      <div className="py-1.5">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all duration-150 text-xs font-medium">
          <Settings className="w-4 h-4" />
          More Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          p-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] 
            text-[var(--text-secondary)] transition-colors
        "
        title="Menu"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Dropdown Menu with Portal */}
      {isOpen && mounted && createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default ThemeDropdown;
