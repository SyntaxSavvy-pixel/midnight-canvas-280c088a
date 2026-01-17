import { useState } from 'react';
import { X, User, Settings, Trash2, Lock, Mail, CreditCard, Check, Shield, Eye, Database, Cookie, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AvatarPicker from './AvatarPicker';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'settings' | 'privacy' | 'deletion';

const UserSettingsModal = ({
  isOpen,
  onClose,
}: UserSettingsModalProps) => {
  const { profile, updateProfile, changePassword, deleteAccount, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [editedName, setEditedName] = useState(profile?.display_name || '');
  const [editedUsername, setEditedUsername] = useState(profile?.username || '');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="
          relative w-full max-w-4xl h-[600px]
          bg-card/40 backdrop-blur-2xl
          border border-border/20
          rounded-3xl
          shadow-2xl shadow-black/50
          flex overflow-hidden
          animate-in fade-in zoom-in-95 duration-300
        "
      >
        {/* Sidebar */}
        <div className="w-64 border-r border-border/10 flex flex-col bg-black/20">
          {/* Header */}
          <div className="p-6 border-b border-border/10">
            <h2 className="text-lg font-medium text-foreground">User Settings</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${activeTab === 'profile'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground'
                }
              `}
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${activeTab === 'settings'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground'
                }
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${activeTab === 'privacy'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground'
                }
              `}
            >
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Privacy</span>
            </button>

            <button
              onClick={() => setActiveTab('deletion')}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${activeTab === 'deletion'
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                  : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground'
                }
              `}
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Account Deletion</span>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-6 border-b border-border/10">
            <h3 className="text-xl font-medium text-foreground">
              {activeTab === 'profile' && 'Profile Settings'}
              {activeTab === 'settings' && 'Subscription & Settings'}
              {activeTab === 'privacy' && 'Privacy Policy'}
              {activeTab === 'deletion' && 'Account Deletion'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <X className="w-5 h-5 text-foreground/70" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6 max-w-xl">
                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-3">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 rounded-xl bg-secondary/50 flex items-center justify-center border-2 border-border/20 overflow-hidden">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Profile avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-foreground/50" />
                      )}
                    </div>
                    <button
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                      className="px-4 py-2 rounded-lg bg-secondary/50 hover:bg-secondary/70 text-sm text-foreground/80 transition-colors"
                    >
                      {showAvatarPicker ? 'Cancel' : 'Change Avatar'}
                    </button>
                  </div>

                  {/* Avatar Picker */}
                  {showAvatarPicker && (
                    <div className="mb-4">
                      <AvatarPicker
                        currentAvatar={profile?.avatar_url || null}
                        onSelect={handleAvatarSelect}
                      />
                    </div>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Display Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="
                        flex-1 px-4 py-2.5 rounded-lg
                        bg-secondary/30 border border-border/20
                        text-foreground
                        focus:outline-none focus:bg-secondary/50 focus:border-primary/40
                        transition-all duration-200
                      "
                    />
                    <button
                      onClick={handleSaveName}
                      className="px-4 py-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Username
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editedUsername}
                      onChange={(e) => setEditedUsername(e.target.value)}
                      placeholder="username"
                      className="
                        flex-1 px-4 py-2.5 rounded-lg
                        bg-secondary/30 border border-border/20
                        text-foreground
                        focus:outline-none focus:bg-secondary/50 focus:border-primary/40
                        transition-all duration-200
                      "
                    />
                    <button
                      onClick={handleSaveUsername}
                      disabled={isUpdating}
                      className="px-4 py-2.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-secondary/30 border border-border/20">
                    <Mail className="w-4 h-4 text-foreground/50" />
                    <span className="text-foreground/70">{profile?.email || 'user@example.com'}</span>
                  </div>
                </div>

                {/* Change Password */}
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Password
                  </label>
                  <button
                    onClick={() => setPasswordModalOpen(true)}
                    className="
                      w-full flex items-center justify-between px-4 py-2.5 rounded-lg
                      bg-secondary/30 border border-border/20
                      hover:bg-secondary/50 hover:border-border/40
                      transition-all duration-200
                    "
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-foreground/50" />
                      <span className="text-foreground/70">Change Password</span>
                    </div>
                    <span className="text-xs text-muted-foreground">••••••••</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="relative">
                {/* Decorative gradient blur */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] pointer-events-none">
                  <div
                    className="w-full h-full bg-gradient-to-tr from-[#ff80b5]/20 to-[#9089fc]/20 blur-3xl opacity-30"
                    style={{
                      clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'
                    }}
                  />
                </div>

                {/* Header */}
                <div className="text-center mb-12">
                  <h2 className="text-sm font-semibold text-primary mb-3">Pricing</h2>
                  <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-4">
                    Choose the right plan for you
                  </p>
                  <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                    Choose an affordable plan that's packed with the best features for engaging your searches and managing your tabs.
                  </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {/* Pro Plan */}
                  <div className="rounded-3xl bg-white/[0.025] p-8 ring-1 ring-white/10 hover:ring-white/20 transition-all">
                    <h3 className="text-sm font-semibold text-primary mb-4">Pro</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-semibold tracking-tight text-foreground">$9.99</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-foreground/70 mb-8">
                      The perfect plan if you're just getting started with advanced search features.
                    </p>

                    <ul className="space-y-3 mb-8">
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Unlimited searches across all platforms</span>
                      </li>
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Up to 100 saved tabs</span>
                      </li>
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Advanced filters and sorting</span>
                      </li>
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Priority support response time</span>
                      </li>
                    </ul>

                    <button className="
                      w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-foreground
                      ring-1 ring-inset ring-white/5
                      hover:bg-white/20 transition-all
                    ">
                      Get started today
                    </button>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="relative rounded-3xl bg-white/5 p-8 ring-1 ring-white/10 hover:ring-primary/30 transition-all">
                    <h3 className="text-sm font-semibold text-primary mb-4">Enterprise</h3>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-semibold tracking-tight text-foreground">$29.99</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-foreground/70 mb-8">
                      Dedicated support and infrastructure for your team.
                    </p>

                    <ul className="space-y-3 mb-8">
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Unlimited searches and saved tabs</span>
                      </li>
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Unlimited team members</span>
                      </li>
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Advanced analytics and insights</span>
                      </li>
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Dedicated support representative</span>
                      </li>
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>API access and custom integrations</span>
                      </li>
                      <li className="flex gap-3 text-sm text-foreground/70">
                        <Check className="w-5 h-5 flex-shrink-0 text-primary" />
                        <span>Custom branding options</span>
                      </li>
                    </ul>

                    <button className="
                      w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white
                      hover:bg-primary/90 transition-all
                    ">
                      Get started today
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6 max-w-2xl">
                {/* Privacy Header */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-primary mb-1">Your Privacy Matters</h4>
                      <p className="text-sm text-foreground/70">
                        We are committed to protecting your personal information and being transparent about how we collect, use, and share your data.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data Collection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-medium text-foreground">Data We Collect</h4>
                  </div>
                  <div className="pl-8 space-y-3">
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                      <p className="text-sm font-medium text-foreground mb-1">Account Information</p>
                      <p className="text-xs text-muted-foreground">Email address, display name, and profile picture to personalize your experience.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                      <p className="text-sm font-medium text-foreground mb-1">Search History</p>
                      <p className="text-xs text-muted-foreground">Your search queries and saved tabs to provide personalized recommendations.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                      <p className="text-sm font-medium text-foreground mb-1">Usage Analytics</p>
                      <p className="text-xs text-muted-foreground">Anonymous usage data to improve our services and user experience.</p>
                    </div>
                  </div>
                </div>

                {/* How We Use Your Data */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-medium text-foreground">How We Use Your Data</h4>
                  </div>
                  <ul className="pl-8 space-y-2">
                    <li className="flex items-start gap-2 text-sm text-foreground/70">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Provide and personalize our search and tab management services</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground/70">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Improve our algorithms and product features</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground/70">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Send important service updates and security alerts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-foreground/70">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Protect against fraud and unauthorized access</span>
                    </li>
                  </ul>
                </div>

                {/* Cookies */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Cookie className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-medium text-foreground">Cookies & Tracking</h4>
                  </div>
                  <p className="pl-8 text-sm text-foreground/70">
                    We use essential cookies to keep you signed in and remember your preferences. We do not sell your data to third parties or use invasive tracking technologies.
                  </p>
                </div>

                {/* Your Rights */}
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/20">
                  <h4 className="font-medium text-foreground mb-3">Your Rights</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm text-foreground/70">
                      <span className="font-medium text-foreground">Access</span> — Request a copy of your data
                    </div>
                    <div className="text-sm text-foreground/70">
                      <span className="font-medium text-foreground">Delete</span> — Remove your account and data
                    </div>
                    <div className="text-sm text-foreground/70">
                      <span className="font-medium text-foreground">Export</span> — Download your information
                    </div>
                    <div className="text-sm text-foreground/70">
                      <span className="font-medium text-foreground">Correct</span> — Update inaccurate data
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Last updated: January 2026 • Contact us at privacy@tabkeep.com for questions
                </p>
              </div>
            )}

            {activeTab === 'deletion' && (
              <div className="space-y-6 max-w-xl">
                <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-red-500 mb-1">Warning: This action is permanent</h4>
                      <p className="text-sm text-foreground/70">
                        Deleting your account will permanently remove all your data, including chat history, saved tabs, and notes. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-2">
                    Confirm Account Deletion
                  </label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Type <strong className="text-foreground">DELETE</strong> to confirm account deletion
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="
                      w-full px-4 py-2.5 rounded-lg
                      bg-secondary/30 border border-border/20
                      text-foreground
                      focus:outline-none focus:bg-secondary/50 focus:border-red-500/40
                      transition-all duration-200
                      mb-4
                    "
                  />
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isUpdating || deleteConfirmText !== 'DELETE'}
                    className="
                      w-full px-4 py-2.5 rounded-lg
                      bg-red-500/10 hover:bg-red-500/20
                      text-red-500 border border-red-500/30
                      transition-colors
                      font-medium
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
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
          <div className="relative w-full max-w-md bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">Change Password</h3>
              <button onClick={() => setPasswordModalOpen(false)} className="p-2 rounded-lg hover:bg-secondary/50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-2.5 rounded-lg bg-secondary/30 border border-border/20 text-foreground focus:outline-none focus:bg-secondary/50 focus:border-primary/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 rounded-lg bg-secondary/30 border border-border/20 text-foreground focus:outline-none focus:bg-secondary/50 focus:border-primary/40"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isUpdating}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
