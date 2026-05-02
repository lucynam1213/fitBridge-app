import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBar from '../../components/StatusBar';
import FirstTimeHint from '../../components/FirstTimeHint';
import { analyzeMealPhoto } from '../../services/mockAi';
import { lookupFoodByName, isNutritionApiConfigured } from '../../services/nutritionApi';
import { todayIso } from '../../utils/date';

// Phases:
//   capture   - choose camera or gallery
//   preview   - photo selected, user can confirm or retake before analysis
//   analyzing - generating identification suggestions
//   identify  - user picks/types the food name (we don't fake it)
//   resolving - fetching real nutrition for the chosen name
//   notfound  - the chosen name returned no nutrition match
//   review    - real macros loaded, ready to save
const PHASES = {
  CAPTURE: 'capture',
  PREVIEW: 'preview',
  ANALYZING: 'analyzing',
  IDENTIFY: 'identify',
  RESOLVING: 'resolving',
  NOTFOUND: 'notfound',
  REVIEW: 'review',
};

const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function PhotoScan() {
  const navigate = useNavigate();
  const { addMeal, saveMealScan } = useApp();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const [phase, setPhase] = useState(PHASES.CAPTURE);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState([]);
  const [foodNameInput, setFoodNameInput] = useState('');
  const [analyzeMeta, setAnalyzeMeta] = useState(null);

  const [details, setDetails] = useState(null);
  const [mealType, setMealType] = useState('Lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [transFat, setTransFat] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [servingSize, setServingSize] = useState('');

  // Quantity multiplier — scales the per-serving macros from `details`.
  // Defaults to 1; user can step up/down by 0.25 (matches FoodDetail.jsx).
  // Manual edits to individual macro fields persist *until* the user
  // changes the multiplier — same pattern the FoodDetail page uses.
  const [servings, setServings] = useState(1);

  // Inline rename: tapping "Wrong food?" on the REVIEW screen reveals a
  // text input here instead of bouncing back to the IDENTIFY phase, so
  // the user can correct the food name without losing meal type / scale.
  const [showRename, setShowRename] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [relookupBusy, setRelookupBusy] = useState(false);
  const [relookupError, setRelookupError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Re-scale macro fields whenever the underlying USDA record OR the
  // servings multiplier changes. Manual user tweaks to individual fields
  // get reset on a servings change — that's intentional, matching the
  // existing FoodDetail flow so the numbers stay coherent with the chosen
  // quantity. Detail keeps the per-serving baseline; we never mutate it.
  useEffect(() => {
    if (!details) return;
    const s = Number(servings) || 1;
    setCalories(String(Math.round((details.calories || 0) * s)));
    setProtein(String(Math.round((details.protein || 0) * s)));
    setCarbs(String(Math.round((details.carbs || 0) * s)));
    setFat(String(Math.round((details.fat || 0) * s)));
    setTransFat(String(Number(((details.transFat || 0) * s).toFixed(1))));
    setSugar(String(Math.round((details.sugar || 0) * s)));
    setSodium(String(Math.round((details.sodium || 0) * s)));
  }, [details, servings]);

  // One-tap entry — when the user lands on Scan from the Dashboard / FAB,
  // skip the "tap the green button to launch the camera" intermediate step
  // and trigger the camera file input immediately on mount. If they cancel
  // the native picker they fall back to the regular CAPTURE screen with
  // Upload / Take Photo / Search options. Mobile browsers usually allow
  // the programmatic .click() because the user just performed the
  // navigating tap, but this still works on desktop.
  //
  // ARCHITECTURE NOTE (web vs native): a true native app could pre-warm
  // the camera surface here without any picker dialog. On mobile web we
  // still need the file-input click to trigger the system camera intent.
  useEffect(() => {
    // Only auto-trigger on first mount when the user hasn't already
    // captured something — re-mounts during the flow shouldn't reopen
    // the picker.
    const t = setTimeout(() => {
      if (phase === PHASES.CAPTURE && !imageFile && cameraRef.current) {
        cameraRef.current.click();
      }
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function readFileAsDataUrl(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read photo file.'));
      reader.readAsDataURL(f);
    });
  }

  async function onPickFile(e) {
    setError('');
    const f = e.target.files?.[0];
    // Reset input so picking the same file twice still fires onChange.
    e.target.value = '';
    if (!f) return;
    if (!f.type?.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(f);
      setImageUrl(dataUrl);
      setImageFile(f);
      setPhase(PHASES.PREVIEW);
    } catch (err) {
      setError(err.message || 'Could not read photo.');
    }
  }

  async function startAnalysis() {
    if (!imageFile) return;
    setError('');
    setPhase(PHASES.ANALYZING);
    try {
      const r = await analyzeMealPhoto(imageFile);
      setSuggestions(r.suggestions || []);
      setAnalyzeMeta({ fileName: r.fileName, analyzedAt: r.analyzedAt });
      setFoodNameInput(r.suggestions?.[0] || '');
      setPhase(PHASES.IDENTIFY);
    } catch (err) {
      console.error('[PhotoScan] analyzeMealPhoto failed', err);
      setError('Could not analyze photo. Please try again.');
      setPhase(PHASES.PREVIEW);
    }
  }

  async function resolveByName(name) {
    const n = (name || '').trim();
    if (!n) {
      setError('Please enter a food name.');
      return;
    }
    setError('');
    setPhase(PHASES.RESOLVING);
    try {
      const d = await lookupFoodByName(n);
      if (!d) {
        setPhase(PHASES.NOTFOUND);
        return;
      }
      // Reset the multiplier whenever a new food is loaded so the
      // initial numbers reflect "1 serving of this food". The
      // useEffect above will fill in the macro input fields.
      setServings(1);
      setDetails(d);
      setServingSize(d.servingSize || '1 serving');
      setPhase(PHASES.REVIEW);
    } catch (err) {
      console.error('[PhotoScan] lookup failed', err);
      setError(err.message || 'Could not look up nutrition. Please try again.');
      setPhase(PHASES.IDENTIFY);
    }
  }

  // Inline re-lookup from the REVIEW screen — replaces the resolved food
  // without leaving the review form (vs. the old behaviour which jumped
  // back to the IDENTIFY phase and lost the meal-type + servings choice).
  async function handleRelookup() {
    const n = renameInput.trim();
    if (!n) {
      setRelookupError('Type a food name first.');
      return;
    }
    setRelookupError('');
    setRelookupBusy(true);
    try {
      const d = await lookupFoodByName(n);
      if (!d) {
        setRelookupError(`No nutrition match for "${n}". Try a different name.`);
        return;
      }
      // Replace the food but keep the user's meal type. Reset servings
      // to 1 so the macros reflect a single portion of the new food.
      setServings(1);
      setDetails(d);
      setServingSize(d.servingSize || '1 serving');
      setShowRename(false);
      setRenameInput('');
    } catch (err) {
      console.error('[PhotoScan] relookup failed', err);
      setRelookupError(err.message || 'Lookup failed. Try again.');
    } finally {
      setRelookupBusy(false);
    }
  }

  function retake() {
    setImageUrl(null);
    setImageFile(null);
    setSuggestions([]);
    setFoodNameInput('');
    setDetails(null);
    setServings(1);
    setShowRename(false);
    setRenameInput('');
    setRelookupError('');
    setError('');
    setSaveError('');
    setPhase(PHASES.CAPTURE);
  }

  async function handleSave() {
    if (!details || saving) return;
    setSaving(true);
    setSaveError('');
    const cal = Number(calories) || 0;
    const p = Number(protein) || 0;
    const c = Number(carbs) || 0;
    const f = Number(fat) || 0;
    const tf = Number(transFat) || 0;
    const sg = Number(sugar) || 0;
    const sd = Number(sodium) || 0;

    // Tag the persisted serving size with the multiplier when it isn't
    // exactly 1× so the trainer + meal log are unambiguous about how
    // much was eaten. Schema is unchanged — same `servingSize` text column.
    const persistedServing = servings === 1 ? servingSize : `${servings}× ${servingSize}`;

    try {
      // Persist scan-side history (image-side review).
      saveMealScan({
        label: details.name,
        items: [`${details.name} (${persistedServing})`],
        calories: cal,
        protein: p,
        carbs: c,
        fat: f,
        transFat: tf,
        // confidence is 1.0 — user confirmed, not a model guess.
        confidence: 1,
        mealType,
        fileName: analyzeMeta?.fileName,
        analyzedAt: analyzeMeta?.analyzedAt,
        visibleToTrainer: true,
      }).catch((err) => console.error('[PhotoScan] saveMealScan failed', err));

      // Persist meal log entry (the source of truth for nutrition totals).
      await addMeal({
        date: todayIso(),
        type: mealType,
        foodName: details.name,
        items: [`${details.name} (${persistedServing})`],
        calories: cal,
        protein: p,
        carbs: c,
        fat: f,
        transFat: tf,
        sugar: sg,
        sodium: sd,
        servingSize: persistedServing,
        source: 'photo_scan',
        visibleToTrainer: true,
      });
      navigate('/user/nutrition');
    } catch (err) {
      console.error('[PhotoScan] save failed', err);
      setSaveError("Couldn't save to meal log. Tap Save to retry.");
      setSaving(false);
    }
  }

  // --- UI ---
  // PhotoScan has no bottom NavBar of its own, so we override the global
  // --nav-h to 0px on this page. That keeps phone-content from reserving
  // 80px+safe-area at the bottom for a nav that doesn't exist.
  return (
    <div
      style={{
        width: '100%', height: '100%',
        background: '#0B1120',
        display: 'flex', flexDirection: 'column',
        minHeight: 0,
        '--nav-h': '0px',
      }}
    >
      <StatusBar theme="dark" />

      {/* Header — phase-aware subtitle so the user always knows what to do
          on this screen. Helps especially in IDENTIFY/REVIEW where the
          form looks similar to a regular nutrition entry. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 12px' }}>
        <button
          className="back-btn"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          onClick={() => navigate('/user/nutrition')}
          aria-label="Back to nutrition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>Scan Meal</h2>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
            {phase === PHASES.CAPTURE && 'Step 1 — Take or upload a photo of your meal.'}
            {phase === PHASES.PREVIEW && 'Step 2 — Confirm the photo or retake.'}
            {phase === PHASES.ANALYZING && 'Analyzing your photo…'}
            {phase === PHASES.IDENTIFY && 'Step 3 — Tell us what\'s in the photo.'}
            {phase === PHASES.RESOLVING && 'Looking up nutrition from USDA…'}
            {phase === PHASES.NOTFOUND && 'No nutrition match — try a different name.'}
            {phase === PHASES.REVIEW && 'Step 4 — Review, adjust quantity, then save.'}
          </p>
        </div>
      </div>

      {/* Hidden inputs — split so "Take Photo" forces the camera and
          "Upload from gallery" lets the user pick an existing photo. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={onPickFile}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onPickFile}
      />

      {/* Scan stage (CAPTURE / PREVIEW / ANALYZING) — full-bleed image area */}
      {(phase === PHASES.CAPTURE || phase === PHASES.PREVIEW || phase === PHASES.ANALYZING) && (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: imageUrl
              ? `url(${imageUrl}) center/cover no-repeat`
              : 'radial-gradient(circle at 50% 30%, #1e2d45 0%, #0B1120 70%)',
          }} />

          {/* Scan reticle (only when no image yet) */}
          {phase === PHASES.CAPTURE && !imageUrl && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 240, height: 240,
              border: '2px solid rgba(0,200,122,0.7)',
              borderRadius: 24,
              boxShadow: '0 0 0 9999px rgba(11,17,32,0.55)',
            }}>
              {[
                { top: -2, left: -2, br: '12px 0 0 0' },
                { top: -2, right: -2, br: '0 12px 0 0' },
                { bottom: -2, left: -2, br: '0 0 0 12px' },
                { bottom: -2, right: -2, br: '0 0 12px 0' },
              ].map((p, i) => (
                <div key={i} style={{
                  position: 'absolute', ...p,
                  width: 28, height: 28,
                  border: '4px solid #00C87A',
                  borderTop: p.bottom !== undefined ? 'none' : undefined,
                  borderBottom: p.top !== undefined ? 'none' : undefined,
                  borderLeft: p.right !== undefined ? 'none' : undefined,
                  borderRight: p.left !== undefined ? 'none' : undefined,
                  borderRadius: p.br,
                }} />
              ))}
            </div>
          )}

          {phase === PHASES.ANALYZING && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12,
              background: 'rgba(11,17,32,0.55)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '4px solid rgba(0,200,122,0.2)',
                borderTopColor: '#00C87A',
                animation: 'spin 0.9s linear infinite',
              }} />
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Analyzing photo…</p>
            </div>
          )}

          {phase === PHASES.CAPTURE && (
            <>
              {/* First-time hint floats over the dark viewport on CAPTURE
                  only, so users opening Scan for the first time see how
                  the flow handles their photo + privacy. */}
              <div style={{
                position: 'absolute', top: 16, left: 16, right: 16,
                pointerEvents: 'auto',
              }}>
                <FirstTimeHint id="scan-intro" icon="📷" title="How scanning works">
                  Snap or upload your meal — we'll help identify it and pull
                  real nutrition data from USDA. Your trainer only sees what
                  you confirm.
                </FirstTimeHint>
              </div>

              <div style={{
                position: 'absolute', bottom: 24, left: 0, right: 0,
                textAlign: 'center', padding: '0 24px',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 14 }}>
                  Center your meal in the frame
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{
          margin: '0 16px 8px',
          background: 'rgba(239,68,68,0.95)', color: '#fff',
          padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      {/* Bottom controls — CAPTURE: take vs upload */}
      {phase === PHASES.CAPTURE && (
        <div style={{
          padding: '20px 24px max(28px, env(safe-area-inset-bottom))',
          background: 'rgba(11,17,32,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          gap: 16,
          flexShrink: 0,
        }}>
          <button
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              padding: '10px 14px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            onClick={() => galleryRef.current?.click()}
          >
            🖼 Upload
          </button>

          <button
            onClick={() => cameraRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: '#11151D', border: '4px solid rgba(0,200,122,0.5)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Take photo"
            title="Take photo"
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#00C87A' }} />
          </button>

          <button
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              padding: '10px 14px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
            }}
            onClick={() => navigate('/user/nutrition/search')}
          >
            🔍 Search
          </button>
        </div>
      )}

      {/* Bottom controls — PREVIEW: confirm or retake before analyzing */}
      {phase === PHASES.PREVIEW && (
        <div style={{
          padding: '20px 24px max(28px, env(safe-area-inset-bottom))',
          background: 'rgba(11,17,32,0.92)',
          display: 'flex', flexDirection: 'column', gap: 10,
          flexShrink: 0,
        }}>
          <button className="btn btn-primary btn-full" onClick={startAnalysis}>
            Looks good — Analyze
          </button>
          <button className="btn btn-outline btn-full" onClick={retake} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
            Retake
          </button>
        </div>
      )}

      {/* IDENTIFY sheet — user confirms / types food name */}
      {phase === PHASES.IDENTIFY && (
        <div style={{
          background: '#11151D',
          borderRadius: '20px 20px 0 0',
          padding: '18px 20px max(24px, env(safe-area-inset-bottom))',
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2, background: '#E5E7EB',
            margin: '0 auto 14px',
          }} />

          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F2EEFF', marginBottom: 4 }}>
            What food is this?
          </h3>
          <p style={{ fontSize: 12, color: '#8F88B5', marginBottom: 14 }}>
            Tap a suggestion or type a name — we'll fetch real nutrition facts.
          </p>

          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  className={`chip${foodNameInput === s ? ' chip-active' : ' chip-default'}`}
                  onClick={() => setFoodNameInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="input-group" style={{ marginBottom: 14 }}>
            <input
              className="input"
              placeholder="e.g. Bibimbap"
              value={foodNameInput}
              onChange={(e) => setFoodNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && resolveByName(foodNameInput)}
            />
          </div>

          <button className="btn btn-primary btn-full" style={{ marginBottom: 8 }} onClick={() => resolveByName(foodNameInput)}>
            Look up nutrition
          </button>
          <button className="btn btn-ghost btn-full" onClick={retake} style={{ color: '#C9C2E5' }}>
            ↻ Retake photo
          </button>
        </div>
      )}

      {/* RESOLVING — calling nutrition API */}
      {phase === PHASES.RESOLVING && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '4px solid rgba(0,200,122,0.2)',
            borderTopColor: '#00C87A',
            animation: 'spin 0.9s linear infinite',
          }} />
          <p style={{ color: '#F2EEFF', fontSize: 14, fontWeight: 600 }}>Looking up nutrition…</p>
        </div>
      )}

      {/* NOTFOUND — couldn't identify confidently */}
      {phase === PHASES.NOTFOUND && (
        <div style={{
          background: '#11151D',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px max(28px, env(safe-area-inset-bottom))',
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
        }}>
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p className="empty-title" style={{ color: '#F2EEFF' }}>We could not identify this food clearly.</p>
            <p className="empty-sub" style={{ color: '#8F88B5' }}>Please search or enter the food name.</p>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 14, marginBottom: 8 }} onClick={() => setPhase(PHASES.IDENTIFY)}>
            Try a different name
          </button>
          <button className="btn btn-outline btn-full" style={{ marginBottom: 8, color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => navigate('/user/nutrition/search')}>
            Search food database
          </button>
          <button className="btn btn-ghost btn-full" style={{ color: '#C9C2E5' }} onClick={retake}>
            ↻ Retake photo
          </button>
          {!isNutritionApiConfigured && (
            <p style={{ fontSize: 11, color: '#FCD34D', marginTop: 12, textAlign: 'center' }}>
              Note: nutrition API key not configured — only the built-in food list
              is being searched. See AIRTABLE_SETUP.md.
            </p>
          )}
        </div>
      )}

      {/* REVIEW sheet — real macros, editable, save.
          flex: 1 + minHeight: 0 lets the sheet take the remaining column
          height with internal scroll, so the "Confirm & Save" button at the
          bottom is always reachable regardless of how tall the viewport is. */}
      {phase === PHASES.REVIEW && details && (
        <div style={{
          background: '#11151D',
          borderRadius: '20px 20px 0 0',
          padding: '18px 20px max(24px, env(safe-area-inset-bottom))',
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.25)',
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2, background: '#E5E7EB',
            margin: '0 auto 14px',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#F2EEFF' }}>{details.name}</h3>
            <span className="chip chip-green" style={{ fontSize: 11 }}>
              {details.source === 'nutritionix' ? 'Nutritionix' : details.source === 'usda' ? 'USDA' : 'Local data'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#8F88B5', marginBottom: 14 }}>{servingSize}</p>

          {/* Inline rename panel — shown when the user taps "Wrong food?".
              Lets them re-resolve a different food without jumping back to
              the IDENTIFY phase, so meal type + the rest of the form stays. */}
          {showRename && (
            <div style={{
              background: '#0E0B1F',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#F2EEFF' }}>Type the actual food name</p>
                <button
                  type="button"
                  onClick={() => { setShowRename(false); setRenameInput(''); setRelookupError(''); }}
                  aria-label="Close rename panel"
                  style={{ background: 'none', border: 'none', color: '#8F88B5', fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
              <input
                className="input"
                placeholder="e.g. grilled chicken breast, kimchi, banana"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !relookupBusy) { e.preventDefault(); handleRelookup(); } }}
                disabled={relookupBusy}
                autoFocus
                style={{ marginBottom: 8 }}
              />
              {relookupError && (
                <p style={{ fontSize: 12, color: '#FF4D6D', marginBottom: 8 }}>{relookupError}</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, fontSize: 13 }}
                  onClick={handleRelookup}
                  disabled={relookupBusy || !renameInput.trim()}
                >
                  {relookupBusy ? 'Looking up…' : '🔍 Re-lookup nutrition'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 'none', color: '#8F88B5', fontSize: 13 }}
                  onClick={() => { setShowRename(false); setRenameInput(''); setRelookupError(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Meal type */}
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label className="input-label" style={{ color: '#C9C2E5' }}>Meal Type</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {mealTypes.map((t) => (
                <button
                  key={t}
                  className={`chip${mealType === t ? ' chip-active' : ' chip-default'}`}
                  onClick={() => setMealType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity / servings stepper. The label shows the per-serving
              size pulled from USDA so it's clear what one unit represents
              (e.g. "1 medium banana (118g)" or "100g per serving"). */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#0E0B1F',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '10px 14px',
            marginBottom: 14,
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#F2EEFF' }}>Servings</p>
              <p style={{ fontSize: 11, color: '#8F88B5' }}>{servingSize}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-icon"
                style={{ width: 32, height: 32, padding: 0, fontSize: 18 }}
                onClick={() => setServings((s) => Math.max(0.25, +(s - 0.25).toFixed(2)))}
                aria-label="Decrease servings"
              >−</button>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#F2EEFF', minWidth: 32, textAlign: 'center' }}>
                {servings}
              </span>
              <button
                type="button"
                className="btn btn-icon"
                style={{ width: 32, height: 32, padding: 0, fontSize: 18 }}
                onClick={() => setServings((s) => +(s + 0.25).toFixed(2))}
                aria-label="Increase servings"
              >+</button>
            </div>
          </div>

          {/* Numeric inputMode hints — calories + sodium are integers
              (numpad), macros may have decimals (numpad with `.`). */}
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label className="input-label" style={{ color: '#C9C2E5' }}>Calories (kcal)</label>
            <input className="input" type="number" inputMode="numeric" pattern="[0-9]*" min="0" value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>

          <div className="grid-3" style={{ marginBottom: 12 }}>
            <div className="input-group">
              <label style={{ fontSize: 11, color: '#3B82F6', fontWeight: 600 }}>Protein</label>
              <input className="input" type="number" inputMode="decimal" step="0.1" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>Carbs</label>
              <input className="input" type="number" inputMode="decimal" step="0.1" min="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>Fat</label>
              <input className="input" type="number" inputMode="decimal" step="0.1" min="0" value={fat} onChange={(e) => setFat(e.target.value)} />
            </div>
          </div>

          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="input-group">
              <label style={{ fontSize: 11, color: '#8F88B5', fontWeight: 600 }}>Trans fat (g)</label>
              <input className="input" type="number" inputMode="decimal" step="0.1" min="0" value={transFat} onChange={(e) => setTransFat(e.target.value)} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: 11, color: '#8F88B5', fontWeight: 600 }}>Sugar (g)</label>
              <input className="input" type="number" inputMode="decimal" step="0.1" min="0" value={sugar} onChange={(e) => setSugar(e.target.value)} />
            </div>
            <div className="input-group">
              <label style={{ fontSize: 11, color: '#8F88B5', fontWeight: 600 }}>Sodium (mg)</label>
              <input className="input" type="number" inputMode="numeric" pattern="[0-9]*" min="0" value={sodium} onChange={(e) => setSodium(e.target.value)} />
            </div>
          </div>

          {saveError && (
            <div role="alert" style={{ background: 'rgba(255,77,109,0.14)', border: '1px solid rgba(255,77,109,0.28)', borderRadius: 12, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: '#FF4D6D' }}>
              {saveError}
            </div>
          )}

          <button className="btn btn-primary btn-full" disabled={saving} onClick={handleSave} style={{ marginBottom: 8 }}>
            {saving ? 'Saving…' : '✓ Confirm & Save'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1, color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
              onClick={() => {
                // Open the inline rename panel above instead of bouncing
                // back to the IDENTIFY phase. Pre-fill with the current
                // food name so users can edit-in-place.
                setShowRename(true);
                setRenameInput(details.name);
                setRelookupError('');
              }}
            >
              Wrong food?
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, color: '#C9C2E5' }} onClick={retake}>
              ↻ Retake
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
