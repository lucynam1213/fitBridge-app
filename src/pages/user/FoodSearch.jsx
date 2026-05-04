import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import StatusBar from '../../components/StatusBar';
import Icon from '../../components/Icon';
import { searchFoods, isNutritionApiConfigured, QUICK_QUERIES } from '../../services/nutritionApi';
import useSpeechRecognition, { cleanSpokenMeal } from '../../hooks/useSpeechRecognition';
import { useSafeBack } from '../../utils/nav';

// Conversational meal search: tap the mic and say "I had eggs and toast for
// breakfast" — we strip the conversational filler ("I had", "for
// breakfast") via cleanSpokenMeal() and run the existing USDA search with
// the cleaned phrase. Manual typing + scan flows are untouched and remain
// the primary input methods.
export default function FoodSearch() {
  const navigate = useNavigate();
  const goBack = useSafeBack('/user/nutrition');
  const [params] = useSearchParams();
  const presetMeal = params.get('meal') || 'Breakfast';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);

  // Speech recognition. `transcript` is the most recent final phrase
  // we've heard; we keep it in local state too (`spokenPhrase`) so the
  // "We heard:" panel persists after the mic closes — the hook resets
  // its own transcript on each start() call.
  const speech = useSpeechRecognition();
  const [spokenPhrase, setSpokenPhrase] = useState('');

  // When the hook reports a final transcript, push it into the search
  // input (cleaned) AND remember the original so the "We heard:" panel
  // can echo it back to the user verbatim. The existing useEffect below
  // takes care of running the search — same path manual typing uses.
  useEffect(() => {
    if (!speech.transcript) return;
    const cleaned = cleanSpokenMeal(speech.transcript);
    setSpokenPhrase(speech.transcript);
    setQuery(cleaned || speech.transcript);
    setTouched(true);
  }, [speech.transcript]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (q.length < 2) {
      // Don't pummel the API on every single keystroke.
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setTouched(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const r = await searchFoods(q);
        setResults(r);
      } catch (err) {
        console.error('[FoodSearch] search failed', err);
        setError(err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(item) {
    const payload = encodeURIComponent(JSON.stringify({ ...item, mealType: presetMeal }));
    navigate(`/user/nutrition/food?item=${payload}`);
  }

  function handleMic() {
    if (speech.listening) { speech.stop(); return; }
    setSpokenPhrase('');
    speech.start();
  }

  function clearSpoken() {
    setSpokenPhrase('');
    speech.reset();
  }

  // Friendly copy for the speech error states. The hook normalises every
  // failure into a small vocabulary; we map each to UI text.
  const speechErrorCopy = {
    denied: 'Microphone access was denied. You can still type your meal.',
    'no-speech': 'No speech detected. Tap the mic and try again.',
    'audio-capture': 'No microphone available. Type your meal instead.',
    network: 'Voice service is offline. Type your meal instead.',
    aborted: '',
    unknown: 'Voice input failed. Type your meal instead.',
    unsupported: 'Voice search is not supported on this browser. Please type your meal instead.',
  };
  const speechErrorMessage = speech.error ? (speechErrorCopy[speech.error] || speechErrorCopy.unknown) : '';

  return (
    <div style={{ width: '100%', height: '100%', background: '#0E0B1F', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#11151D' }}>
        <StatusBar theme="light" />
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="back-btn" onClick={goBack}>
            <Icon name="chevronLeft" size={16} color="#F2EEFF" />
          </button>
          <h1 className="page-title">Search Food</h1>
        </div>
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <span className="search-icon" style={{ display: 'inline-flex' }}>
              <Icon name="search" size={16} color="#6B7280" />
            </span>
            <input
              autoFocus
              className="input search-input"
              placeholder="Search any food (Korean, Western, branded…)"
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
            />
          </div>
          {/* Microphone button — visible whenever the browser supports the
              Web Speech API. When unsupported we hide it and surface a
              one-line note in the body instead. The button ALSO works as
              a stop-toggle while listening. */}
          {speech.supported && (
            <button
              type="button"
              onClick={handleMic}
              aria-label={speech.listening ? 'Stop listening' : 'Speak to search'}
              aria-pressed={speech.listening}
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: speech.listening ? '#EF4444' : 'rgba(0,200,122,0.18)',
                color: speech.listening ? '#fff' : '#00C87A',
                border: speech.listening ? 'none' : '1px solid rgba(0,200,122,0.40)',
                cursor: 'pointer',
                boxShadow: speech.listening ? '0 0 0 6px rgba(239,68,68,0.18)' : 'none',
                transition: 'background 0.15s, box-shadow 0.2s',
              }}
            >
              <Icon name="mic" size={20} />
            </button>
          )}
        </div>

        {/* Listening / unsupported / error notice. Sits inside the header
            block so it's always visible while the user reads results. */}
        {speech.listening && (
          <div style={{ padding: '0 20px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#EF4444', fontWeight: 700 }}>
            <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: '#EF4444', animation: 'pulse 1s infinite',
            }} />
            Listening… speak your meal
          </div>
        )}

        {!speech.supported && (
          <p style={{ padding: '0 20px 10px', fontSize: 11, color: '#FBBF24' }}>
            Voice search isn't supported on this browser — please type your meal instead.
          </p>
        )}

        {speechErrorMessage && !speech.listening && (
          <p style={{ padding: '0 20px 10px', fontSize: 11, color: '#FBBF24' }}>
            {speechErrorMessage}
          </p>
        )}

        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="chip chip-default" style={{ fontSize: 11 }}>Meal: {presetMeal}</span>
          {!isNutritionApiConfigured && (
            <span className="chip chip-yellow" style={{ fontSize: 11 }}>Local data</span>
          )}
          <button
            className="see-all"
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            onClick={() => navigate(`/user/meal/scan?meal=${presetMeal}`)}
          >
            <Icon name="camera" size={14} />
            Scan instead
          </button>
        </div>
      </div>

      <div className="phone-content" style={{ padding: '12px 20px' }}>
        {/* Conversational summary — only renders after a successful
            transcription. Lets the user see what we heard, edit it, or
            try again from one place. */}
        {spokenPhrase && (
          <div
            className="card"
            style={{
              marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(0,200,122,0.14), rgba(35, 224, 149,0.10))',
              border: '1px solid rgba(0,200,122,0.30)',
            }}
          >
            <p style={{ fontSize: 11, color: '#00C87A', fontWeight: 700, marginBottom: 4, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              We heard
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#F2EEFF', lineHeight: 1.5, marginBottom: 12 }}>
              "{spokenPhrase}"
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ flex: 1 }}
                onClick={() => { /* focus + clear so the user can edit */
                  setQuery(spokenPhrase);
                  document.querySelector('input.search-input')?.focus();
                  setSpokenPhrase('');
                }}
              >
                Edit text
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => { clearSpoken(); speech.start(); }}
                disabled={!speech.supported}
              >
                <Icon name="mic" size={14} />
                Try again
              </button>
            </div>
          </div>
        )}

        {!touched && (
          <div>
            {/* Conversational hint — only shown on the empty initial frame
                so it doesn't compete with results. */}
            {speech.supported && (
              <div
                style={{
                  background: 'rgba(35, 224, 149,0.10)',
                  border: '1px solid rgba(35, 224, 149,0.30)',
                  borderRadius: 12, padding: '12px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(0,200,122,0.18)', color: '#00C87A',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name="mic" size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>
                    Tell FitBridge what you ate
                  </p>
                  <p style={{ fontSize: 11, color: '#C9C2E5', lineHeight: 1.4 }}>
                    Say "I had eggs and toast for breakfast" — your browser may ask for microphone permission.
                  </p>
                </div>
              </div>
            )}

            <p style={{ fontSize: 12, color: '#8F88B5', marginBottom: 10, fontWeight: 600 }}>POPULAR</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_QUERIES.map((q) => (
                <button key={q} className="chip chip-default" onClick={() => setQuery(q)}>
                  {q}
                </button>
              ))}
            </div>
            <div className="empty-state" style={{ marginTop: 24 }}>
              <div className="empty-icon">🍽️</div>
              <p className="empty-title">Search any food</p>
              <p className="empty-sub">We'll auto-fill calories, protein, carbs, fat, and more.</p>
            </div>
            {!isNutritionApiConfigured && (
              <div style={{
                background: 'rgba(252,211,77,0.08)',
                border: '1px solid rgba(252,211,77,0.32)',
                borderRadius: 12, padding: '12px 14px', marginTop: 12,
              }}>
                <p style={{ fontSize: 12, color: '#FCD34D', fontWeight: 700, marginBottom: 4 }}>
                  Nutrition API not configured
                </p>
                <p style={{ fontSize: 11, color: '#FCD34D', lineHeight: 1.5 }}>
                  Add a free <strong>USDA FoodData Central</strong> key as
                  <code> VITE_USDA_API_KEY</code> in <code>.env.local</code> (or Netlify
                  env vars) and redeploy to enable real nutrition lookup for
                  banana, egg, chicken, rice, kimchi, ramen, and more. Get a
                  key at <code>fdc.nal.usda.gov/api-key-signup.html</code>.
                  Search currently uses a small built-in food list only.
                </p>
              </div>
            )}
          </div>
        )}

        {touched && query.trim().length === 1 && (
          <div className="empty-state">
            <div className="empty-icon">⌨️</div>
            <p className="empty-title">Keep typing…</p>
            <p className="empty-sub">Enter at least 2 characters to search.</p>
          </div>
        )}

        {loading && query.trim().length >= 2 && (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-title">Looking up nutrition…</p>
          </div>
        )}

        {!loading && error && (
          <div className="empty-state" role="alert">
            <div className="empty-icon">⚠️</div>
            <p className="empty-title">Unable to fetch nutrition data</p>
            <p className="empty-sub">{error.message || 'Check your connection and try again.'}</p>
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => setQuery((q) => q + ' ')}
            >
              ↻ Retry
            </button>
          </div>
        )}

        {!loading && !error && touched && query.trim().length >= 2 && results.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p className="empty-title">No matches for "{query}"</p>
            <p className="empty-sub">Try a different name or scan a photo instead.</p>
            <button
              className="btn btn-outline btn-sm"
              style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => navigate(`/user/meal/scan?meal=${presetMeal}`)}
            >
              <Icon name="camera" size={14} />
              Scan a photo
            </button>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => (
              <button
                key={`${r.name}-${i}`}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}
                onClick={() => pick(r)}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: '#ECFDF5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0, overflow: 'hidden',
                }}>
                  {r.photo
                    ? <img src={r.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (r.source === 'korean' ? '🥢' : '🍽️')}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#F2EEFF', marginBottom: 2 }}>{r.name}</p>
                  <p style={{ fontSize: 12, color: '#8F88B5' }}>
                    {r.servingSize}{r.calories ? ` · ${Math.round(r.calories)} kcal` : ''}
                  </p>
                </div>
                <Icon name="chevronRight" size={16} color="#9CA3AF" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tiny scoped keyframe for the listening dot. Keeps animation
          local to this page so the global stylesheet stays small. */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
