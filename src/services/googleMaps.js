// =============================================================================
// Google Maps + Places API loader
// =============================================================================
//
// Single-source-of-truth for loading the Google Maps JS SDK in this app.
// Other components import { loadGoogleMaps, GOOGLE_MAPS_API_KEY,
// isGoogleMapsConfigured } and never touch the script tag themselves.
//
// SETUP
// -----
// 1. Create a Google Cloud project at https://console.cloud.google.com.
// 2. Enable BOTH of these APIs (left nav → APIs & Services → Library):
//      - Maps JavaScript API
//      - Places API   (the legacy one is fine for nearbySearch; "Places
//                      API (New)" exists but uses a different SDK call —
//                      see PLACES NEW NOTE below).
// 3. Enable billing on the project (Google requires a billing account
//    even for the free tier; the free monthly quota is generous —
//    $200/mo of credit at the time of writing). Without billing the
//    map renders as a "for development purposes only" gray tile.
// 4. Credentials → Create credentials → API key. Restrict it:
//      - Application restrictions: HTTP referrers
//      - Allowed referrers: http://localhost:*/*  AND
//                           https://fitbridge.netlify.app/*
//      - API restrictions: Maps JavaScript API + Places API
// 5. Local dev: create `.env.local` (gitignored) with:
//      VITE_GOOGLE_MAPS_API_KEY=AIzaSy…your key…
//    Restart `npm run dev` so Vite picks up the new env var.
// 6. Netlify: Site settings → Environment variables → add
//      VITE_GOOGLE_MAPS_API_KEY=AIzaSy…
//    Trigger a redeploy.
//
// FALLBACK
// --------
// If VITE_GOOGLE_MAPS_API_KEY is missing OR the script fails to load OR
// Places returns no results, callers fall back to the static placeholder
// map + the seed gym list. The connection flow stays usable — see the
// brief: "If real API data is not available, show a clear fallback list
// of gyms".
//
// PLACES NEW NOTE
// ---------------
// Google has a "Places API (New)" with a different SDK shape:
//   google.maps.places.Place.searchNearby({...})  ← New
// vs the legacy:
//   new google.maps.places.PlacesService(map).nearbySearch({...}, cb)
// We use the legacy call — it's stable, well-documented, and the
// migration is mechanical when the team is ready.
//
// SECURITY
// --------
// The key IS exposed in the bundled JS — that's unavoidable for a
// browser-side Maps SDK. The mitigation is the HTTP-referrer restriction
// in step 4. Never use a key WITHOUT referrer restrictions in production.

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export const isGoogleMapsConfigured = Boolean(GOOGLE_MAPS_API_KEY);

// Module-level promise so concurrent loadGoogleMaps() calls share one
// script tag. Resolves with the global `google` object once the SDK
// finishes loading; rejects if the key is missing or the script errors.
let _loaderPromise = null;

export function loadGoogleMaps() {
  if (_loaderPromise) return _loaderPromise;

  if (!GOOGLE_MAPS_API_KEY) {
    _loaderPromise = Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
    return _loaderPromise;
  }

  _loaderPromise = new Promise((resolve, reject) => {
    // If something else already loaded it, reuse.
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      resolve(window.google);
      return;
    }

    if (typeof document === 'undefined') {
      reject(new Error('Document not available (SSR?)'));
      return;
    }

    // Globally-named callback so the SDK can ping us when it's ready.
    // The 'callback=' query arg in the script src tells Google to invoke
    // this once the libraries finish loading.
    const cbName = '__fb_gmaps_ready__';
    window[cbName] = () => {
      if (window.google?.maps?.places) resolve(window.google);
      else reject(new Error('google.maps.places did not load'));
    };

    const script = document.createElement('script');
    // libraries=places loads the Places service alongside core maps.
    // loading=async + defer follow Google's recommended pattern.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places&loading=async&callback=${cbName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.appendChild(script);
  });

  // Don't cache rejection — let the caller retry on re-mount if the
  // first load failed (rare; usually this is a network blip).
  _loaderPromise.catch(() => { _loaderPromise = null; });

  return _loaderPromise;
}

// Wrap PlacesService.nearbySearch in a Promise so callers can await it.
// `map` is a google.maps.Map instance — Places needs a Map (or HTMLDiv)
// reference for attribution surfaces. Pass `radius` in metres.
export function nearbyGyms(google, map, { lat, lng, radius = 3000 }) {
  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch(
      {
        location: { lat, lng },
        radius,
        type: 'gym',
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && Array.isArray(results)) {
          resolve(results);
        } else {
          // ZERO_RESULTS / OVER_QUERY_LIMIT / REQUEST_DENIED / etc.
          // Always resolve [] so callers can show the fallback without
          // having to handle exceptions inline.
          console.warn('[google-maps] nearbySearch status:', status);
          resolve([]);
        }
      },
    );
  });
}
