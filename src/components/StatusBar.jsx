// Simulated phone status bar removed for App Store readiness — the fake
// clock, battery, and signal icons aren't appropriate for a real product.
// We keep the component as a small top spacer so existing page layouts
// (which expect ~24px of breathing room above the page title) still look right.
//
// Pages still pass `theme="dark" | "light"` for parity with their headers;
// we hand it through as a className so consumers can target it from CSS.

export default function StatusBar({ theme = 'light' }) {
  return (
    <div
      className={`status-bar status-bar-spacer ${theme}`}
      aria-hidden="true"
      style={{ height: 12, padding: 0 }}
    />
  );
}
