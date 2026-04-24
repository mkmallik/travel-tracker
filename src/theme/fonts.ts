// Loads a curated UI font. On web we inject the Google Fonts link + a global
// CSS rule so every Text/TextInput (which react-native-web renders as real DOM)
// picks it up without changing every StyleSheet.
//
// We use Manrope — a modern geometric sans with a variable-weight axis (400–800)
// that suits a travel/lifestyle app. Falls back cleanly to system UI if the
// network font hasn't loaded yet (display=swap), so users never see blank text.
//
// Native (iOS/Android) currently falls back to system. When we care about
// parity with web on native, wire up `@expo-google-fonts/manrope` + useFonts().

import { Platform } from 'react-native';

const FONT_STACK =
  `'Manrope', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`;

export const FONT_FAMILY = FONT_STACK;

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const preconnect = (href: string, crossorigin = false) => {
    if (document.head.querySelector(`link[data-font-preconnect="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'preconnect';
    l.href = href;
    if (crossorigin) l.crossOrigin = 'anonymous';
    l.setAttribute('data-font-preconnect', href);
    document.head.appendChild(l);
  };

  preconnect('https://fonts.googleapis.com');
  preconnect('https://fonts.gstatic.com', true);

  if (!document.head.querySelector('link[data-font-loader="manrope"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap';
    l.setAttribute('data-font-loader', 'manrope');
    document.head.appendChild(l);
  }

  if (!document.head.querySelector('style[data-font-global]')) {
    const s = document.createElement('style');
    s.setAttribute('data-font-global', '');
    s.textContent = `
      #root, #root * {
        font-family: ${FONT_STACK};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
        letter-spacing: -0.003em;
      }
      /* Form elements are outside the React tree override on some browsers */
      input, textarea, select, button {
        font-family: ${FONT_STACK};
      }
      /* Nicer numerals for money displays */
      .css-view-g5y9jx, .css-text-146c3p1 {
        font-feature-settings: "ss01", "cv11";
      }
    `;
    document.head.appendChild(s);
  }
}
