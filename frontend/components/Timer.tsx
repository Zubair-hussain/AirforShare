'use client';

import { useState, useEffect } from 'react';
import { formatTimeRemaining } from '../lib/api';

interface TimerProps {
  expiresAt: number;
  onExpired?: () => void;
}

export default function Timer({ expiresAt, onExpired }: TimerProps) {
  const [display, setDisplay] = useState(formatTimeRemaining(expiresAt));
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const tick = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setDisplay('Expired');
        onExpired?.();
        return;
      }
      setDisplay(formatTimeRemaining(expiresAt));
      setIsUrgent(remaining < 5 * 60 * 1000); // urgent if < 5 min
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  return (
    <div className="timer-wrap">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 3.5V6L7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span className={`timer-value ${isUrgent ? 'urgent' : ''}`}>{display}</span>
      <style>{`
        .timer-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--text-muted);
        }
        .timer-value.urgent {
          color: var(--danger);
          animation: pulse-glow 1s infinite;
        }
      `}</style>
    </div>
  );
}
