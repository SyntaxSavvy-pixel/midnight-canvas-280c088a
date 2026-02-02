import { useState, useEffect } from 'react';
import {
  X,
  User,
  Settings,
  Trash2,
  Lock,
  Mail,
  Check,
  Shield,
  Eye,
  Database,
  Cookie,
  Loader2,
  HelpCircle,
  Brain,
  LogOut,
  Crown,
  Sparkles,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  FileText,
  Zap,
  ChevronRight,
  Plus,
  Pencil,
  X as XIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AvatarPicker from './AvatarPicker';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Tab;
  onLogout?: () => void;
}

type Tab = 'help' | 'memory' | 'profile' | 'settings' | 'usage' | 'privacy' | 'deletion';

// Mock memory items - in a real app, these would come from your backend
interface MemoryItem {
  id: string;
  content: string;
  createdAt: Date;
}

const UserSettingsModal = ({
  isOpen,
  onClose,
  initialTab = 'profile',
  onLogout,
}: UserSettingsModalProps) => {
  const { profile, updateProfile, changePassword, deleteAccount, signOut, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [editedName, setEditedName] = useState(profile?.display_name || '');
  const [editedUsername, setEditedUsername] = useState(profile?.username || '');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memory state
  const [memories, setMemories] = useState<MemoryItem[]>([
    { id: '1', content: 'User prefers dark mode interfaces', createdAt: new Date('2025-01-15') },
    { id: '2', content: 'Working on a project called TabKeep', createdAt: new Date('2025-01-18') },
  ]);
  const [newMemory, setNewMemory] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState('');

  // Update active tab when initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Reset form when profile changes
  useEffect(() => {
    setEditedName(profile?.display_name || '');
    setEditedUsername(profile?.username || '');
  }, [profile]);

  if (!isOpen) return null;

  const plan = profile?.plan === 'max' ? 'Max' : profile?.plan === 'pro' ? 'Pro' : 'Free';
  const used = profile?.intelligence_used || 0;
  const limit = profile?.intelligence_limit || 100;
  const percentage = Math.min(Math.round((used / limit) * 100), 100);

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
      onClose();
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
    onClose();
    if (onLogout) {
      onLogout();
    } else {
      signOut();
    }
  };

  // Memory handlers
  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    const memory: MemoryItem = {
      id: Date.now().toString(),
      content: newMemory.trim(),
      createdAt: new Date(),
    };
    setMemories([memory, ...memories]);
    setNewMemory('');
    toast.success('Memory saved');
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(memories.filter(m => m.id !== id));
    toast.success('Memory deleted');
  };

  const handleEditMemory = (id: string) => {
    const memory = memories.find(m => m.id === id);
    if (memory) {
      setEditingMemoryId(id);
      setEditingMemoryContent(memory.content);
    }
  };

  const handleSaveMemoryEdit = () => {
    if (!editingMemoryContent.trim()) return;
    setMemories(memories.map(m =>
      m.id === editingMemoryId
        ? { ...m, content: editingMemoryContent.trim() }
        : m
    ));
    setEditingMemoryId(null);
    setEditingMemoryContent('');
    toast.success('Memory updated');
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'help', label: 'Help Center', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'memory', label: 'Memory', icon: <Brain className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'usage', label: 'Usage', icon: <Zap className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="w-4 h-4" /> },
    { id: 'deletion', label: 'Delete Account', icon: <Trash2 className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[700px] bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Sidebar */}
        <div className="w-56 border-r border-[#1f1f1f] flex flex-col bg-[#0a0a0a]">
          {/* Header */}
          <div className="p-5 border-b border-[#1f1f1f]">
            <h2 className="text-xl font-medium text-[#e5e5e5]">Settings</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                  transition-colors duration-150
                  ${activeTab === tab.id
                    ? 'bg-[#1a1a1a] text-[#e5e5e5]'
                    : 'text-[#888] hover:text-[#ccc] hover:bg-[#141414]'
                  }
                  ${tab.id === 'deletion' ? 'text-red-400 hover:text-red-300' : ''}
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout at bottom */}
          <div className="p-2 border-t border-[#1f1f1f]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888] hover:text-[#ccc] hover:bg-[#141414] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with close button */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
            <h3 className="text-lg font-medium text-[#e5e5e5]">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              <X className="w-5 h-5 text-[#666]" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Help Center Tab */}
            {activeTab === 'help' && (
              <div className="space-y-6 max-w-2xl">
                <p className="text-[#888]">
                  Find answers to common questions and learn how to get the most out of TabKeep.
                </p>

                {/* Quick Links */}
                <div className="grid gap-3">
                  <a
                    href="https://www.tabkeep.app/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-[#181818] transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-[#1a1a1a]">
                        <FileText className="w-5 h-5 text-[#888]" />
                      </div>
                      <div>
                        <p className="text-[#e5e5e5] font-medium">Documentation</p>
                        <p className="text-sm text-[#666]">Learn how to use TabKeep</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#444] group-hover:text-[#666]" />
                  </a>

                  <a
                    href="https://tabkeep.app/faq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-[#181818] transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-[#1a1a1a]">
                        <MessageSquare className="w-5 h-5 text-[#888]" />
                      </div>
                      <div>
                        <p className="text-[#e5e5e5] font-medium">FAQ</p>
                        <p className="text-sm text-[#666]">Frequently asked questions</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[#444] group-hover:text-[#666]" />
                  </a>

                  <a
                    href="mailto:support@tabkeep.app"
                    className="flex items-center justify-between p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] hover:border-[#2a2a2a] hover:bg-[#181818] transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-[#1a1a1a]">
                        <Mail className="w-5 h-5 text-[#888]" />
                      </div>
                      <div>
                        <p className="text-[#e5e5e5] font-medium">Contact Support</p>
                        <p className="text-sm text-[#666]">Get help from our team</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#444] group-hover:text-[#666]" />
                  </a>
                </div>

                {/* Version Info */}
                <div className="pt-6 border-t border-[#1f1f1f]">
                  <p className="text-xs text-[#444]">TabKeep v1.0.0</p>
                </div>
              </div>
            )}

            {/* Memory Tab - Claude-like */}
            {activeTab === 'memory' && (
              <div className="space-y-6 max-w-2xl">
                <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#1a1a1a]">
                      <Brain className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[#e5e5e5] font-medium mb-1">About Memory</p>
                      <p className="text-sm text-[#888]">
                        Memory allows TabKeep to remember information about you across conversations.
                        You can add, edit, or remove memories at any time.
                      </p>
                    </div>
                  </div>
                </div>

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
                    />
                    <button
                      onClick={handleAddMemory}
                      disabled={!newMemory.trim()}
                      className="px-4 py-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Memory list */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#888]">
                    Saved memories ({memories.length})
                  </label>

                  {memories.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-[#141414] border border-[#1f1f1f]">
                      <Brain className="w-8 h-8 text-[#333] mx-auto mb-3" />
                      <p className="text-[#666]">No memories saved yet</p>
                      <p className="text-sm text-[#444] mt-1">Add memories to help TabKeep remember your preferences</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memories.map((memory) => (
                        <div
                          key={memory.id}
                          className="group p-4 rounded-xl bg-[#141414] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors"
                        >
                          {editingMemoryId === memory.id ? (
                            <div className="flex gap-2">
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
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-[#ccc] text-sm">{memory.content}</p>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditMemory(memory.id)}
                                  className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-[#666] hover:text-[#888]"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMemory(memory.id)}
                                  className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-[#666] hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Clear all */}
                {memories.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all memories?')) {
                        setMemories([]);
                        toast.success('All memories cleared');
                      }
                    }}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear all memories
                  </button>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
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

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-xl">
                <p className="text-[#666]">General settings will be available soon.</p>
              </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
              <div className="space-y-8 max-w-2xl">
                {/* Plan usage limits */}
                <section>
                  <h2 className="text-lg font-medium text-[#e5e5e5] mb-6">Plan usage limits</h2>

                  {plan === 'Max' ? (
                    <div className="flex items-center gap-4 p-6 rounded-xl bg-[#141414] border border-[#1f1f1f]">
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
                        <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-blue-500"
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
                        <div className="h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-blue-500"
                            style={{ width: `${Math.min(percentage + 5, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Last updated */}
                      <div className="flex items-center gap-2 text-sm text-[#555] mt-6">
                        <span>Last updated: {getLastUpdatedText()}</span>
                        <button
                          onClick={handleRefresh}
                          className="p-1 rounded hover:bg-[#1a1a1a] transition-colors"
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

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 max-w-2xl">
                {/* Privacy Header */}
                <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#1a1a1a]">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-[#e5e5e5] mb-1">Your Privacy Matters</h4>
                      <p className="text-sm text-[#888]">
                        We are committed to protecting your personal information and being transparent about how we collect, use, and share your data.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data Collection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-400" />
                    <h4 className="text-lg font-medium text-[#e5e5e5]">Data We Collect</h4>
                  </div>
                  <div className="pl-8 space-y-3">
                    <div className="p-3 rounded-lg bg-[#141414] border border-[#1f1f1f]">
                      <p className="text-sm font-medium text-[#e5e5e5] mb-1">Account Information</p>
                      <p className="text-xs text-[#666]">Email address, display name, and profile picture to personalize your experience.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#141414] border border-[#1f1f1f]">
                      <p className="text-sm font-medium text-[#e5e5e5] mb-1">Search History</p>
                      <p className="text-xs text-[#666]">Your search queries and saved tabs to provide personalized recommendations.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#141414] border border-[#1f1f1f]">
                      <p className="text-sm font-medium text-[#e5e5e5] mb-1">Usage Analytics</p>
                      <p className="text-xs text-[#666]">Anonymous usage data to improve our services and user experience.</p>
                    </div>
                  </div>
                </div>

                {/* How We Use Your Data */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <h4 className="text-lg font-medium text-[#e5e5e5]">How We Use Your Data</h4>
                  </div>
                  <ul className="pl-8 space-y-2">
                    <li className="flex items-start gap-2 text-sm text-[#888]">
                      <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>Provide and personalize our search and tab management services</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[#888]">
                      <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>Improve our algorithms and product features</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[#888]">
                      <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>Send important service updates and security alerts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-[#888]">
                      <Check className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>Protect against fraud and unauthorized access</span>
                    </li>
                  </ul>
                </div>

                {/* Cookies */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Cookie className="w-5 h-5 text-blue-400" />
                    <h4 className="text-lg font-medium text-[#e5e5e5]">Cookies & Tracking</h4>
                  </div>
                  <p className="pl-8 text-sm text-[#888]">
                    We use essential cookies to keep you signed in and remember your preferences. We do not sell your data to third parties or use invasive tracking technologies.
                  </p>
                </div>

                {/* Your Rights */}
                <div className="p-4 rounded-xl bg-[#141414] border border-[#1f1f1f]">
                  <h4 className="font-medium text-[#e5e5e5] mb-3">Your Rights</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm text-[#888]">
                      <span className="font-medium text-[#ccc]">Access</span> — Request a copy of your data
                    </div>
                    <div className="text-sm text-[#888]">
                      <span className="font-medium text-[#ccc]">Delete</span> — Remove your account and data
                    </div>
                    <div className="text-sm text-[#888]">
                      <span className="font-medium text-[#ccc]">Export</span> — Download your information
                    </div>
                    <div className="text-sm text-[#888]">
                      <span className="font-medium text-[#ccc]">Correct</span> — Update inaccurate data
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#444] text-center">
                  Last updated: January 2026 • Contact us at privacy@tabkeep.app for questions
                </p>
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
          </div>
        </div>
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

export default UserSettingsModal;
