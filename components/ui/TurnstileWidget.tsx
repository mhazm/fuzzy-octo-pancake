"use client";

/**
 * Cloudflare Turnstile — Reusable React Widget
 *
 * Usage:
 *   const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
 *
 *   <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
 *
 * Then pass `turnstileToken` to your Server Action.
 *
 * Props:
 *   - onVerify(token: string)  — called when the challenge is solved
 *   - onExpire()               — called when the token expires (user must re-solve)
 *   - onError()                — called on widget error
 *   - theme                    — "light" | "dark" | "auto" (default: "auto")
 *   - size                     — "normal" | "compact" | "flexible" (default: "normal")
 *   - className                — extra wrapper class
 */

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
}

export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = "auto",
  size = "normal",
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget = () => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;

    // Clean up existing widget before re-rendering
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (_) {}
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      size,
      callback: (token: string) => onVerify(token),
      "expired-callback": () => {
        onExpire?.();
      },
      "error-callback": () => {
        onError?.();
      },
    });
  };

  // Re-render if theme/size changes
  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
    }
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_) {}
      }
    };
  }, [theme, size]);

  if (!siteKey) {
    // In development without a site key, show a placeholder
    if (process.env.NODE_ENV === "development") {
      return (
        <div className={`flex items-center justify-center h-16 rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground ${className || ""}`}>
          🔒 Turnstile widget (dev mode — NEXT_PUBLIC_TURNSTILE_SITE_KEY not set)
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onLoad={renderWidget}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}
