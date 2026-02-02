import { useState, useEffect } from 'react';
import AuthModal from '@/components/AuthModal';

const LoginPage = ({ onSignInSuccess }: { onSignInSuccess: () => void }) => {
    // Always open for standalone login page
    const [authModalOpen, setAuthModalOpen] = useState(true);

    return (
        <div className="h-screen w-full bg-[var(--bg-background)]">
            <AuthModal
                isOpen={authModalOpen}
                onClose={() => { }} // Prevent closing in standalone mode
                onSuccess={onSignInSuccess}
            />
        </div>
    );
};

export default LoginPage;
