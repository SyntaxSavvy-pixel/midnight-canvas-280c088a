import { User } from 'lucide-react';

interface SignUpButtonProps {
  onClick?: () => void;
  isAuthenticated?: boolean;
  avatarUrl?: string | null;
}

const SignUpButton = ({ onClick, isAuthenticated, avatarUrl }: SignUpButtonProps) => {
  if (isAuthenticated) {
    return (
      <button
        onClick={onClick}
        className="
          w-10 h-10 rounded-lg overflow-hidden
          bg-primary text-primary-foreground
          flex items-center justify-center
          hover:bg-primary/90
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background
          border border-primary/20
        "
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="
        px-5 py-2.5 rounded-xl
        bg-secondary/50 hover:bg-secondary/70
        border border-border/50 hover:border-border/70
        text-sm font-normal text-foreground/90 hover:text-foreground
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-primary/30
        hover:scale-[1.02]
      "
    >
      Sign up
    </button>
  );
};

export default SignUpButton;
