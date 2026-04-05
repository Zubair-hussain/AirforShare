'use client';

import { useEffect, useRef, useCallback } from 'react';

interface TurnstileProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, params: object) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export default function Turnstile({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // Clear any existing widget
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onSuccess,
      'error-callback': onError,
      'expired-callback': onExpire,
      theme,
      size,
    });
  }, [siteKey, onSuccess, onError, onExpire, theme, size]);

  useEffect(() => {
    // If Turnstile script is already loaded
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Set up callback for when script loads
    window.onTurnstileLoad = renderWidget;

    // Inject the script if not present
    if (!document.querySelector('#cf-turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
      }
    };
  }, [renderWidget]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: size === 'compact' ? 40 : 65,
      }}
    />
  );
}
