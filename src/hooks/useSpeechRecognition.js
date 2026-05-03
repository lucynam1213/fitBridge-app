import { useCallback, useEffect, useRef, useState } from 'react';

// Thin wrapper around the Web Speech API for the conversational
// meal-logging UX. We never auto-start — the user explicitly taps the
// microphone, which is when we ask for permission.
//
// Supported browsers (as of 2026): Chrome, Edge, Safari (incl. iOS 14+),
// Opera. Firefox does NOT ship SpeechRecognition; the hook reports
// `supported: false` so the caller can render a fallback message
// telling the user to type instead.
//
// States the caller cares about:
//   * supported: boolean — did the SDK exist in this browser?
//   * listening: boolean — is the mic currently open?
//   * transcript: string — most recent FINAL recognition result, if any.
//   * error:     string  — short, user-facing error string ("denied",
//                          "no-speech", "network", "aborted", "unknown").
//                          Empty string when there's no error.
//
// We pass continuous=false / interimResults=false so we get one clean
// final transcript per start() call — that's all the meal-search flow
// needs. Auto-stops after a short silence.

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function useSpeechRecognition() {
  const Ctor = getRecognitionCtor();
  const supported = Boolean(Ctor);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  // Map Web Speech API error codes to a small, user-friendly vocabulary
  // so the consuming page can switch on a stable string.
  const mapError = (event) => {
    const code = event?.error || 'unknown';
    if (code === 'not-allowed' || code === 'service-not-allowed') return 'denied';
    if (code === 'no-speech') return 'no-speech';
    if (code === 'aborted') return 'aborted';
    if (code === 'audio-capture') return 'audio-capture';
    if (code === 'network') return 'network';
    return 'unknown';
  };

  const start = useCallback(() => {
    if (!supported) {
      setError('unsupported');
      return;
    }
    // Reset any previous result so the caller knows when a new transcript
    // arrives via state change rather than having to dedupe.
    setTranscript('');
    setError('');

    let recognition;
    try {
      recognition = new Ctor();
    } catch (e) {
      console.error('[useSpeechRecognition] ctor failed', e);
      setError('unknown');
      return;
    }
    recognition.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      // SpeechRecognitionEvent.results is an array-like of array-likes.
      // With interimResults=false + continuous=false we expect exactly
      // one final result on success.
      const last = event.results?.[event.results.length - 1];
      const text = last?.[0]?.transcript?.trim() || '';
      if (text) setTranscript(text);
    };

    recognition.onerror = (event) => {
      const mapped = mapError(event);
      console.warn('[useSpeechRecognition] error', event?.error, '→', mapped);
      setError(mapped);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      // start() throws "InvalidStateError" if the mic is already open
      // (e.g. user double-tapped). Treat as a no-op — onstart already
      // flipped listening true.
      console.warn('[useSpeechRecognition] start threw', e);
    }
  }, [Ctor, supported]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try { r.stop(); } catch { /* ignore */ }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError('');
  }, []);

  // Stop listening when the component unmounts so the mic indicator
  // never lingers after a route change.
  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (r) {
        try { r.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}

// Tidy up a free-form "I had X for lunch" phrase into something USDA
// is more likely to match. Strip leading "I had / I ate / I just had",
// trailing meal-time qualifiers, and collapse whitespace. Returns the
// original string when no rules match.
//
// We deliberately keep this dumb — the brief explicitly says "Do not
// add complex AI parsing yet." The full phrase is searched first; if
// it returns no hits the caller can re-search with the cleaned version.
const STRIP_PATTERNS = [
  // Leading conversational fluff
  /^(?:i\s+(?:just\s+)?(?:had|ate|finished|grabbed|got))\b/i,
  /^(?:had|ate|grabbed|got)\b/i,
  /^(?:there\s+was|i\s+made)\b/i,
  // Meal-time tail ("for breakfast", "for dinner today", "this morning")
  /\bfor\s+(?:breakfast|lunch|dinner|brunch|a\s+snack|snack|dessert)(?:\s+today|\s+yesterday)?\b/gi,
  /\b(?:this|today\s+for)\s+(?:morning|afternoon|evening)\b/gi,
  /\bjust\s+now\b/gi,
];

export function cleanSpokenMeal(text) {
  if (!text) return '';
  let out = String(text).trim();
  for (const re of STRIP_PATTERNS) {
    out = out.replace(re, '');
  }
  return out
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:!?-]+|[\s.,;:!?-]+$/g, '')
    .trim();
}
