import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, Loader2, AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
}

type AuthMode = 'signin' | 'signup';
type Step = 'choice' | 'name' | 'email' | 'password';

const AuthModal = ({ isOpen, onClose, onSuccess, initialMode = 'signup' }: AuthModalProps) => {
  const { signUp, signIn } = useAuth();

  // State
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<Step>('choice');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('choice');
      setError(null);
      setIsTransitioning(false);
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Auto-focus input on step change
  useEffect(() => {
    if (step !== 'choice' && !isTransitioning) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [step, isTransitioning]);

  const goToStep = (nextStep: Step) => {
    setError(null);
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
    }, 300);
  };

  const handleNext = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    // Validation & Flow Logic
    if (step === 'name') {
      if (!name.trim()) { setError('Please enter your name'); return; }
      goToStep('email');
    } else if (step === 'email') {
      // Basic email regex
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email');
        return;
      }
      goToStep('password');
    } else if (step === 'password') {
      if (!password.trim()) { setError('Please enter a password'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

      // Final Submit
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await signUp({
          email,
          password,
          displayName: name,
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await signIn({ email, password });
        if (signInError) throw signInError;
      }
      onSuccess?.();
      // Don't close immediately if it's the standalone login page, but the onSuccess usually navigates away
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setIsLoading(false);
    }
  };

  const startFlow = (selectedMode: AuthMode) => {
    setMode(selectedMode);
    if (selectedMode === 'signup') {
      goToStep('name');
    } else {
      goToStep('email');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="
        w-screen h-screen max-w-none p-0 border-none outline-none rounded-none
        bg-[#050505] 
        data-[state=open]:animate-in data-[state=open]:fade-in duration-300
      ">
        <DialogTitle className="sr-only">Authentication</DialogTitle>

        {/* Background Ambience */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[120px]" />
        </div>

        {/* Controls */}
        <button
          onClick={onClose}
          className="absolute top-8 right-8 p-2 text-white/30 hover:text-white transition-colors z-50 rounded-full hover:bg-white/5"
        >
          <X className="w-6 h-6" />
        </button>

        {step !== 'choice' && (
          <button
            onClick={() => {
              if (step === 'password') goToStep('email');
              else if (step === 'email') goToStep(mode === 'signup' ? 'name' : 'choice');
              else if (step === 'name') goToStep('choice');
            }}
            className="absolute top-8 left-8 p-2 text-white/30 hover:text-white transition-colors z-50 rounded-full hover:bg-white/5"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}

        {/* Main Content Area */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6">

          <div className={`
                w-full max-w-sm transition-all duration-300 ease-out transform
                ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
            `}>

            {/* CHOICE STEP */}
            {step === 'choice' && (
              <div className="flex flex-col items-center gap-8">
                <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center border border-[#333] shadow-xl mb-2">
                  <img src="/favicon.png" alt="Logo" className="w-8 h-8 opacity-90" />
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-medium text-white tracking-tight">TabKeep</h2>
                  <p className="text-sm text-[#888]">The browser for your mind.</p>
                </div>

                <div className="flex flex-col gap-3 w-full pt-4">
                  <button
                    onClick={() => startFlow('signup')}
                    className="w-full py-3 bg-white text-black rounded-xl font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md"
                  >
                    Get Started
                  </button>
                  <button
                    onClick={() => startFlow('signin')}
                    className="w-full py-3 text-[#888] hover:text-[#e5e5e5] hover:bg-[#1a1a1a] rounded-xl font-medium text-sm transition-all duration-200"
                  >
                    I have an account
                  </button>
                </div>
              </div>
            )}

            {/* STEPS (Name, Email, Password) */}
            {step !== 'choice' && (
              <form onSubmit={handleNext} className="flex flex-col gap-5 w-full">

                <div className="space-y-1">
                  <label className="text-xs font-medium text-blue-400 uppercase tracking-wider pl-1 animate-in fade-in">
                    {step === 'name' ? 'Introduction' : step === 'email' ? 'Contact' : 'Security'}
                  </label>
                  <h2 className="text-xl font-medium text-white animate-in fade-in slide-in-from-bottom-2 delay-75">
                    {step === 'name' ? 'What should we call you?' :
                      step === 'email' ? "What's your email?" :
                        'Create a password'}
                  </h2>
                </div>

                <div className="relative group animate-in fade-in slide-in-from-bottom-2 delay-100">
                  <input
                    ref={inputRef}
                    type={step === 'password' ? 'password' : 'text'}
                    value={step === 'name' ? name : step === 'email' ? email : password}
                    onChange={e => {
                      if (step === 'name') setName(e.target.value);
                      else if (step === 'email') setEmail(e.target.value);
                      else setPassword(e.target.value);
                    }}
                    placeholder={step === 'name' ? 'Ex. John Doe' : step === 'email' ? 'name@example.com' : '••••••••'}
                    className="
                                    w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#555]
                                    focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all duration-200
                                "
                    autoComplete={step === 'email' ? 'email' : 'off'}
                  />
                  {step === 'password' && mode === 'signin' && (
                    <div className="absolute right-0 top-full pt-2">
                      <button type="button" className="text-xs text-[#666] hover:text-[#999] transition-colors">
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/10 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">{error}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end animate-in fade-in delay-200">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                                    px-6 py-2.5 bg-white text-black rounded-lg font-medium text-sm
                                    hover:bg-gray-100 active:scale-95 transition-all duration-200
                                    flex items-center gap-2 shadow-sm
                                "
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {step === 'password' ? 'Finish' : 'Continue'}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
