import { useEffect, useState } from 'react';

/** Live countdown label that ticks down every second until expiry. */
export function useExpiryCountdown(expiresAt: string | null | undefined): string {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt]);

  if (!expiresAt) {
    return '';
  }

  const remainingMs = new Date(expiresAt).getTime() - nowMs;
  if (remainingMs <= 0) {
    return 'Expired';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
}
