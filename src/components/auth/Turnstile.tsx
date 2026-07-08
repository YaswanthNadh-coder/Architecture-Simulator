import { useEffect, useRef, useCallback } from 'react';

/**
 * Cloudflare Turnstile CAPTCHA widget.
 *
 * Renders an invisible/managed Turnstile challenge and calls `onVerify`
 * with the token once the user passes.
 *
 * Requires the Turnstile script loaded in index.html:
 *   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
 *
 * Environment variable: VITE_TURNSTILE_SITE_KEY
 */

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  /** Force a re-render/reset by changing this value */
  resetKey?: number;
}

export const Turnstile = ({ onVerify, onExpire, onError, resetKey }: TurnstileProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;

    // Remove existing widget if present
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      appearance: 'interaction-only',  // invisible unless needed
      callback: (token: string) => onVerify(token),
      'expired-callback': () => onExpire?.(),
      'error-callback': () => onError?.(),
    });
  }, [siteKey, onVerify, onExpire, onError]);

  // Mount / reset
  useEffect(() => {
    // Turnstile script may not be loaded yet — poll briefly
    if (window.turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      // Stop polling after 10 seconds
      const timeout = setTimeout(() => clearInterval(interval), 10000);
      return () => { clearInterval(interval); clearTimeout(timeout); };
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
    };
  }, [renderWidget, resetKey]);

  if (!siteKey) {
    // Gracefully degrade — no CAPTCHA if site key not configured
    return null;
  }

  return <div ref={containerRef} />;
};
