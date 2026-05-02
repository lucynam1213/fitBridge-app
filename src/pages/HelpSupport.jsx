import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar';
import { useSafeBack } from '../utils/nav';

// Help & Support — FAQ + contact entry points. Reachable from both the
// user and trainer profile screens.
export default function HelpSupport() {
  const navigate = useNavigate();
  // Deep-link safe back — same fallback logic as Privacy.
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
          <h1 className="page-title">Help & Support</h1>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '16px 20px' }}>
        {/* Quick contact */}
        <div className="card card-lg" style={{ marginBottom: 16, background: 'linear-gradient(135deg, #1A1530 0%, #221C3F 100%)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#00C87A', marginBottom: 6, letterSpacing: 0.5 }}>NEED HELP?</p>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F2EEFF', marginBottom: 6 }}>We respond in under 24 hours</h2>
          <p style={{ fontSize: 13, color: '#C9C2E5', marginBottom: 14, lineHeight: 1.5 }}>
            For account or technical issues, email our support team. For
            workout or nutrition questions, message your trainer directly.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href="mailto:support@fitbridge.app?subject=FitBridge%20support"
              className="btn btn-primary btn-sm"
              style={{ fontSize: 13 }}
            >
              ✉ Email support
            </a>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: 13 }}
              onClick={() => navigate('/user/messages')}
            >
              💬 Message trainer
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="section-title" style={{ marginBottom: 10 }}>Frequently asked</div>

        <Faq q="My meals aren't showing up.">
          Pull down to refresh, or sign out and back in. If they still don't
          appear, your trainer's Airtable might be missing a column — check
          the developer console for an `[airtable] CRITICAL` message that
          names the missing field.
        </Faq>

        <Faq q="Why doesn't food search find restaurant items?">
          USDA FoodData Central covers most whole and branded grocery foods.
          Restaurant chains (McDonald's, In-N-Out, Chipotle) require a
          Nutritionix key on top — see your trainer to enable it.
        </Faq>

        <Faq q="Why does my photo scan ask me to type the food name?">
          Free vision APIs that can identify plated meals reliably aren't
          available, so we capture the photo (so your trainer can review it)
          and ask you to confirm what's in it. The nutrition values come
          from USDA, not a guess.
        </Faq>

        <Faq q="Can I log a meal for a previous day?">
          The current version only lets you log for today, but you can browse
          previous days in Nutrition with the date arrows. Backfilling
          historical days is on the roadmap.
        </Faq>

        <Faq q="How do I change my goal or weight target?">
          Profile → Edit Profile. Updates sync to your trainer's view
          immediately.
        </Faq>

        <Faq q="I want to delete my account.">
          Email{' '}
          <a href="mailto:support@fitbridge.app" style={{ color: '#00C87A' }}>support@fitbridge.app</a>
          {' '}and we'll remove your records within 7 days.
        </Faq>

        <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(124,92,255,0.10)', border: '1px solid rgba(124,92,255,0.25)', borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: '#C9C2E5', lineHeight: 1.6 }}>
            <strong style={{ color: '#F2EEFF' }}>Build:</strong>{' '}
            {typeof __FB_BUILD_TIME__ !== 'undefined' ? __FB_BUILD_TIME__ : 'dev'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Faq({ q, children }) {
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 6 }}>{q}</p>
      <p style={{ fontSize: 13, color: '#C9C2E5', lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}
