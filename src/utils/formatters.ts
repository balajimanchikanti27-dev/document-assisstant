export const formatBytes = (bytes: number, decimals: number = 1): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatRelativeTime = (timestamp: number | string): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (isNaN(date)) return 'Recently';

  const now = Date.now();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const maskPhoneNumber = (phone: string): string => {
  if (!phone || phone.length < 6) return phone;
  // Keep country code and first 2 digits, mask middle, show last 3 digits
  const trimmed = phone.trim();
  const visibleStart = trimmed.slice(0, 5);
  const visibleEnd = trimmed.slice(-3);
  return `${visibleStart} •••• ••${visibleEnd}`;
};

export const extractDomain = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return 'Web source';
  }
};
