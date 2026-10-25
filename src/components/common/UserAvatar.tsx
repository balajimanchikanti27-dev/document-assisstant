import React from 'react';

interface UserAvatarProps {
  name?: string | null;
  photoURL?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  photoURL,
  size = 'md',
  className = '',
}) => {
  const initials = (name || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name || 'User profile'}
        className={`rounded-full object-cover border border-neutral-200 dark:border-neutral-700 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold flex items-center justify-center border border-brand-200 dark:border-brand-800 select-none ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};
