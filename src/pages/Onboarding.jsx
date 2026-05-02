import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar';
import Icon from '../components/Icon';

// Pre-signup welcome carousel. Four slides walk a first-time user through
// what FitBridge does so the find-a-gym flow doesn't feel abrupt.
//
// Implementation notes
// --------------------
// The swipe interaction is a CSS scroll-snap row inside an overflow-x:auto
// container. Each slide is exactly the container's width and snaps to it,
// so swipe / drag / mousewheel all work without any custom touch handlers.
// We listen for `scroll` events, snap-debounced via requestAnimationFrame,
// to keep the active dot + buttons in sync with whichever slide is
// currently centered.
//
// Skip / Get Started always navigate to /auth (the user signs up there,
// then the post-signup branch takes them to /connect/gym). Slide 1's
// "I already have an account" link mirrors the previous welcome screen.

const SLIDES = [
  {
    title: 'Welcome to FitBridge',
    subtitle:
      'Connect with expert trainers and get personalized fitness support — all from your phone.',
    iconName: 'dumbbell',
    accent: '#00C87A',
    decoration: '🏋️',
  },
  {
    title: 'Find nearby gyms',
    subtitle:
      'Search for gyms in your area, see their distance, ratings, and what each one is best for.',
    iconName: 'pin',
    accent: '#7C5CFF',
    decoration: '📍',
  },
  {
    title: 'Connect with a trainer',
    subtitle:
      'Pick a coach at your gym, send a quick connection request, and start training together.',
    iconName: 'users',
    accent: '#FF7CB7',
    decoration: '🤝',
  },
  {
    title: 'Track meals & progress',
    subtitle:
      'Log meals, snap photos for AI nutrition lookup, and watch your weight and streak grow.',
    iconName: 'chart',
    accent: '#FBBF24',
    decoration: '📈',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);

  // Sync the active dot + button label with whichever slide is centered.
  // Throttled to one update per animation frame so we don't thrash React
  // on every scroll pixel.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const w = el.clientWidth || 1;
        const i = Math.round(el.scrollLeft / w);
        setIndex((prev) => (prev === i ? prev : Math.max(0, Math.min(SLIDES.length - 1, i))));
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  function go(i) {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setIndex(clamped);
  }

  const isLast = index === SLIDES.length - 1;

  return (
    <div style={{ width: '100%', height: '100%', background: '#11151D', display: 'flex', flexDirection: 'column' }}>
      <StatusBar theme="light" />

      {/* Top bar — Skip floats above the slides so the user can bail at any time. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 20px 0' }}>
        <button
          type="button"
          onClick={() => navigate('/auth')}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#8F88B5', fontSize: 13, fontWeight: 600, padding: '8px 4px',
          }}
        >
          Skip
        </button>
      </div>

      {/* Slide track — horizontal scroll with CSS scroll-snap. */}
      <div
        ref={trackRef}
        style={{
          flex: 1,
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {SLIDES.map((s, i) => (
          <section
            key={s.title}
            style={{
              flex: '0 0 100%',
              scrollSnapAlign: 'center',
              scrollSnapStop: 'always',
              display: 'flex', flexDirection: 'column',
              padding: '0 28px',
            }}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDES.length}: ${s.title}`}
          >
            {/* Hero card — gradient based on slide accent so each slide
                has its own color memory without breaking the brand. */}
            <div style={{
              width: '100%',
              flex: 1,
              maxHeight: 320,
              borderRadius: 24,
              background: `linear-gradient(135deg, ${s.accent}26 0%, ${s.accent}10 100%)`,
              border: `1px solid ${s.accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
              marginTop: 12, marginBottom: 28,
            }}>
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 140, height: 140,
                borderRadius: '50%', background: `${s.accent}1F`,
              }} />
              <div style={{
                position: 'absolute', bottom: -24, left: -24, width: 96, height: 96,
                borderRadius: '50%', background: `${s.accent}14`,
              }} />
              <div style={{
                width: 96, height: 96, borderRadius: 28,
                background: `${s.accent}26`, color: s.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 1,
              }}>
                <Icon name={s.iconName} size={44} strokeWidth={1.8} />
              </div>
              <div style={{
                position: 'absolute', bottom: 16, right: 16,
                fontSize: 28, opacity: 0.55,
              }}>{s.decoration}</div>
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#F2EEFF', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' }}>
              {s.title}
            </h2>
            <p style={{ fontSize: 15, color: '#8F88B5', lineHeight: 1.6, textAlign: 'center', marginBottom: 0 }}>
              {s.subtitle}
            </p>
          </section>
        ))}
      </div>

      {/* Pagination dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '24px 0 16px' }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
            style={{
              width: i === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === index ? SLIDES[index].accent : 'rgba(255,255,255,0.18)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>

      {/* Buttons */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: `0 28px calc(24px + env(safe-area-inset-bottom, 0px))`,
      }}>
        <button
          type="button"
          className="btn btn-primary btn-full"
          onClick={() => (isLast ? navigate('/auth') : go(index + 1))}
        >
          {isLast ? 'Get Started' : 'Next'}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-full"
          onClick={() => navigate('/auth')}
        >
          I already have an account
        </button>
      </div>
    </div>
  );
}
