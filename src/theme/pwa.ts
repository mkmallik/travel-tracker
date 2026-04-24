// PWA metadata injection for the web build.
// Chrome's "install app" heuristic looks for:
//   • A linked web manifest with at least 192x192 and 512x512 icons
//   • HTTPS + service worker (we don't need a SW for minimal install)
//   • display: standalone or fullscreen
// We inject the tags client-side at module init because Expo's web output
// template doesn't expose a <head> customization point we control.
// Chrome's installability checks run continuously after DOMContentLoaded,
// so runtime injection works reliably for an "Install app" prompt in the
// browser menu within ~1s of landing.

import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const head = document.head;

  const addLink = (rel: string, href: string, extras: Record<string, string> = {}) => {
    if (head.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = rel;
    l.href = href;
    for (const [k, v] of Object.entries(extras)) l.setAttribute(k, v);
    head.appendChild(l);
  };

  const addMeta = (name: string, content: string, useProperty = false) => {
    const attr = useProperty ? 'property' : 'name';
    if (head.querySelector(`meta[${attr}="${name}"]`)) return;
    const m = document.createElement('meta');
    m.setAttribute(attr, name);
    m.content = content;
    head.appendChild(m);
  };

  addLink('manifest', '/manifest.webmanifest');
  addLink('apple-touch-icon', '/apple-touch-icon.png');
  addLink('icon', '/icon-192.png', { type: 'image/png', sizes: '192x192' });
  addLink('icon', '/icon-512.png', { type: 'image/png', sizes: '512x512' });

  // Theme + install hints
  addMeta('theme-color', '#0F172A');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  addMeta('apple-mobile-web-app-title', 'Travel');

  // OpenGraph + Twitter for link previews when shared
  addMeta('og:title', 'Travel Tracker', true);
  addMeta('og:description', 'Itinerary, bookings, and expenses for your trips.', true);
  addMeta('og:type', 'website', true);
  addMeta('twitter:card', 'summary');
}
