import { useState, useEffect } from 'react';
import { X, Key, Search, Brain, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiKeyConfig {
  openai: string;
  brave: string;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<'api' | 'preferences'>('api');
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig>({ openai: '', brave: '' });
  const [showKeys, setShowKeys] = useState({ openai: false, brave: false });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});

  // Load saved API keys on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('tabkeep_api_keys');
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (e) {
        console.error('Failed to parse saved API keys');
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('tabkeep_api_keys', JSON.stringify(apiKeys));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testApiKey = async (keyType: 'openai' | 'brave') => {
    const key = apiKeys[keyType];
    if (!key) return;

    setTesting(keyType);
    setTestResults(prev => ({ ...prev, [keyType]: null }));

    try {
      if (keyType === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        setTestResults(prev => ({ ...prev, openai: response.ok ? 'success' : 'error' }));
      } else if (keyType === 'brave') {
        const response = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
          headers: { 'X-Subscription-Token': key }
        });
        setTestResults(prev => ({ ...prev, brave: response.ok ? 'success' : 'error' }));
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [keyType]: 'error' }));
    } finally {
      setTesting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg mx-4 shadow-xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X size={20} className="text-foreground/70" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('api')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'api'
                ? 'text-primary'
                : 'text-foreground/60 hover:text-foreground/80'
            )}
          >
            API Keys
            {activeTab === 'api' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'preferences'
                ? 'text-primary'
                : 'text-foreground/60 hover:text-foreground/80'
            )}
          >
            Preferences
            {activeTab === 'preferences' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'api' && (
            <>
              {/* OpenAI API Key */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain size={18} className="text-primary" />
                  <label className="text-sm font-medium text-foreground">
                    OpenAI API Key
                  </label>
                  {testResults.openai === 'success' && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <Check size={12} /> Valid
                    </span>
                  )}
                  {testResults.openai === 'error' && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> Invalid
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showKeys.openai ? 'text' : 'password'}
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full px-4 py-3 pr-20 bg-secondary rounded-xl text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => setShowKeys(prev => ({ ...prev, openai: !prev.openai }))}
                      className="p-1.5 rounded-lg hover:bg-background/50 transition-colors"
                    >
                      {showKeys.openai ? (
                        <EyeOff size={16} className="text-foreground/50" />
                      ) : (
                        <Eye size={16} className="text-foreground/50" />
                      )}
                    </button>
                    <button
                      onClick={() => testApiKey('openai')}
                      disabled={!apiKeys.openai || testing === 'openai'}
                      className="px-2 py-1 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {testing === 'openai' ? '...' : 'Test'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-foreground/50">
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OpenAI Dashboard
                  </a>
                </p>
              </div>

              {/* Brave Search API Key */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Search size={18} className="text-orange-500" />
                  <label className="text-sm font-medium text-foreground">
                    Brave Search API Key
                  </label>
                  {testResults.brave === 'success' && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <Check size={12} /> Valid
                    </span>
                  )}
                  {testResults.brave === 'error' && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> Invalid
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showKeys.brave ? 'text' : 'password'}
                    value={apiKeys.brave}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, brave: e.target.value }))}
                    placeholder="BSA..."
                    className="w-full px-4 py-3 pr-20 bg-secondary rounded-xl text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      onClick={() => setShowKeys(prev => ({ ...prev, brave: !prev.brave }))}
                      className="p-1.5 rounded-lg hover:bg-background/50 transition-colors"
                    >
                      {showKeys.brave ? (
                        <EyeOff size={16} className="text-foreground/50" />
                      ) : (
                        <Eye size={16} className="text-foreground/50" />
                      )}
                    </button>
                    <button
                      onClick={() => testApiKey('brave')}
                      disabled={!apiKeys.brave || testing === 'brave'}
                      className="px-2 py-1 text-xs font-medium rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {testing === 'brave' ? '...' : 'Test'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-foreground/50">
                  Get your API key from{' '}
                  <a
                    href="https://brave.com/search/api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Brave Search API
                  </a>
                  {' '}(Free tier: 2,000 queries/month)
                </p>
              </div>

              {/* Server status box */}
              <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Check size={18} className="text-green-500 mt-0.5" />
                  <div className="text-xs text-foreground/70 space-y-1">
                    <p className="font-medium text-green-600 dark:text-green-400">Server API Keys Configured</p>
                    <p>TabKeep is using pre-configured API keys on the server. You don't need to enter your own keys unless you want to use different ones.</p>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Key size={18} className="text-primary mt-0.5" />
                  <div className="text-xs text-foreground/70 space-y-1">
                    <p className="font-medium text-foreground/80">Custom API Keys (Optional)</p>
                    <p>If you want to use your own API keys, enter them above. They will be stored locally in your browser and used instead of the server keys.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground/60">
                Preferences coming soon...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-xl transition-all',
              saved
                ? 'bg-green-500 text-white'
                : 'bg-primary text-white hover:bg-primary/90'
            )}
          >
            {saved ? (
              <span className="flex items-center gap-1">
                <Check size={16} /> Saved
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
