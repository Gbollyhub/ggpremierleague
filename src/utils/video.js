const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// "90", "90s", "1m30s", "1h2m3s" → seconds
function parseStartTime(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return +t;
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

// Returns { id, start } for a YouTube link (watch, youtu.be, shorts, live, embed), otherwise null.
export function parseYouTubeLink(link) {
  let url;
  try {
    url = new URL(link.trim().match(/^https?:\/\//i) ? link.trim() : `https://${link.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  let id = null;
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1];
  } else if (YOUTUBE_HOSTS.includes(host)) {
    const [first, second] = url.pathname.split('/').filter(Boolean);
    id = first === 'watch' ? url.searchParams.get('v') : ['shorts', 'live', 'embed'].includes(first) ? second : null;
  }
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { id, start: parseStartTime(url.searchParams.get('t') || url.searchParams.get('start')) };
}

export function getYouTubeEmbedUrl({ id, start }) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ''}`;
}
