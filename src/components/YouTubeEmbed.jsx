import { useState } from 'react';
import { youtubeEmbedUrl, youtubeThumbnailUrl, youtubeSearchUrl, openWorkoutVideo } from '../utils/youtube';

// Click-to-play YouTube embed. Shows the thumbnail until the user presses
// play, then swaps in the <iframe>. This keeps page load lightweight and
// avoids loading YouTube cookies until a user actually opts in.
//
// Props:
//   videoId     - required. Source of truth for embed + thumbnail.
//   query       - optional. Live YouTube search used by the corner "search"
//                 link as a fallback when the specific video is unavailable.
//   title       - optional. Overlaid as a top badge.
//   duration    - optional. Shown as a bottom-right duration chip.
//   aspect      - optional. "16/9" (default) or "1/1" for square embeds.
//   autoplay    - optional. Defaults true so the iframe starts when mounted.
export default function YouTubeEmbed({
  videoId, query, title, duration, aspect = '16/9', autoplay = true, onClick,
}) {
  const [playing, setPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!videoId) {
    // Graceful fallback when no video id is supplied.
    return (
      <button
        type="button"
        onClick={() => query && openWorkoutVideo(query)}
        style={{
          width: '100%', aspectRatio: aspect,
          background: 'linear-gradient(135deg, #0B1120 0%, #1e2d45 100%)',
          border: 'none', borderRadius: 12, cursor: query ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)', fontSize: 13,
        }}
      >
        {query ? '▶ Search on YouTube' : 'No video available'}
      </button>
    );
  }

  function handlePlay() {
    if (onClick) onClick();
    setPlaying(true);
  }

  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: aspect,
      borderRadius: 12, overflow: 'hidden', background: '#0B1120',
    }}>
      {playing ? (
        <iframe
          src={youtubeEmbedUrl(videoId, { autoplay: autoplay ? 1 : 0 })}
          title={title || 'YouTube tutorial'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      ) : (
        <button
          type="button"
          onClick={handlePlay}
          aria-label={`Play ${title || 'tutorial'}`}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            padding: 0, border: 'none', cursor: 'pointer',
            background: imgError
              ? 'linear-gradient(135deg, #0B1120 0%, #1e2d45 100%)'
              : `#000 url(${youtubeThumbnailUrl(videoId)}) center/cover no-repeat`,
          }}
        >
          {!imgError && (
            <img
              src={youtubeThumbnailUrl(videoId)}
              alt=""
              onError={() => setImgError(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0 }}
            />
          )}
          {/* Dark overlay for contrast */}
          <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%)' }} />
          {/* YouTube badge */}
          <span style={{
            position: 'absolute', top: 10, left: 10, zIndex: 2,
            background: '#FF0000', color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '3px 7px',
            borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>▶ YouTube</span>
          {/* Duration */}
          {duration && (
            <span style={{
              position: 'absolute', bottom: 10, right: 10, zIndex: 2,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              fontSize: 11, fontWeight: 600, padding: '3px 7px', borderRadius: 4,
            }}>{duration}</span>
          )}
          {/* Play button */}
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 64, height: 64, borderRadius: '50%',
            background: '#FF0000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </span>
          {/* Title overlay */}
          {title && (
            <span style={{
              position: 'absolute', bottom: 10, left: 10, right: 80, zIndex: 2,
              color: '#fff', fontSize: 12, fontWeight: 700,
              textShadow: '0 1px 3px rgba(0,0,0,0.7)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{title}</span>
          )}
        </button>
      )}
      {/* Small corner affordance: if the embed is unavailable, jump to search */}
      {playing && query && (
        <a
          href={youtubeSearchUrl(query)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 3,
            background: 'rgba(0,0,0,0.65)', color: '#fff',
            fontSize: 10, fontWeight: 600, textDecoration: 'none',
            padding: '4px 7px', borderRadius: 4,
          }}
        >
          More ↗
        </a>
      )}
    </div>
  );
}
