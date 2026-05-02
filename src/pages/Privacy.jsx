import StatusBar from '../components/StatusBar';
import { useSafeBack } from '../utils/nav';

// Privacy policy. Plain MVP copy describing what FitBridge collects and
// how it's used. Reachable from both the user and trainer profile screens.
export default function Privacy() {
  // Deep-link safe back: when there's no in-app history (page opened via
  // share link / bookmark / refresh), fall back to the user profile.
  // ProtectedRoute will reroute trainers to /trainer/dashboard automatically.
  const goBack = useSafeBack('/user/profile');

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2EEFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="page-title">Privacy</h1>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 12, color: '#8F88B5', marginBottom: 18 }}>
          Last updated: April 29, 2026
        </p>

        <Section title="What we collect">
          FitBridge stores your account profile (name, email, role), the meals
          and workouts you log, body metrics you enter, and messages you send
          to your trainer. Photos you take during meal scans stay on your
          device unless you explicitly save the entry — only the resulting
          nutrition fields are persisted.
        </Section>

        <Section title="Where it's stored">
          Your data lives in your trainer's connected Airtable base. FitBridge
          does not run a separate server — every read and write goes directly
          from the app to Airtable using your trainer's credentials. We don't
          ship analytics SDKs and we don't share data with third parties.
        </Section>

        <Section title="Nutrition lookups">
          Food searches and barcode lookups are sent to USDA FoodData Central
          (or, if your account has it configured, Nutritionix) to resolve
          calories and macros. The query string (e.g. "grilled chicken breast")
          is sent — no personal information is attached.
        </Section>

        <Section title="What you can do">
          You control your data. You can edit your profile, change your
          metrics, and delete entries at any time. To delete your account
          entirely, contact your trainer or email <a href="mailto:support@fitbridge.app" style={{ color: '#00C87A' }}>support@fitbridge.app</a> —
          we'll remove your records within 7 days.
        </Section>

        <Section title="Children">
          FitBridge is not intended for users under 13. If you believe a child
          has signed up, contact us and we'll remove the account.
        </Section>

        <Section title="Contact">
          Questions about this policy? Reach us at{' '}
          <a href="mailto:support@fitbridge.app" style={{ color: '#00C87A' }}>support@fitbridge.app</a>.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#F2EEFF', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#C9C2E5', lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}
