// Avatar management utilities

export const AVATARS = [
  '/avatars/avatar-1.svg',
  '/avatars/avatar-2.svg',
  '/avatars/avatar-3.svg',
  '/avatars/avatar-4.svg',
  '/avatars/avatar-5.svg',
  '/avatars/avatar-6.svg',
  '/avatars/avatar-7.svg',
  '/avatars/avatar-8.svg',
  '/avatars/avatar-9.svg',
  '/avatars/avatar-10.svg',
  '/avatars/avatar-11.svg',
  '/avatars/avatar-12.svg',
];

/**
 * Get a random avatar from the library
 */
export const getRandomAvatar = (): string => {
  const randomIndex = Math.floor(Math.random() * AVATARS.length);
  return AVATARS[randomIndex];
};

/**
 * Get avatar URL by index (for selecting specific avatars)
 */
export const getAvatarByIndex = (index: number): string => {
  if (index < 0 || index >= AVATARS.length) {
    return AVATARS[0];
  }
  return AVATARS[index];
};

/**
 * Get all available avatars
 */
export const getAllAvatars = (): string[] => {
  return [...AVATARS];
};

/**
 * Check if an avatar URL is valid
 */
export const isValidAvatar = (avatarUrl: string): boolean => {
  return AVATARS.includes(avatarUrl);
};
