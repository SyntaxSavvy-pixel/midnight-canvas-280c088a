import { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
}

const AuthModal = ({ isOpen, onClose, onSuccess, initialMode = 'signup' }: AuthModalProps) => {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validation
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name');
      setIsLoading(false);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await signUp({
          email,
          password,
          displayName: name,
          username: username || undefined,
        });

        if (signUpError) {
          setError(signUpError.message);
          setIsLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await signIn({ email, password });

        if (signInError) {
          setError(signInError.message);
          setIsLoading(false);
          return;
        }
      }

      // Clear form
      setEmail('');
      setPassword('');
      setName('');
      setUsername('');
      setError(null);

      onSuccess?.();
      onClose();
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="
        sm:max-w-md p-0 gap-0 overflow-hidden
        bg-card/95 backdrop-blur-xl
        border border-border/50
        rounded-3xl
        shadow-2xl
      ">
        {/* Header with gradient accent */}
        <div className="relative px-8 pt-8 pb-6">
          <div 
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: 'radial-gradient(ellipse 100% 100% at 50% 0%, hsl(200 80% 60% / 0.2) 0%, transparent 60%)',
            }}
          />
          <DialogHeader className="relative">
            <DialogTitle className="text-2xl font-light text-center text-foreground tracking-tight">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center mt-2 font-light">
              {mode === 'signup' 
                ? 'Start your intelligent search journey' 
                : 'Sign in to continue searching'
              }
            </p>
          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-light">{error}</p>
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  disabled={isLoading}
                  className="
                    w-full pl-12 pr-4 py-3.5
                    bg-secondary/50 rounded-xl
                    border border-border/50
                    text-foreground text-sm font-light
                    placeholder:text-muted-foreground/60
                    focus:outline-none focus:border-primary/50 focus:bg-secondary/70
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-300
                  "
                />
              </div>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username (optional)"
                  disabled={isLoading}
                  className="
                    w-full pl-12 pr-4 py-3.5
                    bg-secondary/50 rounded-xl
                    border border-border/50
                    text-foreground text-sm font-light
                    placeholder:text-muted-foreground/60
                    focus:outline-none focus:border-primary/50 focus:bg-secondary/70
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-300
                  "
                />
              </div>
            </>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              disabled={isLoading}
              className="
                w-full pl-12 pr-4 py-3.5
                bg-secondary/50 rounded-xl
                border border-border/50
                text-foreground text-sm font-light
                placeholder:text-muted-foreground/60
                focus:outline-none focus:border-primary/50 focus:bg-secondary/70
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-300
              "
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={isLoading}
              className="
                w-full pl-12 pr-4 py-3.5
                bg-secondary/50 rounded-xl
                border border-border/50
                text-foreground text-sm font-light
                placeholder:text-muted-foreground/60
                focus:outline-none focus:border-primary/50 focus:bg-secondary/70
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-300
              "
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="
              w-full py-3.5 mt-2
              bg-primary text-primary-foreground
              rounded-xl font-medium text-sm
              flex items-center justify-center gap-2
              hover:bg-primary/90
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-card
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300
              group
            "
            style={{
              boxShadow: '0 0 30px -5px hsl(200 80% 60% / 0.3)',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              <>
                {mode === 'signup' ? 'Create account' : 'Sign in'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-xs text-muted-foreground font-light">or</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Toggle mode */}
          <p className="text-center text-sm text-muted-foreground font-light">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
