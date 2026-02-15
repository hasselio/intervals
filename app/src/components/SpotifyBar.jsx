import { useState, useEffect, useCallback, useRef } from 'react';
import './SpotifyBar.css';

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || (window.location.origin + BASE_PATH + '/callback');
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state user-library-read playlist-read-private';

function generateCodeVerifier() {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
);

export function SpotifyBar({ timerRunning, isRestPhase }) {
  const [token, setToken] = useState(() => localStorage.getItem('spotify_token') || '');
  const tokenRef = useRef(token);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState('');
  const [track, setTrack] = useState(null);
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [connected, setConnected] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const playerRef = useRef(null);
  const progressInterval = useRef(null);
  const hasStartedRef = useRef(false);

  useEffect(() => { tokenRef.current = token; }, [token]);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) return null;
    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('spotify_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
        setToken(data.access_token);
        console.log('[Spotify] Token refreshed');
        return data.access_token;
      }
    } catch (err) {
      console.error('[Spotify] Token refresh failed:', err);
    }
    return null;
  }, []);

  // --- Auth ---
  const handleCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    const verifier = localStorage.getItem('spotify_code_verifier');
    if (!verifier) return;
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: verifier,
        }),
      });
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('spotify_token', data.access_token);
        localStorage.setItem('spotify_refresh_token', data.refresh_token || '');
        localStorage.removeItem('spotify_code_verifier');
        setToken(data.access_token);
        window.history.replaceState({}, '', '/');
      }
    } catch (err) {
      console.error('Spotify token exchange failed:', err);
    }
  }, []);

  useEffect(() => { handleCallback(); }, [handleCallback]);

  // Auto-refresh token on mount if we have one stored (it may be expired)
  useEffect(() => {
    if (!token) return;
    fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(res => {
      if (res.status === 401) {
        console.log('[Spotify] Stored token expired, refreshing...');
        refreshAccessToken().then(newToken => {
          if (!newToken) {
            console.warn('[Spotify] Refresh failed, clearing session');
            localStorage.removeItem('spotify_token');
            localStorage.removeItem('spotify_refresh_token');
            setToken('');
          }
        });
      }
    }).catch(() => {});
  }, []); // Only on mount

  const login = useCallback(async () => {
    if (!SPOTIFY_CLIENT_ID) {
      alert('Sett VITE_SPOTIFY_CLIENT_ID i .env-filen for å koble til Spotify.');
      return;
    }
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem('spotify_code_verifier', verifier);
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  }, []);

  const disconnect = useCallback(() => {
    if (playerRef.current) playerRef.current.disconnect();
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_refresh_token');
    setToken('');
    setPlayer(null);
    setDeviceId('');
    setTrack(null);
    setConnected(false);
    setExpanded(false);
    setPlaylists([]);
  }, []);

  // --- SDK setup ---
  useEffect(() => {
    if (!token) return;
    if (document.getElementById('spotify-sdk')) return;
    const script = document.createElement('script');
    script.id = 'spotify-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const p = new window.Spotify.Player({
        name: 'Intervall',
        getOAuthToken: async cb => {
          let t = tokenRef.current;
          // Quick check if token works
          const test = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${t}` },
          }).catch(() => null);
          if (!test || test.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) t = refreshed;
          }
          cb(t);
        },
        volume: 0.5,
      });
      p.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id);
        setConnected(true);
      });
      p.addListener('not_ready', () => setConnected(false));
      p.addListener('authentication_error', async () => {
        console.warn('[Spotify] Auth error, refreshing token...');
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          console.error('[Spotify] Could not refresh, disconnecting');
          disconnect();
        }
      });
      p.addListener('player_state_changed', (state) => {
        if (!state) return;
        const current = state.track_window.current_track;
        setTrack({
          name: current.name,
          artist: current.artists.map(a => a.name).join(', '),
          albumArt: current.album.images[0]?.url || '',
        });
        setProgress(state.position);
        setDuration(state.duration);
        setSpotifyPlaying(!state.paused);
      });
      p.connect();
      playerRef.current = p;
      setPlayer(p);
    };
    return () => {
      if (playerRef.current) playerRef.current.disconnect();
    };
  }, [token]);

  // --- Transfer playback ---
  useEffect(() => {
    if (!connected || !deviceId || !token) return;
    fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    }).catch(() => {});
  }, [connected, deviceId, token]);

  // --- Start/stop playback when timer starts/stops ---
  const prevTimerRunning = useRef(false);
  useEffect(() => {
    if (!connected || !deviceId || !token) return;
    const wasRunning = prevTimerRunning.current;
    prevTimerRunning.current = timerRunning;

    if (timerRunning && !wasRunning) {
      // Timer just started
      const body = (!hasStartedRef.current && selectedPlaylist)
        ? JSON.stringify({ context_uri: selectedPlaylist.uri })
        : undefined;
      const headers = { 'Authorization': `Bearer ${token}` };
      if (body) headers['Content-Type'] = 'application/json';
      console.log('[Spotify] Play:', body ? 'starting playlist' : 'resuming');
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT', headers, body,
      }).then(res => {
        if (!res.ok) res.text().then(t => console.error('[Spotify] Play failed:', res.status, t));
        else hasStartedRef.current = true;
      }).catch(err => console.error('[Spotify] Play error:', err));
    } else if (!timerRunning && wasRunning) {
      // Timer just stopped
      console.log('[Spotify] Stop: pausing playback');
      fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [timerRunning, connected, deviceId, token, selectedPlaylist]);

  // --- Pause during rest, resume during work ---
  const prevIsRest = useRef(false);
  useEffect(() => {
    if (!connected || !deviceId || !token || !timerRunning) return;
    const wasRest = prevIsRest.current;
    prevIsRest.current = isRestPhase;

    if (isRestPhase && !wasRest) {
      console.log('[Spotify] Rest phase: pausing');
      fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    } else if (!isRestPhase && wasRest) {
      console.log('[Spotify] Work phase: resuming');
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [isRestPhase, timerRunning, connected, deviceId, token]);

  // --- Progress ticker ---
  useEffect(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    if (spotifyPlaying && duration > 0) {
      progressInterval.current = setInterval(() => {
        setProgress(prev => Math.min(prev + 1000, duration));
      }, 1000);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [spotifyPlaying, duration]);

  // --- Fetch playlists ---
  const fetchPlaylists = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setPlaylists(data.items || []);
    } catch (err) {
      console.warn('Failed to fetch playlists:', err);
    }
  }, [token]);

  // --- Select a playlist (without playing) ---
  const selectPlaylist = useCallback(async (playlist) => {
    setSelectedPlaylist(playlist);
    setTrack(null);
    setProgress(0);
    setDuration(0);
    setSpotifyPlaying(false);
    setShowPlaylists(false);
    setExpanded(false);
    hasStartedRef.current = false;
  }, []);

  // --- Playback controls ---
  const togglePlay = useCallback(() => {
    if (playerRef.current) playerRef.current.togglePlay();
  }, []);

  const nextTrack = useCallback(() => {
    if (playerRef.current) playerRef.current.nextTrack();
  }, []);

  const prevTrack = useCallback(() => {
    if (playerRef.current) playerRef.current.previousTrack();
  }, []);

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // --- Not logged in ---
  if (!token) {
    return (
      <div className="spotify-bar spotify-bar--disconnected" onClick={login}>
        <div className="spotify-bar__icon"><SpotifyIcon /></div>
        <div className="spotify-bar__info">
          <div className="spotify-bar__song">Koble til Spotify</div>
          <div className="spotify-bar__artist">Trykk for å logge inn</div>
        </div>
      </div>
    );
  }

  // --- Playlist picker ---
  if (showPlaylists) {
    return (
      <div className="spotify-panel">
        <div className="spotify-panel__header">
          <button className="spotify-panel__back" onClick={() => setShowPlaylists(false)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="spotify-panel__title">Velg spilleliste</span>
        </div>
        <div className="spotify-panel__list">
          {playlists.map(pl => (
            <button key={pl.id} className="spotify-panel__item" onClick={() => selectPlaylist(pl)}>
              {pl.images?.[0]?.url ? (
                <img className="spotify-panel__item-img" src={pl.images[0].url} alt="" />
              ) : (
                <div className="spotify-panel__item-img spotify-panel__item-img--empty"><SpotifyIcon /></div>
              )}
              <div className="spotify-panel__item-info">
                <div className="spotify-panel__item-name">{pl.name}</div>
                <div className="spotify-panel__item-count">{pl.tracks?.total || 0} sanger</div>
              </div>
            </button>
          ))}
          {playlists.length === 0 && (
            <div className="spotify-panel__empty">Ingen spillelister funnet</div>
          )}
        </div>
      </div>
    );
  }

  // --- Connected / expanded view ---
  return (
    <div className={`spotify-bar ${expanded ? 'spotify-bar--expanded' : ''}`}>
      <div className="spotify-bar__main" onClick={() => setExpanded(!expanded)}>
        {track?.albumArt ? (
          <img className="spotify-bar__art" src={track.albumArt} alt="" />
        ) : (
          <div className="spotify-bar__icon"><SpotifyIcon /></div>
        )}
        <div className="spotify-bar__info">
          <div className="spotify-bar__song">{track?.name || (selectedPlaylist ? selectedPlaylist.name : 'Ingen sang spilles')}</div>
          <div className="spotify-bar__artist">{track?.artist || (selectedPlaylist ? 'Klar – trykk Start for å spille' : 'Velg en spilleliste')}</div>
        </div>
        {track && (
          <div className="spotify-bar__mini-ctrl">
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} aria-label={spotifyPlaying ? 'Pause' : 'Spill'}>
              {spotifyPlaying ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="6,4 20,12 6,20" /></svg>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="spotify-bar__progress">
        <div className="spotify-bar__progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {expanded && track && (
        <div className="spotify-bar__controls">
          <button className="spotify-bar__ctrl-btn" onClick={prevTrack} aria-label="Forrige">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="19,20 9,12 19,4" /><rect x="5" y="4" width="2" height="16" /></svg>
          </button>
          <button className="spotify-bar__ctrl-btn spotify-bar__ctrl-btn--play" onClick={togglePlay} aria-label={spotifyPlaying ? 'Pause' : 'Spill'}>
            {spotifyPlaying ? (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><polygon points="6,4 20,12 6,20" /></svg>
            )}
          </button>
          <button className="spotify-bar__ctrl-btn" onClick={nextTrack} aria-label="Neste">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="5,4 15,12 5,20" /><rect x="17" y="4" width="2" height="16" /></svg>
          </button>
        </div>
      )}

      {expanded && (
        <div className="spotify-bar__actions">
          <button className="spotify-bar__action-btn" onClick={() => { fetchPlaylists(); setShowPlaylists(true); }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            Spillelister
          </button>
          <button className="spotify-bar__action-btn spotify-bar__action-btn--danger" onClick={disconnect}>
            Koble fra
          </button>
        </div>
      )}
    </div>
  );
}
