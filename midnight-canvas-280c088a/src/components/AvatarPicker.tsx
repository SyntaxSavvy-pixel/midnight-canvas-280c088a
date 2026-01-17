import { useState } from 'react';
import { Check } from 'lucide-react';
import { getAllAvatars } from '@/utils/avatars';

interface AvatarPickerProps {
  currentAvatar: string | null;
  onSelect: (avatarUrl: string) => void;
}

const AvatarPicker = ({ currentAvatar, onSelect }: AvatarPickerProps) => {
  const avatars = getAllAvatars();
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || avatars[0]);

  const handleSelect = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    onSelect(avatarUrl);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-foreground/80 mb-3">
        Choose Your Avatar
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {avatars.map((avatarUrl, index) => (
          <button
            key={index}
            onClick={() => handleSelect(avatarUrl)}
            className={`
              relative w-full aspect-square rounded-xl overflow-hidden
              border-2 transition-all duration-200
              hover:scale-105 hover:shadow-lg
              ${
                selectedAvatar === avatarUrl
                  ? 'border-primary shadow-primary/20 shadow-lg'
                  : 'border-border/30 hover:border-primary/50'
              }
            `}
          >
            <img
              src={avatarUrl}
              alt={`Avatar ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {selectedAvatar === avatarUrl && (
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AvatarPicker;
