// StateWrapper — single component that renders the right UI for the four
// states every data-driven section can be in:
//   loading | error | empty | content
//
// Usage:
//   <StateWrapper
//     loading={loading}
//     error={error}
//     empty={items.length === 0}
//     onRetry={refresh}
//     skeleton={<MealsSkeleton />}
//     emptyTitle="No meals yet"
//     emptySub="Search a food or scan a photo to get started."
//     emptyCta={{ label: '🔍 Search Food', onClick: () => navigate('/user/nutrition/search') }}
//   >
//     {items.map(...)}
//   </StateWrapper>
//
// All props are optional except children. Loading wins over error wins over
// empty wins over content — so you can pass everything and it still does the
// right thing.

export default function StateWrapper({
  loading = false,
  error = null,
  empty = false,
  onRetry,
  skeleton,
  emptyTitle = 'Nothing here yet',
  emptySub,
  emptyIcon = '✨',
  emptyCta,
  errorTitle,
  errorSub,
  children,
}) {
  if (loading) {
    return skeleton || <DefaultLoading />;
  }
  if (error) {
    return (
      <ErrorState
        title={errorTitle || titleForError(error)}
        sub={errorSub || subForError(error)}
        onRetry={onRetry}
      />
    );
  }
  if (empty) {
    return (
      <EmptyState
        title={emptyTitle}
        sub={emptySub}
        icon={emptyIcon}
        cta={emptyCta}
      />
    );
  }
  return children;
}

// --- Default loading view ---
function DefaultLoading() {
  return (
    <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="skeleton skeleton-card" />
      <span className="skeleton skeleton-card" />
      <span className="skeleton skeleton-card" />
    </div>
  );
}

// --- Error view ---
function ErrorState({ title, sub, onRetry }) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-icon">⚠️</div>
      <p className="empty-title">{title}</p>
      {sub && <p className="empty-sub">{sub}</p>}
      {onRetry && (
        <button
          className="btn btn-outline btn-sm"
          style={{ marginTop: 12 }}
          onClick={onRetry}
        >
          ↻ Try again
        </button>
      )}
    </div>
  );
}

// --- Empty view ---
function EmptyState({ title, sub, icon, cta }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p className="empty-title">{title}</p>
      {sub && <p className="empty-sub">{sub}</p>}
      {cta && (
        <button
          className="btn btn-primary btn-sm"
          style={{ marginTop: 12 }}
          onClick={cta.onClick}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

// --- Error message helpers ---
// Translate AppContext / Airtable error objects to user-facing copy. The
// heuristics here mirror the labels we surface in the dev console so the
// experience is consistent.
function titleForError(error) {
  const msg = errorString(error);
  if (msg.includes('401')) return 'Session expired';
  if (msg.includes('403')) return 'Permission issue';
  if (msg.includes('422')) return 'Couldn\'t save';
  if (msg.includes('Network') || msg.includes('Failed to fetch')) return 'You\'re offline';
  return 'Something went wrong';
}

function subForError(error) {
  const msg = errorString(error);
  if (msg.includes('401')) return 'Authentication failed. Please reconnect to keep syncing your data.';
  if (msg.includes('403')) return 'A required Airtable table may be missing or your token lacks access.';
  if (msg.includes('422')) return 'The data couldn\'t be saved in the expected format. Please check input.';
  if (msg.includes('Network') || msg.includes('Failed to fetch')) return 'Network error. Check your connection and try again.';
  if (typeof msg === 'string' && msg.length < 120) return msg;
  return 'We\'re showing local data while we try to recover.';
}

function errorString(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || error.body || String(error);
}

export { ErrorState, EmptyState, DefaultLoading };
