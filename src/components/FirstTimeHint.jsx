import { useState } from 'react';

// Lightweight, dismissible inline hint shown to first-time users on key
// screens. Each instance is keyed by `id`; dismissal is persisted in
// localStorage so the hint never resurfaces after the user closes it.
//
// This is the entire "onboarding" — no multi-step modals, no setup wizard.
// Just a single line of orientation per screen, in the same visual
// language as the rest of the app's accent cards.

const STORAGE_PREFIX = 'fitbridge_hint_dismissed_';

function readDismissed(id) {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(id) {
  try {
    localStorage.setItem(STORAGE_PREFIX + id, '1');
  } catch {
    /* localStorage might be disabled — that's fine, hint stays this session only. */
  }
}

export default function FirstTimeHint({ id, icon = '💡', title, children, style }) {
  const [dismissed, setDismissed] = useState(() => readDismissed(id));

  if (dismissed) return null;

  function handleDismiss() {
    writeDismissed(id);
    setDismissed(true);
  }

  return (
    <div
      role="note"
      style={{
        background: 'rgba(35, 224, 149, 0.10)',
        border: '1px solid rgba(35, 224, 149, 0.28)',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        ...(style || {}),
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.2 }} aria-hidden="true">{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 4 }}>
            {title}
          </p>
        )}
        <p style={{ fontSize: 12, color: '#C9C2E5', lineHeight: 1.5 }}>{children}</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss tip"
        style={{
          background: 'none',
          border: 'none',
          color: '#8F88B5',
          fontSize: 16,
          cursor: 'pointer',
          padding: 4,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
