// Small navigation helper used by every page-level back button.
//
// `navigate(-1)` is the natural choice for a back button — it pops the
// React Router history stack. But if the user opened a deep link directly
// (shared URL, push notification, browser bookmark) the entry might be
// the FIRST in their session history. In that case `navigate(-1)` either
// does nothing (when we're at index 0) or escapes the SPA entirely back
// to the previous origin. Both are dead-ends.
//
// safeBack() detects that case using react-router's `key` field on the
// initial location: when the page mounts as the first navigation in the
// session, location.key === 'default'. We fall back to a per-page
// `fallback` route (typically the parent screen) so the user always has
// somewhere to go.

import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export function useSafeBack(fallback = '/') {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    // 'default' is react-router's marker for the very first entry in the
    // history stack — meaning there's nothing in-app to go "back" to.
    if (location.key === 'default') {
      navigate(fallback, { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, location.key, fallback]);
}

export default useSafeBack;
