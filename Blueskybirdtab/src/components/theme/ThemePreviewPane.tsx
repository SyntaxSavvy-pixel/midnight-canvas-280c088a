import { Search, Globe, MessageSquare, Settings, Home } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ThemePreviewPane: React.FC = () => {
  const { settings } = useTheme();

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden transition-all duration-500"
      style={{
        background: settings.colors.background,
        fontFamily: settings.font,
      }}
    >
      {/* Sidebar Preview */}
      <div
        className="w-48 h-full border-r absolute left-0 top-0 bottom-0 transition-all duration-500"
        style={{
          backgroundColor: settings.colors.sidebar,
          borderColor: settings.colors.borderSubtle,
          backdropFilter: `blur(${settings.blurValue}px)`,
        }}
      >
        {/* Logo */}
        <div className="p-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${settings.colors.accent}, ${settings.colors.accentHover})`,
              borderRadius: `${settings.radiusValue}px`,
            }}
          >
            <Globe className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Nav Items */}
        <div className="px-3 space-y-1">
          {[
            { icon: Home, label: 'Home' },
            { icon: Globe, label: 'Tabs' },
            { icon: MessageSquare, label: 'Chats' },
            { icon: Settings, label: 'Settings' },
          ].map((item, index) => (
            <button
              key={item.label}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
                ${index === 0
                  ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }
              `}
              style={{ borderRadius: `${settings.radiusValue}px` }}
            >
              <item.icon className={`w-4 h-4 ${index === 0 ? 'text-[var(--theme-accent)]' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"
              style={{ borderRadius: '50%' }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-[var(--text-primary)] truncate">User</div>
              <div className="text-[9px] text-[var(--text-secondary)] truncate">user@example.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Preview */}
      <div className="ml-48 p-6 h-full">
        {/* Search Bar */}
        <div
          className="w-full max-w-md mx-auto mb-8 relative"
          style={{
            boxShadow: `0 ${settings.shadowValue}px ${settings.shadowValue * 2.5}px rgba(0, 0, 0, 0.12)`,
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 transition-all duration-200"
            style={{
              backgroundColor: settings.colors.surface,
              borderColor: settings.colors.borderSubtle,
              borderRadius: `${settings.radiusValue}px`,
              backdropFilter: `blur(${settings.blurValue}px)`,
            }}
          >
            <Search className="w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search or ask anything..."
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{
                color: settings.colors.textPrimary,
                fontFamily: settings.font,
              }}
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-3 gap-4" style={{ gap: `${settings.spacingValue}px` }}>
          {['Card 1', 'Card 2', 'Card 3', 'Card 4', 'Card 5', 'Card 6'].map((card, index) => (
            <div
              key={card}
              className="p-4 hover-lift press-down cursor-pointer transition-all duration-200"
              style={{
                backgroundColor: settings.colors.surface,
                borderColor: settings.colors.borderSubtle,
                borderRadius: `${settings.radiusValue}px`,
                boxShadow: `0 ${settings.shadowValue * 0.3}px ${settings.shadowValue}px rgba(0, 0, 0, 0.08)`,
                backdropFilter: `blur(${settings.blurValue * 0.5}px)`,
              }}
            >
              <div
                className="h-16 rounded-lg mb-3"
                style={{
                  backgroundColor: index % 2 === 0 ? settings.colors.accent : `${settings.colors.accent}33`,
                  borderRadius: `${settings.radiusValue * 0.6}px`,
                }}
              />
              <div className="text-[11px] font-medium" style={{ color: settings.colors.textPrimary }}>
                {card}
              </div>
              <div className="text-[10px]" style={{ color: settings.colors.textSecondary }}>
                Description text
              </div>

              {/* Button */}
              <button
                className="mt-3 w-full py-2 text-[10px] font-medium transition-all duration-200 hover-lift press-down"
                style={{
                  backgroundColor: settings.colors.accent,
                  color: '#ffffff',
                  borderRadius: `${settings.radiusValue * 0.6}px`,
                }}
              >
                Action
              </button>
            </div>
          ))}
        </div>

        {/* Form Elements */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="text-[10px] font-medium mb-3" style={{ color: settings.colors.textSecondary }}>
            FORM ELEMENTS
          </div>

          <div
            className="space-y-3 p-4"
            style={{
              backgroundColor: settings.colors.surface,
              borderColor: settings.colors.borderSubtle,
              borderRadius: `${settings.radiusValue}px`,
              boxShadow: `0 ${settings.shadowValue * 0.3}px ${settings.shadowValue}px rgba(0, 0, 0, 0.08)`,
            }}
          >
            <div className="space-y-1">
              <label className="text-[10px] font-medium" style={{ color: settings.colors.textSecondary }}>
                Input Field
              </label>
              <input
                type="text"
                placeholder="Enter text..."
                className="w-full px-3 py-2 transition-all duration-200 focus:outline-none"
                style={{
                  backgroundColor: settings.colors.background,
                  borderColor: settings.colors.borderSubtle,
                  color: settings.colors.textPrimary,
                  borderRadius: `${settings.radiusValue * 0.6}px`,
                  fontFamily: settings.font,
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 py-2 text-[10px] font-medium transition-all duration-200 hover-lift press-down"
                style={{
                  backgroundColor: settings.colors.accent,
                  color: '#ffffff',
                  borderRadius: `${settings.radiusValue * 0.6}px`,
                }}
              >
                Primary
              </button>
              <button
                className="flex-1 py-2 text-[10px] font-medium border transition-all duration-200 hover-lift press-down"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: settings.colors.borderSubtle,
                  color: settings.colors.textPrimary,
                  borderRadius: `${settings.radiusValue * 0.6}px`,
                }}
              >
                Secondary
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="preview-checkbox"
                className="w-4 h-4 rounded cursor-pointer"
                style={{
                  accentColor: settings.colors.accent,
                  borderRadius: `${settings.radiusValue * 0.3}px`,
                }}
              />
              <label
                htmlFor="preview-checkbox"
                className="text-[10px]"
                style={{ color: settings.colors.textSecondary }}
              >
                Checkbox option
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreviewPane;
