// YouTube helpers. Workouts carry both a `videoId` (stable well-known video
// for inline embed) and a `videoQuery` (live search URL used if the embed
// fails or the user wants more options). The embed uses youtube-nocookie.com
// for privacy-enhanced playback.

export function youtubeSearchUrl(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

// Opens the YouTube search in a new tab, safely.
export function openWorkoutVideo(query) {
  const url = youtubeSearchUrl(query);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Privacy-enhanced embed URL. `autoplay=1` makes the player start immediately
// once the iframe mounts (paired with click-to-play in the UI).
export function youtubeEmbedUrl(videoId, { autoplay = 1 } = {}) {
  const params = new URLSearchParams({
    autoplay: String(autoplay ? 1 : 0),
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

// Thumbnail hosted by YouTube — `hqdefault.jpg` is available for every video
// and loads fast without needing the iframe.
export function youtubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Watch URL — opens the standard YouTube page in a new tab. Used for the
// "Watch on YouTube ↗" affordance below embedded videos so users get the
// full native player + immersive fullscreen on phones where the embed's
// own fullscreen button is small.
export function youtubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

// A styled inline "tutorial card" (title, duration, watch button) for any
// workout. Keep the visual styling close to the existing .video-placeholder
// so it feels like the same app.
export function videoMetaFor(workout) {
  const query = workout.videoQuery || `${workout.title} workout tutorial`;
  const title = workout.videoTitle || `${workout.title} — guided tutorial`;
  const duration = workout.videoDuration || `${workout.duration || 20} min`;
  return {
    videoId: workout.videoId || null,
    query,
    title,
    duration,
    url: youtubeSearchUrl(query),
    embedUrl: workout.videoId ? youtubeEmbedUrl(workout.videoId) : null,
    thumbnailUrl: workout.videoId ? youtubeThumbnailUrl(workout.videoId) : null,
  };
}
