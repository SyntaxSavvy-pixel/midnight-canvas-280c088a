import { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  RefreshCw,
  User,
  Zap,
  Brain,
  Trash2,
  LogOut,
  Loader2,
  Mail,
  Lock,
  X,
  Check,
  Plus,
  Pencil,
  X as XIcon,
  PanelLeft,
  CreditCard,
  Infinity,
  Rocket,
  Clock,
  MessageCircle,
  Image,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Calendar,
  Layout,
  EyeOff,
  Monitor
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import AvatarPicker from '@/components/AvatarPicker';
import { useAnchorMemories } from '@/hooks/useAnchorMemories';
import { useMemoryAnchors } from '@/hooks/useMemoryAnchors';

type SettingsTab = 'account' | 'appearance' | 'plan' | 'usage' | 'memory' | 'deletion';

const validTabs: SettingsTab[] = ['account', 'plan', 'usage', 'memory', 'deletion'];

interface SettingsProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onClose?: () => void;
  activeAnchorId?: string | null;
}

const Settings = ({ sidebarOpen = true, onToggleSidebar, onClose, activeAnchorId }: SettingsProps = {}) => {
  const { profile, updateProfile, changePassword, deleteAccount, signOut, refreshProfile } = useAuth();
  const { sidebarPosition, setSidebarPosition, isIncognito, setIncognito } = useLayout();

  // Resolve default anchor if none explicitly passed
  const { defaultAnchor } = useMemoryAnchors();
  const resolvedAnchorId = activeAnchorId || defaultAnchor?.anchor_id || null;

  // Use the anchor memories hook for real database operations
  const {
    memories: anchorMemories,
    isLoading: memoriesLoading,
    addMemory,
    updateMemory,
    deleteMemory,
    clearAllMemories,
    isAdding: isAddingMemory,
    isDeleting: isDeletingMemory,
    isClearing: isClearingMemories,
  } = useAnchorMemories(resolvedAnchorId);

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Profile editing state
  const [editedName, setEditedName] = useState(profile?.display_name || '');
  const [editedUsername, setEditedUsername] = useState(profile?.username || '');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Memory UI state
  const [newMemory, setNewMemory] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState('');
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  // Reset form when profile changes
  useEffect(() => {
    setEditedName(profile?.display_name || '');
    setEditedUsername(profile?.username || '');
  }, [profile]);

  const plan = profile?.plan === 'max' ? 'Max' : profile?.plan === 'pro' ? 'Pro' : 'Free';
  const used = profile?.intelligence_used || 0;
  const limit = profile?.intelligence_limit || 100;
  const percentage = Math.min(Math.round((used / limit) * 100), 100);

  // Calculate reset time
  const getResetText = () => {
    if (plan === 'Pro' && profile?.cooldown_until) {
      const now = new Date();
      const cooldown = new Date(profile.cooldown_until);
      if (now < cooldown) {
        const diff = cooldown.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `Resets in ${hours} hr ${minutes} min`;
      }
    }
    if (plan === 'Pro') return 'Resets in 3 hr 0 min';
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `Resets in ${daysLeft} days`;
  };

  const getWeeklyResetText = () => {
    return `Resets Mon 5:00 PM`;
  };

  const getLastUpdatedText = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    return `${Math.floor(diff / 3600)} hours ago`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    setIsUpdating(true);
    const { error } = await updateProfile({ display_name: editedName.trim() });
    setIsUpdating(false);
    if (error) {
      toast.error('Failed to update name', { description: error.message });
    } else {
      toast.success('Name updated successfully');
    }
  };

  const handleSaveUsername = async () => {
    if (!editedUsername.trim()) return;
    setIsUpdating(true);
    const { error } = await updateProfile({ username: editedUsername.trim() });
    setIsUpdating(false);
    if (error) {
      toast.error('Failed to update username', { description: error.message });
    } else {
      toast.success('Username updated successfully');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsUpdating(true);
    const { error } = await changePassword(newPassword);
    setIsUpdating(false);
    if (error) {
      toast.error('Failed to change password', { description: error.message });
    } else {
      toast.success('Password changed successfully');
      setPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    const confirmed = window.confirm(
      'This will permanently delete your account and all data. This cannot be undone. Are you sure?'
    );
    if (!confirmed) return;
    setIsUpdating(true);
    const { error } = await deleteAccount();
    setIsUpdating(false);
    if (error) {
      toast.error('Failed to delete account', { description: error.message });
    } else {
      toast.success('Account deleted');
    }
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    setIsUpdating(true);
    const { error } = await updateProfile({ avatar_url: avatarUrl });
    setIsUpdating(false);
    if (error) {
      toast.error('Failed to update avatar', { description: error.message });
    } else {
      toast.success('Avatar updated successfully');
      setShowAvatarPicker(false);
    }
  };

  const handleLogout = () => {
    signOut();
  };

  // Memory handlers - now connected to database
  const handleAddMemory = async () => {
    if (!newMemory.trim() || !resolvedAnchorId) return;
    try {
      await addMemory({ content: newMemory.trim(), memoryType: 'fact' });
      setNewMemory('');
      toast.success('Memory saved');
    } catch (err) {
      toast.error('Failed to save memory');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await deleteMemory(id);
      toast.success('Memory deleted');
    } catch (err) {
      toast.error('Failed to delete memory');
    }
  };

  const handleEditMemory = (id: string) => {
    const memory = anchorMemories.find(m => m.id === id);
    if (memory) {
      setEditingMemoryId(id);
      setEditingMemoryContent(memory.content);
    }
  };

  const handleSaveMemoryEdit = async () => {
    if (!editingMemoryContent.trim() || !editingMemoryId) return;
    try {
      await updateMemory({ memoryId: editingMemoryId, content: editingMemoryContent.trim() });
      setEditingMemoryId(null);
      setEditingMemoryContent('');
      toast.success('Memory updated');
    } catch (err) {
      toast.error('Failed to update memory');
    }
  };

  const handleClearAllMemories = async () => {
    if (!resolvedAnchorId) return;
    try {
      await clearAllMemories();
      toast.success('All memories cleared');
    } catch (err) {
      toast.error('Failed to clear memories');
    }
  };
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Layout className="w-4 h-4" /> },
    { id: 'plan', label: 'Plan', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'usage', label: 'Usage', icon: <Zap className="w-4 h-4" /> },
    { id: 'memory', label: 'Memory', icon: <Brain className="w-4 h-4" /> },
    { id: 'deletion', label: 'Delete Account', icon: <Trash2 className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with navigation */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1a1a1a]">
        {/* Sidebar toggle - shows when sidebar is collapsed */}
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-white/5 transition-all duration-200"
          >
            <PanelLeft className="w-5 h-5 text-[#555]" />
          </button>
        )}
        <h1 className="text-xl font-medium text-[#e5e5e5] flex-1">Settings</h1>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/5 text-[#888] hover:text-[#e5e5e5] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar navigation */}
        <nav className="w-56 shrink-0 px-4 py-6 border-r border-[#1a1a1a]">
          <ul className="space-y-0.5">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${activeTab === tab.id
                    ? 'bg-[#1a1a1a] text-[#e5e5e5]'
                    : 'text-[#666] hover:text-[#ccc] hover:bg-[#141414]'
                    } ${tab.id === 'deletion' ? 'text-red-400 hover:text-red-300' : ''}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Separator and Log out */}
          <div className="mt-6 pt-6 border-t border-[#1a1a1a]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#666] hover:text-[#ccc] hover:bg-[#141414] transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </nav>

        {/* Right content area */}
        <main className="flex-1 min-w-0 overflow-y-auto px-8 py-6">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6 max-w-xl">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-[#888] mb-3">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-20 h-20 rounded-xl bg-[#1a1a1a] flex items-center justify-center border border-[#2a2a2a] overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-[#444]" />
                    )}
                  </div>
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-sm text-[#ccc] border border-[#2a2a2a] transition-colors"
                  >
                    {showAvatarPicker ? 'Cancel' : 'Change Avatar'}
                  </button>
                </div>

                {showAvatarPicker && (
                  <div className="mb-4">
                    <AvatarPicker
                      currentAvatar={profile?.avatar_url || null}
                      onSelect={handleAvatarSelect}
                    />
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-[#888] mb-2">
                  Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#141414] border border-[#1f1f1f] text-[#e5e5e5] focus:outline-none focus:border-[#333] transition-colors"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isUpdating}
                    className="px-4 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-[#ccc] border border-[#2a2a2a] transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-[#888] mb-2">
                  Username
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                    placeholder="username"
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#141414] border border-[#1f1f1f] text-[#e5e5e5] placeholder:text-[#444] focus:outline-none focus:border-[#333] transition-colors"
                  />
                  <button
                    onClick={handleSaveUsername}
                    disabled={isUpdating}
                    className="px-4 py-2.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] text-[#ccc] border border-[#2a2a2a] transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#888] mb-2">
                  Email Address
                </label>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#141414] border border-[#1f1f1f]">
                  <Mail className="w-4 h-4 text-[#444]" />
                  <span className="text-[#888]">{profile?.email || 'user@example.com'}</span>
                </div>
              </div>

              {/* Plan Badge */}
              <div>
                <label className="block text-sm font-medium text-[#888] mb-2">
                  Current Plan
                </label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${plan === 'Max'
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                    : plan === 'Pro'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                      : 'bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]'
                    }`}>
                    {plan === 'Max' && <Sparkles className="w-4 h-4" />}
                    {plan === 'Pro' && <Crown className="w-4 h-4" />}
                    {plan}
                  </span>
                </div>
              </div>

              {/* Change Password */}
              <div>
                <label className="block text-sm font-medium text-[#888] mb-2">
                  Password
                </label>
                <button
                  onClick={() => setPasswordModalOpen(true)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#141414] border border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-[#181818] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-[#444]" />
                    <span className="text-[#888]">Change Password</span>
                  </div>
                  <span className="text-xs text-[#444]">••••••••</span>
                </button>
              </div>
            </div>
          )}

          {/* Plan Tab */}
          {activeTab === 'plan' && (
            <div className="space-y-8 max-w-3xl">
              {/* Current Plan Banner */}
              <div className={`p-5 rounded-2xl border ${plan === 'Max'
                ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20'
                : plan === 'Pro'
                  ? 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20'
                  : 'bg-[#141414] border-[#1f1f1f]'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${plan === 'Max'
                      ? 'bg-purple-500/20'
                      : plan === 'Pro'
                        ? 'bg-amber-500/20'
                        : 'bg-[#1a1a1a]'
                      }`}>
                      {plan === 'Max' ? (
                        <Sparkles className="w-6 h-6 text-purple-400" />
                      ) : plan === 'Pro' ? (
                        <Crown className="w-6 h-6 text-amber-400" />
                      ) : (
                        <User className="w-6 h-6 text-[#666]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-[#888]">Current Plan</p>
                      <p className={`text-xl font-semibold ${plan === 'Max'
                        ? 'text-purple-400'
                        : plan === 'Pro'
                          ? 'text-amber-400'
                          : 'text-[#e5e5e5]'
                        }`}>
                        {plan}
                      </p>
                    </div>
                  </div>
                  {plan !== 'Free' && (
                    <span className="text-xs text-[#666] px-3 py-1 rounded-full bg-[#1a1a1a]">
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Plans Grid */}
              <div>
                <h3 className="text-lg font-medium text-[#e5e5e5] mb-4">Choose your plan</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Pro Plan */}
                  <div className={`relative p-6 rounded-2xl border transition-all duration-200 ${plan === 'Pro'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-[#1f1f1f] bg-[#141414] hover:border-[#2a2a2a]'
                    }`}>
                    {plan === 'Pro' && (
                      <div className="absolute -top-3 left-4">
                        <span className="px-3 py-1 text-xs font-medium bg-amber-500 text-black rounded-full">
                          Current Plan
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-amber-500/15">
                        <Crown className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#e5e5e5]">Pro</h4>
                        <p className="text-xs text-[#666]">For power users</p>
                      </div>
                    </div>

                    <div className="mb-5">
                      <span className="text-3xl font-bold text-[#e5e5e5]">$20</span>
                      <span className="text-[#666]">/month</span>
                    </div>

                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <MessageCircle className="w-4 h-4 text-amber-400" />
                        <span>5x more messages</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>3-hour usage resets</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <Brain className="w-4 h-4 text-amber-400" />
                        <span>Cross-chat memory</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <Rocket className="w-4 h-4 text-amber-400" />
                        <span>Priority responses</span>
                      </li>
                    </ul>

                    <button
                      disabled={plan === 'Pro'}
                      className={`w-full py-2.5 rounded-xl font-medium transition-all ${plan === 'Pro'
                        ? 'bg-[#1a1a1a] text-[#666] cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
                        }`}
                    >
                      {plan === 'Pro' ? 'Current Plan' : plan === 'Max' ? 'Downgrade to Pro' : 'Upgrade to Pro'}
                    </button>
                  </div>

                  {/* Max Plan */}
                  <div className={`relative p-6 rounded-2xl border transition-all duration-200 ${plan === 'Max'
                    ? 'border-purple-500/40 bg-purple-500/5'
                    : 'border-[#1f1f1f] bg-[#141414] hover:border-[#2a2a2a]'
                    }`}>
                    {plan === 'Max' && (
                      <div className="absolute -top-3 left-4">
                        <span className="px-3 py-1 text-xs font-medium bg-purple-500 text-white rounded-full">
                          Current Plan
                        </span>
                      </div>
                    )}
                    {plan !== 'Max' && (
                      <div className="absolute -top-3 right-4">
                        <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                          Popular
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-purple-500/15">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#e5e5e5]">Max</h4>
                        <p className="text-xs text-[#666]">For professionals</p>
                      </div>
                    </div>

                    <div className="mb-5">
                      <span className="text-3xl font-bold text-[#e5e5e5]">$200</span>
                      <span className="text-[#666]">/month</span>
                    </div>

                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <Infinity className="w-4 h-4 text-purple-400" />
                        <span>Unlimited messages</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span>No usage limits</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <Image className="w-4 h-4 text-purple-400" />
                        <span>Advanced image analysis</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <Rocket className="w-4 h-4 text-purple-400" />
                        <span>Fastest response times</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-[#ccc]">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span>Extended memory</span>
                      </li>
                    </ul>

                    <button
                      disabled={plan === 'Max'}
                      className={`w-full py-2.5 rounded-xl font-medium transition-all ${plan === 'Max'
                        ? 'bg-[#1a1a1a] text-[#666] cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400'
                        }`}
                    >
                      {plan === 'Max' ? 'Current Plan' : 'Upgrade to Max'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Free Plan Info */}
              {plan === 'Free' && (
                <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#1a1a1a]">
                      <User className="w-4 h-4 text-[#666]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#e5e5e5]">Free Plan</p>
                      <p className="text-xs text-[#666] mt-1">
                        You're currently on the free plan with limited messages per month. Upgrade to unlock more features.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* FAQ */}
              <div className="pt-6 border-t border-[#1f1f1f]">
                <h4 className="text-sm font-medium text-[#888] mb-4">Frequently asked questions</h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#ccc]">Can I cancel anytime?</p>
                    <p className="text-xs text-[#666] mt-1">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#ccc]">What payment methods do you accept?</p>
                    <p className="text-xs text-[#666] mt-1">We accept all major credit cards, debit cards, and PayPal.</p>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-8">
              {/* Plan usage limits */}
              <section>
                <h2 className="text-lg font-medium text-[#e5e5e5] mb-6">Plan usage limits</h2>

                {plan === 'Max' ? (
                  <div className="flex items-center gap-4 p-6 bg-[#141414] rounded-xl border border-[#1f1f1f]">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                    <div>
                      <p className="text-[#e5e5e5] font-medium">Unlimited Usage</p>
                      <p className="text-sm text-[#666]">You have no usage limits on your Max plan.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Current session */}
                    <div className="mb-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[#e5e5e5]">Current session</p>
                          <p className="text-sm text-[#666]">{getResetText()}</p>
                        </div>
                        <span className="text-sm text-[#888]">{percentage}% used</span>
                      </div>
                      <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-[#3b82f6]"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-[#1f1f1f] my-6" />

                    {/* Weekly limits */}
                    <h2 className="text-lg font-medium text-[#e5e5e5] mb-2">Weekly limits</h2>
                    <a href="#" className="text-sm text-[#666] hover:text-[#888] underline mb-6 inline-block">
                      Learn more about usage limits
                    </a>

                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[#e5e5e5]">All models</p>
                          <p className="text-sm text-[#666]">{getWeeklyResetText()}</p>
                        </div>
                        <span className="text-sm text-[#888]">{Math.min(percentage + 5, 100)}% used</span>
                      </div>
                      <div className="h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-[#3b82f6]"
                          style={{ width: `${Math.min(percentage + 5, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Last updated */}
                    <div className="flex items-center gap-2 text-sm text-[#555] mt-6">
                      <span>Last updated: {getLastUpdatedText()}</span>
                      <button
                        onClick={handleRefresh}
                        className="p-1 rounded hover:bg-white/5 transition-colors"
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </>
                )}
              </section>

              {/* Upgrade prompt for free users */}
              {plan === 'Free' && (
                <>
                  <div className="border-t border-[#1f1f1f]" />
                  <section>
                    <h2 className="text-lg font-medium text-[#e5e5e5] mb-4">Upgrade your plan</h2>
                    <p className="text-sm text-[#888] mb-4">
                      Get more usage, cross-chat memory, and faster responses with Pro.
                    </p>
                    <button className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-700 transition-all">
                      Upgrade to Pro
                    </button>
                  </section>
                </>
              )}
            </div>
          )}

          {/* Memory Tab */}
          {activeTab === 'memory' && (
            <div className="space-y-6 max-w-2xl">
              {/* No anchor warning - only if no default anchor exists at all */}
              {!resolvedAnchorId && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-medium mb-1">No Memory Anchor Available</p>
                      <p className="text-sm text-[#888]">
                        A memory anchor will be created automatically. Try refreshing the page or starting a new conversation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#1a1a1a]">
                    <Brain className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[#e5e5e5] font-medium mb-1">About Memory Anchors</p>
                    <p className="text-sm text-[#888]">
                      Memory Anchors are persistent AI brains that remember information across conversations.
                      When you delete a chat, the memories extracted from it remain in your anchor.
                      You can add, edit, or remove memories at any time.
                    </p>
                  </div>
                </div>
              </div>

              {resolvedAnchorId && (
                <>
                  {/* Add new memory */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-[#888]">Add a memory</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMemory}
                        onChange={(e) => setNewMemory(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                        placeholder="e.g., I prefer concise responses"
                        className="flex-1 px-4 py-2.5 rounded-lg bg-[#141414] border border-[#1f1f1f] text-[#e5e5e5] placeholder:text-[#444] focus:outline-none focus:border-[#333] transition-colors"
                        disabled={isAddingMemory}
                      />
                      <button
                        onClick={handleAddMemory}
                        disabled={!newMemory.trim() || isAddingMemory}
                        className="px-4 py-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isAddingMemory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Memory list */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#888]">
                      Saved memories ({anchorMemories.length})
                    </label>

                    {memoriesLoading ? (
                      <div className="p-8 text-center rounded-xl bg-[#141414] border border-[#1f1f1f]">
                        <Loader2 className="w-8 h-8 text-[#333] mx-auto mb-3 animate-spin" />
                        <p className="text-[#666]">Loading memories...</p>
                      </div>
                    ) : anchorMemories.length === 0 ? (
                      <div className="p-8 text-center rounded-xl bg-[#141414] border border-[#1f1f1f]">
                        <Brain className="w-8 h-8 text-[#333] mx-auto mb-3" />
                        <p className="text-[#666]">No memories saved yet</p>
                        <p className="text-sm text-[#444] mt-1">Add memories to help TabKeep remember your preferences</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {anchorMemories.map((memory) => (
                          <div
                            key={memory.id}
                            className="rounded-xl bg-[#141414] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors overflow-hidden"
                          >
                            {/* Card Header - always visible */}
                            <div
                              className="p-4 cursor-pointer flex items-start justify-between gap-3"
                              onClick={() => setExpandedMemoryId(
                                expandedMemoryId === memory.id ? null : memory.id
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[#e5e5e5] text-sm font-medium truncate">
                                  {memory.content.split('\n')[0].slice(0, 60)}
                                  {memory.content.length > 60 ? '...' : ''}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[11px] text-[#555]">
                                    {profile?.display_name || 'You'}
                                  </span>
                                  <span className="text-[11px] text-[#333]">&middot;</span>
                                  <span className="text-[11px] text-[#555] flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(memory.created_at).toLocaleDateString('en-US', {
                                      month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                              {expandedMemoryId === memory.id
                                ? <ChevronUp className="w-4 h-4 text-[#555] shrink-0 mt-0.5" />
                                : <ChevronDown className="w-4 h-4 text-[#555] shrink-0 mt-0.5" />
                              }
                            </div>

                            {/* Expanded Details */}
                            {expandedMemoryId === memory.id && (
                              <div className="px-4 pb-4 pt-0 border-t border-[#1a1a1a] space-y-3">
                                {/* Full content or edit mode */}
                                {editingMemoryId === memory.id ? (
                                  <div className="flex gap-2 pt-3">
                                    <input
                                      type="text"
                                      value={editingMemoryContent}
                                      onChange={(e) => setEditingMemoryContent(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveMemoryEdit()}
                                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] text-[#e5e5e5] focus:outline-none focus:border-[#333]"
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleSaveMemoryEdit}
                                      className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-green-400"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingMemoryId(null)}
                                      className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-[#666]"
                                    >
                                      <XIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[#aaa] text-sm pt-3 whitespace-pre-wrap">
                                    {memory.content}
                                  </p>
                                )}

                                {/* Metadata badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${memory.memory_source === 'explicit'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-[#1a1a1a] text-[#555]'
                                    }`}>
                                    {memory.memory_source === 'explicit' ? 'User-added' : 'Learned'}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-[#555]">
                                    {memory.memory_type}
                                  </span>
                                </div>

                                {/* Action buttons */}
                                {editingMemoryId !== memory.id && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditMemory(memory.id); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-[#ccc] hover:bg-[#1a1a1a] transition-colors"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteMemory(memory.id); }}
                                      disabled={isDeletingMemory}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clear all */}
                  {anchorMemories.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear all memories? This cannot be undone.')) {
                          handleClearAllMemories();
                        }
                      }}
                      disabled={isClearingMemories}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      {isClearingMemories ? 'Clearing...' : 'Clear all memories'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}



          {/* Deletion Tab */}
          {activeTab === 'deletion' && (
            <div className="space-y-6 max-w-xl">
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-red-400 mb-1">Warning: This action is permanent</h4>
                    <p className="text-sm text-[#888]">
                      Deleting your account will permanently remove all your data, including chat history, saved tabs, and notes. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#888] mb-2">
                  Confirm Account Deletion
                </label>
                <p className="text-sm text-[#666] mb-4">
                  Type <strong className="text-[#e5e5e5]">DELETE</strong> to confirm account deletion
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#141414] border border-[#1f1f1f] text-[#e5e5e5] placeholder:text-[#444] focus:outline-none focus:border-red-500/40 transition-colors mb-4"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={isUpdating || deleteConfirmText !== 'DELETE'}
                  className="w-full px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </span>
                  ) : (
                    'Delete Account Permanently'
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Password Change Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPasswordModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[#e5e5e5]">Change Password</h3>
              <button onClick={() => setPasswordModalOpen(false)} className="p-2 rounded-lg hover:bg-[#1a1a1a]">
                <X className="w-4 h-4 text-[#666]" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#888] mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-2.5 rounded-lg bg-[#141414] border border-[#1f1f1f] text-[#e5e5e5] placeholder:text-[#444] focus:outline-none focus:border-[#333]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#888] mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 rounded-lg bg-[#141414] border border-[#1f1f1f] text-[#e5e5e5] placeholder:text-[#444] focus:outline-none focus:border-[#333]"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isUpdating}
              className="w-full py-2.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Change Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
