import { useState, useEffect, useRef } from "react";

const C = {
  bg:     '#0F1319',
  card:   '#161D27',
  border: '#1E2A3A',
  text:   '#FFFFFF',
  sub:    '#6B7A90',
  muted:  '#2A3545',
  accent: '#2EC4B6',
};

const F = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const WEATHER_KEY = 'REMOVED';

const fetchWeather = async (lat, lon) => {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=imperial`
  );
  return res.json();
};

const getWeatherIcon = (code) => {
  if (code >= 200 && code < 300) return '⛈';
  if (code >= 300 && code < 400) return '🌦';
  if (code >= 500 && code < 600) return '🌧';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫';
  if (code === 800) return '☀️';
  if (code > 800) return '⛅';
  return '🌡';
};

const SYS = `You are a personal AI assistant for Nate. Sharp, direct, and casual — like a smart friend who remembers things.
About Nate: Creative director in LA, building a startup (Mirage), always busy, iPhone user.
Nudge about: car wash (sunny LA), groceries (weekly), hydration, 5-min heads-up before calls, gas, dry cleaning.
Keep responses SHORT. Think texts not emails.`;

const askClaude = async (messages, extra) => {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: SYS + (extra ? "\n\n" + extra : ""),
      messages,
    }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || d.error || "Request failed");
  return d.content[0].text;
};

const fmtClock = (d) => {
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return { time: h + ":" + m, ampm: d.getHours() >= 12 ? "PM" : "AM" };
};

const fmtDate = (d) =>
  d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const greet = (d) => {
  const h = d.getHours();
  return h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,";
};

const toMins = (t) => {
  if (!t) return 9999;
  const parts = t.split(" ");
  const tp = parts[0].split(":");
  let h = parseInt(tp[0]);
  const mp = parseInt(tp[1]) || 0;
  if (parts[1] === "PM" && h !== 12) h += 12;
  if (parts[1] === "AM" && h === 12) h = 0;
  return h * 60 + mp;
};

const quickActions = [
  { label: 'Play music',         special: 'spotify' },
  { label: 'Car wash',           msg: 'Remind me to get a car wash' },
  { label: 'Groceries',          msg: 'Help me with my grocery list' },
  { label: 'Fill up gas',        msg: 'Remind me to fill up gas' },
  { label: 'Dry cleaning',       msg: 'Remind me about dry cleaning' },
  { label: 'Book a tee time',    msg: 'Help me book a golf tee time' },
  { label: 'Make a reservation', msg: 'Help me make a dinner reservation' },
];

const LABEL = { fontSize: 9, color: C.sub, letterSpacing: 3, textTransform: "uppercase", fontWeight: 400 };

const ctrlBtn = (color, size = 44) => ({
  width: size,
  height: size,
  background: "none",
  border: "none",
  cursor: "pointer",
  color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  fontFamily: F,
  flexShrink: 0,
});

const SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
const speechSupported = !!SpeechRec;

const MicIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v4" />
  </svg>
);

const PlayIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" /></svg>
);
const PauseIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
);
const PrevIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="2" height="14" /><path d="M19 5.5v13a.5.5 0 0 1-.78.42L9 12.5a.5.5 0 0 1 0-.84l9.22-6.5A.5.5 0 0 1 19 5.5z" /></svg>
);
const NextIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="17" y="5" width="2" height="14" /><path d="M5 5.5v13a.5.5 0 0 0 .78.42L15 12.5a.5.5 0 0 0 0-.84L5.78 5.08A.5.5 0 0 0 5 5.5z" /></svg>
);
const Back10Icon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
    <polyline points="3 3 3 7.5 7.5 7.5" />
    <text x="12" y="16" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Helvetica, sans-serif" fontWeight="600">10</text>
  </svg>
);
const Fwd10Icon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" />
    <polyline points="21 3 21 7.5 16.5 7.5" />
    <text x="12" y="16" fontSize="7" fill="currentColor" stroke="none" textAnchor="middle" fontFamily="Helvetica, sans-serif" fontWeight="600">10</text>
  </svg>
);
const VolDownIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10v4h4l5 4V6l-5 4H3z" fill="currentColor" stroke="none" />
    <line x1="16" y1="12" x2="21" y2="12" />
  </svg>
);
const VolUpIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10v4h4l5 4V6l-5 4H3z" fill="currentColor" stroke="none" />
    <line x1="16" y1="12" x2="21" y2="12" />
    <line x1="18.5" y1="9.5" x2="18.5" y2="14.5" />
  </svg>
);

const GearIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const pickDefaultVoice = (english) =>
  english.find(v => v.lang === "en-US" && /Samantha|Ava|Serena/i.test(v.name)) ||
  english.find(v => v.lang === "en-US" && /Allison|Aria|Natasha/i.test(v.name)) ||
  english.find(v => v.lang === "en-US" && /Neural|Natural|Google/i.test(v.name)) ||
  english.find(v => v.lang === "en-US" && v.default) ||
  english.find(v => v.default) ||
  english[0] ||
  null;

export default function App() {
  const [tab, setTab]             = useState("today");
  const [now, setNow]             = useState(new Date());
  const [nudge, setNudge]         = useState("");
  const [nudgeLoading, setNudgeL] = useState(false);
  const [weather, setWeather]     = useState(null);
  const [events, setEvents]       = useState([]);
  const [msgs, setMsgs]           = useState([{ role: "assistant", content: "Hey — what's on your mind?" }]);
  const [input, setInput]         = useState("");
  const [chatLoading, setChatL]   = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [draft, setDraft]         = useState({ title: "", time: "", type: "reminder" });
  const [banner, setBanner]       = useState("");
  const [voiceState, setVoiceState] = useState("idle"); // "idle" | "listening" | "thinking" | "speaking"
  const [voices, setVoices]       = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => {
    if (typeof window === "undefined") return null;
    try { return window.localStorage.getItem("voiceName") || null; } catch (_) { return null; }
  });
  const [currentVoiceName, setCurrentVoiceName] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [spotify, setSpotify] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("spotify");
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  });
  const [nowPlaying, setNowPlaying] = useState(null);
  const [showController, setShowController] = useState(false);
  const [controllerQuery, setControllerQuery] = useState("");
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifPerm, setNotifPerm] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";
    return Notification.permission;
  });
  const [coords, setCoords] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [listItems, setListItems] = useState([]);
  const [showListModal, setShowListModal] = useState(null);
  const [listInput, setListInput] = useState("");
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [gmail, setGmail] = useState(() => {
    if (typeof window === "undefined") return null;
    try { const raw = window.localStorage.getItem("gmail"); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  });
  const chatRef = useRef(null);
  const notifTimers = useRef(new Map());
  const recRef = useRef(null);
  const utterRef = useRef(null);
  const transcriptRef = useRef("");
  const loopActiveRef = useRef(false);
  const warmedUpRef = useRef(false);
  const voiceRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msgs, chatLoading]);

  useEffect(() => { getNudge(); }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [tRes, eRes, lRes] = await Promise.all([
          fetch("/api/db?resource=tasks"),
          fetch("/api/db?resource=events"),
          fetch("/api/db?resource=lists"),
        ]);
        if (!alive) return;
        if (tRes.ok) {
          const t = await tRes.json();
          if (Array.isArray(t)) {
            setTasks(t);
            t.forEach(task => scheduleTaskNotification(task));
          }
        }
        if (eRes.ok) {
          const e = await eRes.json();
          if (Array.isArray(e)) {
            setEvents(e.slice().sort((a, b) => toMins(a.time) - toMins(b.time)));
            e.forEach(ev => scheduleEventNotification(ev));
          }
        }
        if (lRes.ok) {
          const l = await lRes.json();
          if (Array.isArray(l)) setListItems(l);
        }
        try {
          const bRes = await fetch("/api/db?resource=briefings&q=" + encodeURIComponent("order=created_at.desc&limit=1"));
          if (bRes.ok) {
            const b = await bRes.json();
            if (Array.isArray(b) && b[0]) {
              const createdToday = new Date(b[0].created_at).toDateString() === new Date().toDateString();
              if (createdToday) setBriefing(b[0]);
            }
          }
        } catch (_) {}
      } catch (err) {
        console.error("[db] load failed", err);
      }
    };
    load();
    return () => {
      alive = false;
      notifTimers.current.forEach(id => clearTimeout(id));
      notifTimers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const search = window.location.search || "";

    if (hash.startsWith("#spotify=")) {
      const frag = hash.slice("#spotify=".length);
      const ampIdx = frag.indexOf("&");
      const tokenPart = ampIdx === -1 ? frag : frag.slice(0, ampIdx);
      try {
        const payload = JSON.parse(decodeURIComponent(tokenPart));
        if (payload?.access_token) {
          window.localStorage.setItem("spotify", JSON.stringify(payload));
          setSpotify(payload);
          setBanner("Connected Spotify");
          setTimeout(() => setBanner(""), 2500);
          console.log("[spotify] tokens picked up from url fragment, stored to localStorage");
        }
      } catch (e) {
        console.error("[spotify] failed to parse fragment", e);
      }
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    if (hash.startsWith("#gmail=")) {
      const frag = hash.slice("#gmail=".length);
      const ampIdx = frag.indexOf("&");
      const tokenPart = ampIdx === -1 ? frag : frag.slice(0, ampIdx);
      try {
        const payload = JSON.parse(decodeURIComponent(tokenPart));
        if (payload?.access_token) {
          window.localStorage.setItem("gmail", JSON.stringify(payload));
          setGmail(payload);
          setBanner("Connected Gmail");
          setTimeout(() => setBanner(""), 2500);
        }
      } catch (e) {
        console.error("[gmail] failed to parse fragment", e);
      }
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    if (search.includes("gmail_error=")) {
      const err = new URLSearchParams(search).get("gmail_error");
      if (err) { setBanner("Gmail: " + err); setTimeout(() => setBanner(""), 4000); }
      window.history.replaceState(null, "", window.location.pathname);
    }

    if (search.includes("spotify_error=")) {
      const params = new URLSearchParams(search);
      const err = params.get("spotify_error");
      if (err) {
        setBanner("Spotify: " + err);
        setTimeout(() => setBanner(""), 4000);
      }
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!spotify || tab !== "today") return;
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      await refreshNowPlaying();
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [spotify, tab]);

  useEffect(() => {
    if (!nowPlaying?.is_playing || !nowPlaying?.item) return;
    const id = setInterval(() => {
      setNowPlaying(curr => {
        if (!curr?.is_playing || !curr.item) return curr;
        const dur = curr.item.duration_ms || 0;
        const next = Math.min(dur, (curr.progress_ms || 0) + 1000);
        if (next === curr.progress_ms) return curr;
        return { ...curr, progress_ms: next };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [nowPlaying?.is_playing, nowPlaying?.item?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      const all = synth.getVoices();
      if (!all.length) return;
      const english = all
        .filter(v => v.lang && v.lang.toLowerCase().startsWith("en"))
        .sort((a, b) => {
          const aUS = a.lang === "en-US" ? 0 : 1;
          const bUS = b.lang === "en-US" ? 0 : 1;
          if (aUS !== bUS) return aUS - bUS;
          return a.name.localeCompare(b.name);
        });
      setVoices(english);
      const chosen =
        (selectedVoiceName && english.find(v => v.name === selectedVoiceName)) ||
        pickDefaultVoice(english);
      voiceRef.current = chosen;
      setCurrentVoiceName(chosen?.name || null);
    };
    pick();
    synth.onvoiceschanged = pick;
    return () => {
      synth.onvoiceschanged = null;
      try { synth.cancel(); } catch (_) {}
    };
  }, [selectedVoiceName]);

  const selectVoice = (voice) => {
    setSelectedVoiceName(voice.name);
    try { window.localStorage.setItem("voiceName", voice.name); } catch (_) {}
    voiceRef.current = voice;
    setCurrentVoiceName(voice.name);
    const synth = window.speechSynthesis;
    if (!synth) return;
    try { synth.cancel(); } catch (_) {}
    const u = new SpeechSynthesisUtterance("Hey Nate. How does this sound?");
    u.rate = 0.95;
    u.pitch = 1.0;
    u.voice = voice;
    try { synth.speak(u); } catch (_) {}
  };

  // ── Spotify ────────────────────────────────────────
  const saveSpotify = (next) => {
    try { window.localStorage.setItem("spotify", JSON.stringify(next)); } catch (_) {}
    setSpotify(next);
  };

  const disconnectSpotify = () => {
    try { window.localStorage.removeItem("spotify"); } catch (_) {}
    setSpotify(null);
    setNowPlaying(null);
  };

  const connectGmail = async () => {
    try {
      const r = await fetch("/api/gmail");
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error || "Couldn't start Gmail auth");
      if (data.state) sessionStorage.setItem("gmailOAuthState", data.state);
      window.location.href = data.url;
    } catch (e) {
      setBanner("Gmail: " + (e.message || "couldn't connect"));
      setTimeout(() => setBanner(""), 3500);
    }
  };

  const disconnectGmail = () => {
    try { window.localStorage.removeItem("gmail"); } catch (_) {}
    setGmail(null);
  };

  const connectSpotify = async () => {
    try {
      const r = await fetch("/api/spotify");
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error || "Couldn't start Spotify auth");
      if (data.state) sessionStorage.setItem("spotifyOAuthState", data.state);
      window.location.href = data.url;
    } catch (e) {
      setBanner("Spotify: " + (e.message || "couldn't connect"));
      setTimeout(() => setBanner(""), 3500);
    }
  };

  const ensureSpotifyToken = async () => {
    const s = spotify;
    if (!s) return null;
    if (s.expires_at && Date.now() < s.expires_at - 60000) return s.access_token;
    if (!s.refresh_token) return null;
    try {
      const r = await fetch("/api/spotify-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
      if (!r.ok) {
        if (r.status === 400 || r.status === 401) disconnectSpotify();
        return null;
      }
      const d = await r.json();
      const next = {
        ...s,
        access_token: d.access_token,
        expires_at: Date.now() + (d.expires_in || 3600) * 1000,
        ...(d.refresh_token ? { refresh_token: d.refresh_token } : {}),
      };
      saveSpotify(next);
      return next.access_token;
    } catch (_) { return null; }
  };

  const spotifyFetch = async (path, init = {}) => {
    const token = await ensureSpotifyToken();
    if (!token) throw new Error("Not authenticated");
    const method = init.method || "GET";
    let bodyObj = null;
    if (init.body != null) {
      if (typeof init.body === "string") {
        try { bodyObj = JSON.parse(init.body); } catch (_) { bodyObj = null; }
      } else {
        bodyObj = init.body;
      }
    }
    return fetch("/api/spotify-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token, path, method, body: bodyObj }),
    });
  };

  const spotifySetVolume = async (percent) => {
    const v = Math.max(0, Math.min(100, Math.round(percent)));
    try { await spotifyFetch(`/me/player/volume?volume_percent=${v}`, { method: "PUT" }); } catch (_) {}
    setTimeout(refreshNowPlaying, 300);
    return v;
  };

  const spotifyVolumeDelta = async (delta) => {
    const current = typeof nowPlaying?.device?.volume_percent === "number"
      ? nowPlaying.device.volume_percent
      : 50;
    return spotifySetVolume(current + delta);
  };

  const refreshNowPlaying = async () => {
    try {
      const r = await spotifyFetch("/me/player/currently-playing");
      if (r.status === 204) { setNowPlaying(null); return; }
      if (!r.ok) return;
      const d = await r.json();
      setNowPlaying(d);
    } catch (_) {}
  };

  const spotifyPlay = async () => {
    setNowPlaying(curr => curr ? { ...curr, is_playing: true } : curr);
    try { await spotifyFetch("/me/player/play", { method: "PUT" }); } catch (_) {}
    setTimeout(refreshNowPlaying, 400);
  };
  const spotifyPause = async () => {
    setNowPlaying(curr => curr ? { ...curr, is_playing: false } : curr);
    try { await spotifyFetch("/me/player/pause", { method: "PUT" }); } catch (_) {}
    setTimeout(refreshNowPlaying, 400);
  };
  const spotifyNext = async () => { try { await spotifyFetch("/me/player/next", { method: "POST" }); } catch (_) {} setTimeout(refreshNowPlaying, 600); };
  const spotifyPrev = async () => { try { await spotifyFetch("/me/player/previous", { method: "POST" }); } catch (_) {} setTimeout(refreshNowPlaying, 600); };

  const togglePlayPause = async () => {
    if (!nowPlaying) return spotifyPlay();
    if (nowPlaying.is_playing) await spotifyPause();
    else await spotifyPlay();
  };

  const spotifySeek = async (deltaMs) => {
    if (!nowPlaying?.item) return;
    const duration = nowPlaying.item.duration_ms || 0;
    const current = nowPlaying.progress_ms || 0;
    const next = Math.max(0, Math.min(duration > 1000 ? duration - 500 : duration, current + deltaMs));
    setNowPlaying(curr => curr ? { ...curr, progress_ms: next } : curr);
    try { await spotifyFetch(`/me/player/seek?position_ms=${next}`, { method: "PUT" }); } catch (_) {}
    setTimeout(refreshNowPlaying, 300);
  };

  const spotifyPlayQuery = async (q) => {
    try {
      const r = await spotifyFetch(`/search?type=track&limit=1&q=${encodeURIComponent(q)}`);
      if (!r.ok) return null;
      const d = await r.json();
      const track = d.tracks?.items?.[0];
      if (!track) return null;
      await spotifyFetch("/me/player/play", { method: "PUT", body: JSON.stringify({ uris: [track.uri] }) });
      setTimeout(refreshNowPlaying, 600);
      return track;
    } catch (_) { return null; }
  };

  const spotifyPlayPlaylist = async (name) => {
    try {
      const r = await spotifyFetch("/me/playlists?limit=50");
      if (!r.ok) return null;
      const d = await r.json();
      const n = name.toLowerCase();
      const match = d.items?.find(p => p.name.toLowerCase() === n)
        || d.items?.find(p => p.name.toLowerCase().includes(n));
      if (!match) return null;
      await spotifyFetch("/me/player/play", { method: "PUT", body: JSON.stringify({ context_uri: match.uri }) });
      setTimeout(refreshNowPlaying, 600);
      return match;
    } catch (_) { return null; }
  };

  const loadUserPlaylists = async () => {
    try {
      const r = await spotifyFetch("/me/playlists?limit=20");
      if (!r.ok) return;
      const d = await r.json();
      setUserPlaylists(d.items || []);
    } catch (_) {}
  };

  const playPlaylistByUri = async (uri) => {
    try {
      await spotifyFetch("/me/player/play", { method: "PUT", body: JSON.stringify({ context_uri: uri }) });
      setTimeout(refreshNowPlaying, 600);
    } catch (_) {}
  };

  const controllerSubmit = async () => {
    const q = controllerQuery.trim();
    if (!q) return;
    const t = await spotifyPlayQuery(q);
    if (t) setControllerQuery("");
  };

  const handleSpotifyIntent = async (text) => {
    if (!spotify) return null;
    const t = text.toLowerCase().trim().replace(/[.!?]+$/, "");
    if (/^(pause|stop)( the (music|song))?$/.test(t)) {
      await spotifyPause(); return "Paused.";
    }
    if (/^(resume|unpause|keep playing|play again|hit play)$/.test(t)) {
      await spotifyPlay(); return "Playing.";
    }
    if (/^(skip|next|next (song|track)|skip (this|it))$/.test(t)) {
      await spotifyNext(); return "Skipped.";
    }
    if (/^(previous|go back|last (song|track)|back one|back a song)$/.test(t)) {
      await spotifyPrev(); return "Going back.";
    }
    if (/^(volume up|turn (it|the volume) up|louder|crank it)$/.test(t)) {
      const v = await spotifyVolumeDelta(10); return `Volume at ${v}.`;
    }
    if (/^(volume down|turn (it|the volume) down|quieter|softer)$/.test(t)) {
      const v = await spotifyVolumeDelta(-10); return `Volume at ${v}.`;
    }
    if (/^(mute|silence)$/.test(t)) {
      await spotifySetVolume(0); return "Muted.";
    }
    const vSet = t.match(/^(?:set )?volume (?:to )?(\d{1,3})(?:\s*percent)?$/);
    if (vSet) {
      const n = Math.min(100, Math.max(0, parseInt(vSet[1], 10)));
      await spotifySetVolume(n); return `Volume at ${n}.`;
    }
    const pl = t.match(/^play (?:my )?(.+?)\s+playlist$/);
    if (pl) {
      const match = await spotifyPlayPlaylist(pl[1]);
      return match ? `Playing ${match.name}.` : `Couldn't find a playlist matching ${pl[1]}.`;
    }
    const play = t.match(/^play (?:some ?|something )?(.+?)(?:\s+on spotify)?$/);
    if (play) {
      const q = play[1];
      const track = await spotifyPlayQuery(q);
      return track ? `Playing ${track.name} by ${track.artists?.map(a => a.name).join(", ") || "unknown"}.` : `Couldn't find anything for ${q}.`;
    }
    return null;
  };

  const SPOTIFY_MARKER_RE = /\{\{\s*spotify:\s*([a-z_]+)(?:\s*:\s*([^}]+?))?\s*\}\}/gi;

  const parseSpotifyMarkers = (text) => {
    if (!text) return { markers: [], clean: text };
    const markers = [];
    for (const m of text.matchAll(SPOTIFY_MARKER_RE)) {
      markers.push({ action: m[1].toLowerCase(), args: m[2]?.trim() || null });
    }
    const clean = text.replace(SPOTIFY_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
    return { markers, clean };
  };

  // ── Tasks + Notifications ──────────────────────────
  const scheduleReminder = (id, title, time) => {
    if (!time) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const tMins = toMins(time);
    if (tMins >= 9999) return;
    const alarmMins = tMins - 5;
    const now = new Date();
    const alarm = new Date(now);
    alarm.setHours(Math.floor(alarmMins / 60), alarmMins % 60, 0, 0);
    const delay = alarm.getTime() - now.getTime();
    if (delay <= 0) return;
    const existing = notifTimers.current.get(id);
    if (existing != null) clearTimeout(existing);
    const timerId = setTimeout(() => {
      try {
        new Notification(`Don't forget: ${title}`, {
          body: `In 5 minutes · ${time}`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "alarm-" + id,
        });
      } catch (_) {}
      notifTimers.current.delete(id);
    }, delay);
    notifTimers.current.set(id, timerId);
  };

  const scheduleTaskNotification = (task) => {
    if (task.done) return;
    scheduleReminder(task.id, task.title, task.time);
  };

  const scheduleEventNotification = (event) => {
    scheduleReminder(event.id, event.title, event.time);
  };

  const cancelTaskNotification = (id) => {
    const t = notifTimers.current.get(id);
    if (t != null) { clearTimeout(t); notifTimers.current.delete(id); }
  };

  const addTask = async (title, time) => {
    const clean = String(title || "").trim();
    if (!clean) return;
    const task = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2),
      title: clean,
      time: time ? String(time).trim() : null,
      done: false,
    };
    setTasks(prev => [...prev, task]);
    scheduleTaskNotification(task);
    try {
      await fetch("/api/db?resource=tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
    } catch (err) { console.error("[db] task create failed", err); }
    return task;
  };

  const toggleTask = async (id) => {
    let nextDone = null;
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = { ...t, done: !t.done };
      nextDone = next.done;
      if (next.done) cancelTaskNotification(id);
      else scheduleTaskNotification(next);
      return next;
    }));
    if (nextDone === null) return;
    try {
      await fetch(`/api/db?resource=tasks&id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });
    } catch (err) { console.error("[db] task toggle failed", err); }
  };

  const removeTask = async (id) => {
    cancelTaskNotification(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/db?resource=tasks&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) { console.error("[db] task delete failed", err); }
  };

  const requestNotifPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
      if (p === "granted") {
        tasks.forEach(t => scheduleTaskNotification(t));
      }
    } catch (_) {}
  };

  const TASK_MARKER_RE = /\{\{\s*task\s*:\s*([^:}]+?)\s*(?::\s*([^}]+?)\s*)?\}\}/gi;
  const EVENT_MARKER_RE = /\{\{\s*event\s*:\s*([^:}]+?)\s*:\s*([^}]+?)\s*(?::\s*([^\s:}]+?)\s*)?\}\}/gi;

  const parseTaskMarkers = (text) => {
    if (!text) return { markers: [], clean: text };
    const markers = [];
    for (const m of text.matchAll(TASK_MARKER_RE)) {
      markers.push({ title: m[1].trim(), time: m[2]?.trim() || null });
    }
    const clean = text.replace(TASK_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
    return { markers, clean };
  };

  const parseEventMarkers = (text) => {
    if (!text) return { markers: [], clean: text };
    const markers = [];
    for (const m of text.matchAll(EVENT_MARKER_RE)) {
      markers.push({ title: m[1].trim(), time: m[2].trim(), type: m[3]?.trim() || "reminder" });
    }
    const clean = text.replace(EVENT_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
    return { markers, clean };
  };

  const executeTaskMarkers = (markers) => {
    if (!markers?.length) return;
    markers.forEach(m => {
      if (m.time) {
        createEvent({ title: m.title, time: m.time, type: "reminder" });
      } else {
        addTask(m.title);
      }
    });
  };

  const executeEventMarkers = (markers) => {
    if (!markers?.length) return;
    markers.forEach(m => createEvent({ title: m.title, time: m.time, type: m.type || "reminder" }));
  };

  // ── Lists ─────────────────────────────────────────
  const LIST_MARKER_RE = /\{\{\s*list\s*:\s*([^:}]+?)\s*:\s*([^}]+?)\s*\}\}/gi;

  const parseListMarkers = (text) => {
    if (!text) return { markers: [], clean: text };
    const markers = [];
    for (const m of text.matchAll(LIST_MARKER_RE)) {
      markers.push({ listName: m[1].trim().toLowerCase(), item: m[2].trim() });
    }
    const clean = text.replace(LIST_MARKER_RE, "").replace(/\n{3,}/g, "\n\n").trim();
    return { markers, clean };
  };

  const executeListMarkers = (markers) => {
    if (!markers?.length) return;
    markers.forEach(m => addListItem(m.listName, m.item));
  };

  const addListItem = async (listName, item) => {
    const name = String(listName || "").trim().toLowerCase();
    const cleanItem = String(item || "").trim();
    if (!name || !cleanItem) return;
    const row = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2),
      list_name: name,
      item: cleanItem,
      done: false,
    };
    setListItems(prev => [...prev, row]);
    try {
      await fetch("/api/db?resource=lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
    } catch (err) { console.error("[db] list item create failed", err); }
    return row;
  };

  const toggleListItem = async (id) => {
    let nextDone = null;
    setListItems(prev => prev.map(l => {
      if (l.id !== id) return l;
      const next = { ...l, done: !l.done };
      nextDone = next.done;
      return next;
    }));
    if (nextDone === null) return;
    try {
      await fetch(`/api/db?resource=lists&id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });
    } catch (err) { console.error("[db] list toggle failed", err); }
  };

  const removeListItem = async (id) => {
    setListItems(prev => prev.filter(l => l.id !== id));
    try {
      await fetch(`/api/db?resource=lists&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) { console.error("[db] list delete failed", err); }
  };

  const handleListIntent = (text) => {
    const t = text.toLowerCase().trim().replace(/[.!?]+$/, "");
    const m = t.match(/^(?:show|pull up|open|bring up)\s+(?:me\s+)?(?:my\s+|the\s+)?(\w+)\s+list$/);
    if (!m) return null;
    const name = m[1].toLowerCase();
    setTab("features");
    setShowListModal(name);
    setListInput("");
    const count = listItems.filter(x => x.list_name === name && !x.done).length;
    return count
      ? `Here's your ${name} list. ${count} ${count === 1 ? "item" : "items"}.`
      : `Your ${name} list is empty.`;
  };

  const executeSpotifyMarkers = async (markers) => {
    if (!spotify || !markers.length) return;
    for (const m of markers) {
      try {
        if (m.action === "play" || m.action === "resume") await spotifyPlay();
        else if (m.action === "pause" || m.action === "stop") await spotifyPause();
        else if (m.action === "next" || m.action === "skip") await spotifyNext();
        else if (m.action === "previous" || m.action === "back") await spotifyPrev();
        else if (m.action === "search" && m.args) await spotifyPlayQuery(m.args);
        else if (m.action === "playlist" && m.args) await spotifyPlayPlaylist(m.args);
        else if (m.action === "volume" && m.args) {
          const v = m.args.toLowerCase();
          if (v === "up") await spotifyVolumeDelta(10);
          else if (v === "down") await spotifyVolumeDelta(-10);
          else if (v === "mute") await spotifySetVolume(0);
          else { const n = parseInt(v, 10); if (!isNaN(n)) await spotifySetVolume(n); }
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    const load = async (lat, lon) => {
      setCoords({ lat, lon });
      try {
        const data = await fetchWeather(lat, lon);
        setWeather(data);
      } catch(e) {}
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => load(34.0522, -118.2437)
      );
    } else {
      load(34.0522, -118.2437);
    }
  }, []);

  const loadForecast = async () => {
    if (!coords) return;
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${WEATHER_KEY}&units=imperial`);
      if (!res.ok) return;
      const data = await res.json();
      setForecast(data);
    } catch (_) {}
  };

  const openUber = () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isMobile = /iP(hone|ad|od)|Android/.test(ua);
    if (!isMobile) { window.open("https://uber.com", "_blank"); return; }
    const fallback = setTimeout(() => { window.location.href = "https://m.uber.com"; }, 1500);
    const onHide = () => { if (document.hidden) { clearTimeout(fallback); document.removeEventListener("visibilitychange", onHide); } };
    document.addEventListener("visibilitychange", onHide);
    window.location.href = "uber://";
  };

  const getNudge = async () => {
    setNudgeL(true);
    const n = new Date();
    const c = fmtClock(n);
    const evList = events.map(e => e.title + " at " + e.time).join(", ") || "nothing yet";
    const wx = weather
      ? `${Math.round(weather.main.temp)}°F, ${weather.weather[0].description}`
      : "sunny LA";
    const ctx = "Time: " + c.time + " " + c.ampm + ", " + fmtDate(n) + ". Weather: " + wx + ". Schedule: " + evList + ".";
    try {
      const text = await askClaude([{ role: "user", content: ctx + " Give ONE smart nudge. 1-2 sentences, no intro." }]);
      setNudge(text);
    } catch(e) {
      setNudge("Good day to get ahead of things.");
    }
    setNudgeL(false);
  };

  const playBriefing = () => {
    const text = briefing?.content || nudge;
    if (!text) return;
    if (typeof window !== "undefined" && window.speechSynthesis && !warmedUpRef.current) {
      const warm = new SpeechSynthesisUtterance("");
      warm.volume = 0;
      try { window.speechSynthesis.speak(warm); } catch (_) {}
      warmedUpRef.current = true;
    }
    speak(text);
  };

  const send = async (override) => {
    const text = (typeof override === "string" ? override : input).trim();
    if (!text || chatLoading) return;
    const userMsg = { role: "user", content: text };
    const updated = [...msgs, userMsg];
    setMsgs(updated);
    setInput("");

    const listReply = handleListIntent(text);
    if (listReply) {
      setMsgs([...updated, { role: "assistant", content: listReply }]);
      return;
    }

    setChatL(true);
    const c = fmtClock(now);
    const evList = events.map(e => e.title + " at " + e.time).join(", ") || "none";
    const nowTrack = nowPlaying?.item ? `${nowPlaying.item.name} by ${nowPlaying.item.artists?.map(a => a.name).join(", ")}` : "nothing";
    const spotifyCmdHint = spotify
      ? " You can control music playback. Append ONE command on its own line at the end if the user wants playback controlled: {{spotify:play}}, {{spotify:pause}}, {{spotify:next}}, {{spotify:previous}}, {{spotify:search:<query>}}, {{spotify:playlist:<name>}}, {{spotify:volume:up|down|mute|0-100}}. Never explain the command in the reply."
      : "";
    const taskCmdHint = " Commands for tracking the user's day, appended at the end of your reply, one per line, never mentioned in the spoken reply. (A) TIMED event or reminder — user stated a specific clock time: {{event:<title>:<time>:<type>}}. Time MUST be 12-hour format like 5:00 PM or 9:30 AM. Type is one of call, dinner, meeting, reminder, errand, other. Examples: 'Remind me to call dad at 5' → {{event:Call dad:5:00 PM:call}}; 'Take Porsche to service tomorrow at 10' → {{event:Porsche service:10:00 AM:errand}}. These show in UP NEXT and fire a notification 5 minutes before. (B) UNTIMED to-do — no clock time mentioned: {{task:<title>}}. Example: 'Don't forget dry cleaning' → {{task:Pick up dry cleaning}}. These show in YOUR DAY with no alert. (C) LIST item — user wants to add to a named list: {{list:<listname>:<item>}}. Common list names are grocery, packing, shopping, errands. One marker per item — for multiple items in one request, emit separate markers. Examples: 'Add apples to my grocery list' → {{list:grocery:apples}}; 'Add milk, eggs, and bread' → {{list:grocery:milk}} {{list:grocery:eggs}} {{list:grocery:bread}}.";
    const ctx = "Time: " + c.time + " " + c.ampm + ", " + fmtDate(now) + ". Schedule: " + evList + ". Spotify playing: " + nowTrack + "." + spotifyCmdHint + taskCmdHint;
    try {
      const reply = await askClaude(updated.map(m => ({ role: m.role, content: m.content })), ctx);
      const sp = parseSpotifyMarkers(reply);
      const ev = parseEventMarkers(sp.clean);
      const tk = parseTaskMarkers(ev.clean);
      const ls = parseListMarkers(tk.clean);
      setMsgs([...updated, { role: "assistant", content: ls.clean || tk.clean || ev.clean || sp.clean || reply }]);
      if (sp.markers.length) executeSpotifyMarkers(sp.markers);
      if (ev.markers.length) executeEventMarkers(ev.markers);
      if (tk.markers.length) executeTaskMarkers(tk.markers);
      if (ls.markers.length) executeListMarkers(ls.markers);
    } catch(e) {
      setMsgs([...updated, { role: "assistant", content: "Couldn't connect. Try again." }]);
    }
    setChatL(false);
  };

  const speak = (text) => new Promise((resolve) => {
    const synth = typeof window !== "undefined" && window.speechSynthesis;
    if (!synth || !text) return resolve();
    setVoiceState("speaking");
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    if (voiceRef.current) u.voice = voiceRef.current;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    utterRef.current = u;
    try { synth.speak(u); } catch (_) { resolve(); }
  });

  const beginListening = () => {
    if (!speechSupported) return;
    transcriptRef.current = "";
    setInput("");
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript;
      }
      transcriptRef.current = full;
      setInput(full);
    };
    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        loopActiveRef.current = false;
        setVoiceState("idle");
      }
    };
    rec.onend = async () => {
      if (!loopActiveRef.current) { setVoiceState("idle"); return; }
      const txt = transcriptRef.current.trim();
      if (!txt) { loopActiveRef.current = false; setVoiceState("idle"); return; }

      setInput("");
      const userMsg = { role: "user", content: txt };
      const updated = [...msgs, userMsg];
      setMsgs(updated);

      const spotifyReply = await handleSpotifyIntent(txt);
      if (spotifyReply) {
        setMsgs((curr) => [...curr, { role: "assistant", content: spotifyReply }]);
        if (!loopActiveRef.current) { setVoiceState("idle"); return; }
        await speak(spotifyReply);
        if (!loopActiveRef.current) { setVoiceState("idle"); return; }
        beginListening();
        return;
      }

      const listReply = handleListIntent(txt);
      if (listReply) {
        setMsgs((curr) => [...curr, { role: "assistant", content: listReply }]);
        if (!loopActiveRef.current) { setVoiceState("idle"); return; }
        await speak(listReply);
        if (!loopActiveRef.current) { setVoiceState("idle"); return; }
        beginListening();
        return;
      }

      setVoiceState("thinking");
      setChatL(true);
      const c = fmtClock(new Date());
      const evList = events.map(e => e.title + " at " + e.time).join(", ") || "none";
      const nowTrack = nowPlaying?.item ? `${nowPlaying.item.name} by ${nowPlaying.item.artists?.map(a => a.name).join(", ")}` : "nothing";
      const spotifyCmdHint = spotify
        ? " You can control music playback. To execute one, append ONE command on its own line at the end of your reply — the user never sees or hears it. Commands: {{spotify:play}}, {{spotify:pause}}, {{spotify:next}}, {{spotify:previous}}, {{spotify:search:<query>}}, {{spotify:playlist:<name>}}, {{spotify:volume:up|down|mute|0-100}}. Only include a command when the user actually wants playback controlled."
        : "";
      const taskCmdHint = " Commands for tracking the user's day, appended at the end of your reply, one per line, never mentioned in the spoken reply. (A) TIMED event or reminder — user stated a specific clock time: {{event:<title>:<time>:<type>}}. Time MUST be 12-hour format like 5:00 PM or 9:30 AM. Type is one of call, dinner, meeting, reminder, errand, other. Examples: 'Remind me to call dad at 5' → {{event:Call dad:5:00 PM:call}}; 'Take Porsche to service tomorrow at 10' → {{event:Porsche service:10:00 AM:errand}}. These show in UP NEXT and fire a notification 5 minutes before. (B) UNTIMED to-do — no clock time mentioned: {{task:<title>}}. Example: 'Don't forget dry cleaning' → {{task:Pick up dry cleaning}}. These show in YOUR DAY with no alert. (C) LIST item — user wants to add to a named list: {{list:<listname>:<item>}}. Common list names are grocery, packing, shopping, errands. One marker per item — for multiple items in one request, emit separate markers. Examples: 'Add apples to my grocery list' → {{list:grocery:apples}}; 'Add milk, eggs, and bread' → {{list:grocery:milk}} {{list:grocery:eggs}} {{list:grocery:bread}}.";
      const ctx = "Time: " + c.time + " " + c.ampm + ", " + fmtDate(new Date()) + ". Schedule: " + evList + ". Spotify playing: " + nowTrack + "." + spotifyCmdHint + taskCmdHint + " Reply will be spoken aloud — keep it short and conversational.";
      let reply;
      try {
        reply = await askClaude(updated.map(m => ({ role: m.role, content: m.content })), ctx);
      } catch (err) {
        reply = "Couldn't connect. Try again.";
      }
      const sp = parseSpotifyMarkers(reply);
      const ev = parseEventMarkers(sp.clean);
      const tk = parseTaskMarkers(ev.clean);
      const ls = parseListMarkers(tk.clean);
      const spoken = ls.clean || tk.clean || ev.clean || sp.clean || reply;
      setMsgs((curr) => [...curr, { role: "assistant", content: spoken }]);
      setChatL(false);
      if (sp.markers.length) executeSpotifyMarkers(sp.markers);
      if (ev.markers.length) executeEventMarkers(ev.markers);
      if (tk.markers.length) executeTaskMarkers(tk.markers);
      if (ls.markers.length) executeListMarkers(ls.markers);
      if (!loopActiveRef.current) { setVoiceState("idle"); return; }
      await speak(spoken);
      if (!loopActiveRef.current) { setVoiceState("idle"); return; }
      beginListening();
    };
    recRef.current = rec;
    setVoiceState("listening");
    try { rec.start(); } catch (_) { setVoiceState("idle"); }
  };

  const toggleVoice = (mode) => {
    if (voiceState !== "idle") {
      loopActiveRef.current = false;
      const rec = recRef.current;
      if (rec) { try { rec.stop(); } catch (_) {} try { rec.abort?.(); } catch (_) {} }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      setVoiceState("idle");
      return;
    }
    if (typeof window !== "undefined" && window.speechSynthesis && !warmedUpRef.current) {
      const warm = new SpeechSynthesisUtterance("");
      warm.volume = 0;
      try { window.speechSynthesis.speak(warm); } catch (_) {}
      warmedUpRef.current = true;
    }
    if (mode === "today") setTab("chat");
    loopActiveRef.current = true;
    beginListening();
  };

  const createEvent = async ({ title, time, type }) => {
    const clean = String(title || "").trim();
    if (!clean) return null;
    const e = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2),
      title: clean,
      time: time ? String(time).trim() : null,
      type: (type && String(type).trim()) || "reminder",
    };
    setEvents(prev => [...prev, e].sort((a, b) => toMins(a.time) - toMins(b.time)));
    scheduleEventNotification(e);
    try {
      await fetch("/api/db?resource=events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
      });
    } catch (err) { console.error("[db] event create failed", err); }
    return e;
  };

  const addEvent = async () => {
    if (!draft.title) return;
    await createEvent({ title: draft.title, time: draft.time, type: draft.type });
    setShowAdd(false);
    setDraft({ title: "", time: "", type: "reminder" });
    setBanner("Added to your day");
    setTimeout(() => setBanner(""), 2500);
  };

  const removeEvent = async (id) => {
    cancelTaskNotification(id);
    setEvents(prev => prev.filter(e => e.id !== id));
    try {
      await fetch(`/api/db?resource=events&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) { console.error("[db] event delete failed", err); }
  };

  const navItems = [
    { id: "today",    label: "Today",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> },
    { id: "chat",     label: "Chat",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id: "features", label: "Features",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { id: "schedule", label: "Schedule",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
  ];

  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh", color: C.text, fontFamily: F, fontStyle: "normal", maxWidth: 430, margin: "0 auto", position: "relative", overflowX: "hidden" }}>

      <style>{`
        @keyframes blink { 0%,100%{opacity:.2} 50%{opacity:1} }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.75; } }
        body { margin: 0; background: ${C.bg}; }
        #root { text-align: left; }
        input::placeholder { color: ${C.muted}; }
        ::-webkit-scrollbar { display: none; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; font-style: normal; }
        button { user-select: none; -webkit-user-select: none; touch-action: manipulation; }
      `}</style>

      {banner && (
        <div style={{ position: "fixed", top: 24, left: 32, right: 32, maxWidth: 366, margin: "0 auto", backgroundColor: C.card, borderLeft: "2px solid " + C.accent, padding: "14px 18px", fontSize: 13, fontWeight: 300, color: C.text, zIndex: 300 }}>
          {banner}
        </div>
      )}

      {/* ── TODAY ───────────────────────────────── */}
      {tab === "today" && (() => {
        const clock = fmtClock(now);
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const upcoming = events.filter(e => toMins(e.time) >= nowMins);
        const nextEvent = upcoming[0] || events[0] || null;
        const hasTrack = spotify && nowPlaying?.item;
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isIOS = /iP(hone|ad|od)/.test(ua);
        const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
        const isStandalone = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
        const showPwaHint = isIOS && isSafari && !isStandalone && tasks.some(t => t.time && !t.done);
        return (
          <div style={{ padding: "64px 32px 140px" }}>

            {/* Header: date + time */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={LABEL}>{fmtDate(now)}</div>
              <div style={LABEL}>{clock.time} {clock.ampm}</div>
            </div>

            {/* Greeting */}
            <div style={{ marginBottom: 56 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "block", width: "100%", fontSize: 48, fontWeight: 800, lineHeight: 1.05, color: C.text, letterSpacing: -1.5, whiteSpace: "nowrap", overflow: "hidden" }}>
                  {greet(now)}
                </div>
                <div style={{ display: "block", width: "100%", fontSize: 48, fontWeight: 800, lineHeight: 1.05, color: C.text, letterSpacing: -1.5, whiteSpace: "nowrap", overflow: "hidden" }}>
                  Nate.
                </div>
              </div>

              {weather && (
                <div style={{ fontSize: 11, color: C.sub, fontWeight: 300, marginTop: 24, letterSpacing: 0.2 }}>
                  <span style={{ marginRight: 8 }}>{getWeatherIcon(weather.weather[0].id)}</span>
                  {Math.round(weather.main.temp)}°F · {weather.weather[0].description} · H {Math.round(weather.main.temp_max)}° L {Math.round(weather.main.temp_min)}°
                </div>
              )}
            </div>

            {/* Morning Briefing */}
            {(briefing || nudge || nudgeLoading) && (
              <div style={{ backgroundColor: C.card, borderLeft: "2px solid " + C.accent, padding: "20px 22px", marginBottom: 48, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, textTransform: "uppercase", fontWeight: 400 }}>{briefing ? "Briefing" : "Assistant"}</div>
                  {(briefing?.content || nudge) && !nudgeLoading && (
                    <button onClick={playBriefing} aria-label="Play briefing" style={{ background: "none", border: "none", color: C.accent, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: F, fontWeight: 400, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5z" /></svg>
                      Play
                    </button>
                  )}
                </div>
                {(nudgeLoading && !briefing && !nudge) ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, backgroundColor: C.accent, animation: "blink 1.2s ease infinite", animationDelay: (i * 0.3) + "s" }} />)}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, lineHeight: 1.65, color: C.text, fontWeight: 300, whiteSpace: "pre-wrap" }}>
                    {briefing?.content || nudge}
                  </div>
                )}
              </div>
            )}

            {/* Up Next */}
            {nextEvent && (
              <div style={{ marginBottom: 56 }}>
                <div style={{ ...LABEL, marginBottom: 20 }}>Up Next</div>
                <div style={{ fontSize: 11, color: C.sub, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 400, marginBottom: 14 }}>
                  {nextEvent.time}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, color: C.text }}>
                  {nextEvent.title}
                </div>
              </div>
            )}

            {/* Your Day */}
            <div style={{ marginBottom: 56 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={LABEL}>Your Day</span>
                {notifPerm === "default" && tasks.some(t => t.time && !t.done) && (
                  <button onClick={requestNotifPermission} style={{ background: "none", border: "none", color: C.accent, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer", fontFamily: F, fontWeight: 400, padding: 0 }}>
                    Enable alerts
                  </button>
                )}
              </div>
              {tasks.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, fontWeight: 300, lineHeight: 1.5 }}>
                  Ask the assistant to remind you of anything.
                </div>
              ) : (
                tasks.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid " + C.border, gap: 14 }}>
                    <button
                      onClick={() => toggleTask(t.id)}
                      aria-label={t.done ? "Mark not done" : "Mark done"}
                      style={{ width: 22, height: 22, border: "1px solid " + (t.done ? C.accent : C.sub), backgroundColor: t.done ? C.accent : "transparent", flexShrink: 0, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
                      {t.done && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                          <polyline points="5 13 10 18 19 7" />
                        </svg>
                      )}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 400, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.title}
                      </div>
                      {t.time && (
                        <div style={{ fontSize: 10, color: C.sub, marginTop: 6, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 400 }}>
                          {t.time}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeTask(t.id)} aria-label="Remove" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 8, lineHeight: 1, fontFamily: F }}>×</button>
                  </div>
                ))
              )}
              {showPwaHint && (
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 300, lineHeight: 1.5, marginTop: 16 }}>
                  Tap Share → Add to Home Screen to enable alerts.
                </div>
              )}
            </div>

            {/* Now Playing — only when something is playing or paused with a track */}
            {hasTrack && (
              <div style={{ marginBottom: 56 }}>
                <div style={{ ...LABEL, marginBottom: 20 }}>Now Playing</div>
                <div style={{ backgroundColor: C.card, borderLeft: "2px solid " + C.accent, padding: "20px 20px 16px" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
                    {nowPlaying.item.album?.images?.[0]?.url && (
                      <img src={nowPlaying.item.album.images[0].url} alt="" style={{ width: 56, height: 56, flexShrink: 0, display: "block" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {nowPlaying.item.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.sub, marginTop: 6, fontWeight: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {nowPlaying.item.artists?.map(a => a.name).join(", ")}
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 2, backgroundColor: C.border, marginBottom: 16, position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, ((nowPlaying.progress_ms || 0) / (nowPlaying.item.duration_ms || 1)) * 100))}%`, backgroundColor: C.accent }} />
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: -10 }}>
                    <button onClick={spotifyPrev} aria-label="Previous track" style={ctrlBtn(C.sub)}><PrevIcon size={20} /></button>
                    <button onClick={togglePlayPause} aria-label={nowPlaying.is_playing ? "Pause" : "Play"} style={ctrlBtn(C.accent, 48)}>
                      {nowPlaying.is_playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
                    </button>
                    <button onClick={spotifyNext} aria-label="Next track" style={ctrlBtn(C.sub)}><NextIcon size={20} /></button>
                  </div>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* ── CHAT ───────────────────────────────── */}
      {tab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <div style={{ padding: "64px 32px 32px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div>
                <div style={{ ...LABEL, marginBottom: 16 }}>Assistant</div>
                <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.05 }}>What's on<br/>your mind?</div>
              </div>
              {speechSupported && (
                <button
                  onClick={() => setShowSettings(true)}
                  aria-label="Voice settings"
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.sub, padding: 6, marginTop: 6, fontFamily: F, flexShrink: 0 }}>
                  <GearIcon size={20} />
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 32px 140px", display: "flex", flexDirection: "column", gap: 14 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%",
                  padding: "14px 18px",
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: C.text,
                  fontWeight: 300,
                  backgroundColor: m.role === "user" ? C.card : "transparent",
                  border: m.role === "assistant" ? "1px solid " + C.border : "none",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex" }}>
                <div style={{ padding: "16px 18px", border: "1px solid " + C.border, display: "flex", gap: 6, alignItems: "center" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, backgroundColor: C.accent, animation: "blink 1.2s ease infinite", animationDelay: (i * 0.3) + "s" }} />)}
                </div>
              </div>
            )}
            <div ref={chatRef} />
          </div>

          <div style={{ position: "fixed", bottom: 66, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, padding: "14px 24px", borderTop: "1px solid " + C.border, backgroundColor: C.bg, display: "flex", gap: 10 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={voiceState === "listening" ? "Listening…" : voiceState === "thinking" ? "Thinking…" : voiceState === "speaking" ? "Speaking…" : "Message"}
              style={{ flex: 1, backgroundColor: C.card, border: "1px solid " + C.border, padding: "14px 18px", color: C.text, fontSize: 14, fontWeight: 300, outline: "none", fontFamily: F }} />
            {speechSupported && (
              <button
                aria-label={voiceState === "idle" ? "Start voice chat" : "Stop voice chat"}
                onClick={() => toggleVoice("chat")}
                style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: voiceState !== "idle" ? C.accent : C.card, border: voiceState !== "idle" ? "none" : "1px solid " + C.border, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: voiceState !== "idle" ? C.bg : C.accent, fontFamily: F, animation: voiceState === "listening" ? "pulse 1s ease-in-out infinite" : "none" }}>
                <MicIcon size={20} />
              </button>
            )}
            <button onClick={() => send()} style={{ width: 48, height: 48, backgroundColor: input.trim() ? C.accent : C.card, border: input.trim() ? "none" : "1px solid " + C.border, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: input.trim() ? C.bg : C.muted, fontFamily: F, fontWeight: 500 }}>↑</button>
          </div>
        </div>
      )}

      {/* ── FEATURES ───────────────────────────── */}
      {tab === "features" && (() => {
        const features = [
          { id: "music", name: "Music", status: spotify ? "connected" : "available", onTap: () => { setShowController(true); if (spotify) loadUserPlaylists(); } },
          { id: "tee-time", name: "Book a Tee Time", status: "available", onTap: () => window.open("https://www.golfnow.com/tee-times", "_blank") },
          { id: "reservation", name: "Make a Reservation", status: "available", onTap: () => window.open("https://resy.com", "_blank") },
          { id: "ride", name: "Get a Ride", status: "available", onTap: openUber },
          { id: "weather", name: "Weather", status: "live", onTap: () => { setShowWeather(true); loadForecast(); } },
          { id: "grocery", name: "Grocery List", status: "live", onTap: () => { setShowListModal("grocery"); setListInput(""); } },
          { id: "gmail", name: gmail ? "Gmail" : "Connect Gmail", status: gmail ? "connected" : "available", onTap: gmail ? disconnectGmail : connectGmail },
          { id: "trip", name: "Trip Planning", status: "available", onTap: () => { setInput("Help me plan a trip"); setTab("chat"); } },
          { id: "dog-dad", name: "Dog Dad", status: "coming_soon" },
          { id: "text", name: "Text Someone", status: "coming_soon" },
          { id: "meditation", name: "Morning Meditation", status: "coming_soon" },
        ];
        const statusMeta = (s) => {
          if (s === "connected") return { label: "Connected", dot: C.accent, text: C.sub };
          if (s === "live")      return { label: "Live",      dot: C.accent, text: C.sub };
          if (s === "available") return { label: "Available", dot: C.text,   text: C.sub };
          return                         { label: "Coming Soon", dot: C.muted, text: C.muted };
        };
        return (
          <div style={{ padding: "64px 32px 140px" }}>
            <div style={{ marginBottom: 40 }}>
              <div style={{ ...LABEL, marginBottom: 16 }}>Features</div>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.1, color: C.text }}>What can I do<br/>for you?</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {features.map(f => {
                const m = statusMeta(f.status);
                const disabled = f.status === "coming_soon";
                return (
                  <button
                    key={f.id}
                    onClick={disabled ? undefined : f.onTap}
                    disabled={disabled}
                    style={{
                      backgroundColor: C.card,
                      border: "1px solid " + C.border,
                      borderRadius: 0,
                      padding: 16,
                      cursor: disabled ? "default" : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "flex-start",
                      minHeight: 150,
                      position: "relative",
                      textAlign: "left",
                      fontFamily: F,
                      color: "inherit",
                    }}>
                    <div style={{ position: "absolute", top: 14, left: 16, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, backgroundColor: m.dot, display: "inline-block" }} />
                      <span style={{ fontSize: 9, color: m.text, letterSpacing: 2, textTransform: "uppercase", fontWeight: 400, fontFamily: F }}>{m.label}</span>
                    </div>
                    <span style={{ fontSize: 14, color: disabled ? C.muted : C.text, fontWeight: 400, lineHeight: 1.3 }}>{f.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── SCHEDULE ───────────────────────────── */}
      {tab === "schedule" && (
        <div style={{ padding: "64px 32px 140px" }}>
          <div style={{ marginBottom: 56 }}>
            <div style={{ ...LABEL, marginBottom: 16 }}>Schedule</div>
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.05 }}>Your day</div>
          </div>

          <button onClick={() => setShowAdd(true)} style={{ width: "100%", backgroundColor: "transparent", border: "1px solid " + C.border, padding: "20px 22px", color: C.accent, fontSize: 13, fontWeight: 300, cursor: "pointer", marginBottom: 28, fontFamily: F, textAlign: "left" }}>
            + Add event or reminder
          </button>

          {events.length === 0
            ? <div style={{ color: C.muted, padding: "48px 0", fontSize: 13, fontWeight: 300 }}>Nothing scheduled</div>
            : events.map(e => (
              <div key={e.id} style={{ backgroundColor: C.card, borderLeft: "2px solid " + C.accent, padding: "28px 28px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.4 }}>{e.title}</div>
                  <div style={{ fontSize: 10, color: C.sub, marginTop: 10, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 400 }}>{e.time} · {e.type}</div>
                </div>
                <button onClick={() => removeEvent(e.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, padding: 8, lineHeight: 1, fontFamily: F }}>×</button>
              </div>
            ))
          }
        </div>
      )}

      {/* ── VOICE STATE CHIP ────────────────────── */}
      {voiceState !== "idle" && (
        <div style={{ position: "fixed", bottom: 138, left: "50%", transform: "translateX(-50%)", zIndex: 70, pointerEvents: "none" }}>
          <div style={{ backgroundColor: C.card, borderLeft: "2px solid " + C.accent, padding: "10px 16px 10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, backgroundColor: C.accent, animation: "blink 1.2s ease infinite", animationDelay: (i * 0.3) + "s" }} />)}
            </div>
            <span style={{ fontSize: 10, color: C.text, letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 500 }}>
              {voiceState === "listening" ? "Listening" : voiceState === "thinking" ? "Thinking" : "Speaking"}
            </span>
          </div>
        </div>
      )}

      {/* ── FLOATING MIC (TODAY) ──────────────── */}
      {tab === "today" && speechSupported && (
        <button
          aria-label={voiceState === "idle" ? "Start voice chat" : "Stop voice chat"}
          onClick={() => toggleVoice("today")}
          style={{
            position: "fixed",
            bottom: 86,
            right: "max(24px, calc(50vw - 191px))",
            width: 58,
            height: 58,
            borderRadius: "50%",
            backgroundColor: C.accent,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.bg,
            zIndex: 60,
            animation: voiceState === "listening" ? "pulse 1s ease-in-out infinite" : "none",
            fontFamily: F,
          }}>
          <MicIcon size={24} />
        </button>
      )}

      {/* ── NAV ───────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, backgroundColor: C.bg, borderTop: "1px solid " + C.border, display: "flex", zIndex: 50 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0 18px", color: tab === n.id ? C.accent : C.muted, fontFamily: F }}>
            {n.icon}
            <span style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontWeight: 400 }}>{n.label}</span>
          </button>
        ))}
      </div>

      {/* ── LIST MODAL ──────────────────────────── */}
      {showListModal && (() => {
        const name = showListModal;
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        const items = listItems.filter(i => i.list_name === name);
        return (
          <div onClick={() => setShowListModal(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.85)", display: "flex", alignItems: "flex-end", zIndex: 115 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", backgroundColor: C.card, padding: "36px 32px 56px", borderTop: "1px solid " + C.border, animation: "slideUp 0.28s ease-out", maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={LABEL}>List</div>
                <button onClick={() => setShowListModal(null)} aria-label="Close" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, padding: 4, lineHeight: 1, fontFamily: F }}>×</button>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 28, letterSpacing: -0.8, lineHeight: 1.1 }}>{displayName}</div>

              {items.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, fontWeight: 300, lineHeight: 1.5, marginBottom: 24 }}>
                  Nothing on this list yet. Add an item below or ask the assistant.
                </div>
              ) : (
                <div style={{ marginBottom: 24 }}>
                  {items.map(i => (
                    <div key={i.id} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid " + C.border, gap: 14 }}>
                      <button
                        onClick={() => toggleListItem(i.id)}
                        aria-label={i.done ? "Mark not done" : "Mark done"}
                        style={{ width: 22, height: 22, border: "1px solid " + (i.done ? C.accent : C.sub), backgroundColor: i.done ? C.accent : "transparent", flexShrink: 0, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
                        {i.done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
                            <polyline points="5 13 10 18 19 7" />
                          </svg>
                        )}
                      </button>
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 400, color: i.done ? C.muted : C.text, textDecoration: i.done ? "line-through" : "none", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {i.item}
                      </div>
                      <button onClick={() => removeListItem(i.id)} aria-label="Remove" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, padding: 8, lineHeight: 1, fontFamily: F }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <input
                value={listInput}
                onChange={e => setListInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && listInput.trim()) {
                    addListItem(name, listInput);
                    setListInput("");
                  }
                }}
                placeholder={`Add to ${name}`}
                style={{ width: "100%", backgroundColor: C.bg, border: "1px solid " + C.border, padding: "14px 18px", color: C.text, fontSize: 14, fontWeight: 300, outline: "none", fontFamily: F }} />
            </div>
          </div>
        );
      })()}

      {/* ── WEATHER MODAL ───────────────────────── */}
      {showWeather && (
        <div onClick={() => setShowWeather(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.85)", display: "flex", alignItems: "flex-end", zIndex: 115 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", backgroundColor: C.card, padding: "36px 32px 56px", borderTop: "1px solid " + C.border, animation: "slideUp 0.28s ease-out", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={LABEL}>Weather</div>
              <button onClick={() => setShowWeather(false)} aria-label="Close" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, padding: 4, lineHeight: 1, fontFamily: F }}>×</button>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4, letterSpacing: -0.8, lineHeight: 1.1 }}>Forecast</div>
            {weather?.name && (
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 300, letterSpacing: 0.2, marginBottom: 28 }}>{weather.name}</div>
            )}

            {weather && (
              <div style={{ backgroundColor: C.bg, borderLeft: "2px solid " + C.accent, padding: "24px 22px", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>{Math.round(weather.main.temp)}°</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 400, lineHeight: 1.3, textTransform: "capitalize" }}>{weather.weather[0].description}</div>
                    <div style={{ fontSize: 10, color: C.sub, marginTop: 6, letterSpacing: 2, textTransform: "uppercase", fontWeight: 400 }}>
                      H {Math.round(weather.main.temp_max)}° · L {Math.round(weather.main.temp_min)}° · Feels {Math.round(weather.main.feels_like)}°
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.sub, marginTop: 20, letterSpacing: 2, textTransform: "uppercase", fontWeight: 400, display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <span>Humidity {weather.main.humidity}%</span>
                  <span>Wind {Math.round(weather.wind?.speed || 0)} mph</span>
                </div>
              </div>
            )}

            {forecast?.list?.length > 0 && (
              <>
                <div style={{ ...LABEL, marginBottom: 16 }}>Next 24 Hours</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 28 }}>
                  {forecast.list.slice(0, 8).map(f => {
                    const d = new Date(f.dt * 1000);
                    const h = d.getHours() % 12 || 12;
                    const ap = d.getHours() >= 12 ? "PM" : "AM";
                    return (
                      <div key={f.dt} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid " + C.border, gap: 16 }}>
                        <div style={{ fontSize: 10, color: C.sub, letterSpacing: 2, textTransform: "uppercase", fontWeight: 400, width: 56 }}>{h} {ap}</div>
                        <div style={{ fontSize: 16 }}>{getWeatherIcon(f.weather[0].id)}</div>
                        <div style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 300, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.weather[0].description}
                        </div>
                        <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{Math.round(f.main.temp)}°</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {forecast?.list?.length > 0 && (() => {
              const byDay = new Map();
              forecast.list.forEach(f => {
                const key = new Date(f.dt * 1000).toDateString();
                if (!byDay.has(key)) byDay.set(key, { min: f.main.temp_min, max: f.main.temp_max, icon: f.weather[0].id, desc: f.weather[0].description, date: new Date(f.dt * 1000) });
                else {
                  const cur = byDay.get(key);
                  cur.min = Math.min(cur.min, f.main.temp_min);
                  cur.max = Math.max(cur.max, f.main.temp_max);
                }
              });
              const days = Array.from(byDay.values()).slice(0, 5);
              return (
                <>
                  <div style={{ ...LABEL, marginBottom: 16 }}>5 Days</div>
                  <div>
                    {days.map(d => {
                      const day = d.date.toLocaleDateString("en-US", { weekday: "long" });
                      return (
                        <div key={day} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid " + C.border, gap: 16 }}>
                          <div style={{ fontSize: 10, color: C.sub, letterSpacing: 2, textTransform: "uppercase", fontWeight: 400, width: 84 }}>{day}</div>
                          <div style={{ fontSize: 16 }}>{getWeatherIcon(d.icon)}</div>
                          <div style={{ flex: 1 }} />
                          <div style={{ fontSize: 11, color: C.sub, fontWeight: 400, letterSpacing: 1 }}>{Math.round(d.min)}°</div>
                          <div style={{ fontSize: 14, color: C.text, fontWeight: 500, minWidth: 32, textAlign: "right" }}>{Math.round(d.max)}°</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── SPOTIFY CONTROLLER MODAL ────────────── */}
      {showController && (
        <div onClick={() => setShowController(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.85)", display: "flex", alignItems: "flex-end", zIndex: 115 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", backgroundColor: C.card, padding: "36px 32px 56px", borderTop: "1px solid " + C.border, animation: "slideUp 0.28s ease-out", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={LABEL}>Music</div>
              <button onClick={() => setShowController(false)} aria-label="Close" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, padding: 4, lineHeight: 1, fontFamily: F }}>×</button>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 28, letterSpacing: -0.8, lineHeight: 1.1 }}>Controller</div>

            {!spotify ? (
              <button onClick={connectSpotify} style={{ width: "100%", backgroundColor: "transparent", border: "1px solid " + C.border, padding: "20px 22px", color: C.accent, fontSize: 13, fontWeight: 300, cursor: "pointer", fontFamily: F, textAlign: "left" }}>
                Connect Spotify
              </button>
            ) : (
              <>
                {nowPlaying?.item ? (
                  <div style={{ backgroundColor: C.bg, borderLeft: "2px solid " + C.accent, padding: "20px 20px 18px", marginBottom: 24 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
                      {nowPlaying.item.album?.images?.[0]?.url && (
                        <img src={nowPlaying.item.album.images[0].url} alt="" style={{ width: 72, height: 72, flexShrink: 0, display: "block" }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: C.text, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nowPlaying.item.name}</div>
                        <div style={{ fontSize: 12, color: C.sub, marginTop: 6, fontWeight: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {nowPlaying.item.artists?.map(a => a.name).join(", ")}
                        </div>
                      </div>
                    </div>
                    <div style={{ height: 2, backgroundColor: C.border, marginBottom: 16, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(0, ((nowPlaying.progress_ms || 0) / (nowPlaying.item.duration_ms || 1)) * 100))}%`, backgroundColor: C.accent }} />
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <button onClick={() => spotifySeek(-10000)} aria-label="Back 10 seconds" style={ctrlBtn(C.sub, 48)}><Back10Icon size={22} /></button>
                      <button onClick={spotifyPrev} aria-label="Previous track" style={ctrlBtn(C.sub, 48)}><PrevIcon size={22} /></button>
                      <button onClick={togglePlayPause} aria-label={nowPlaying.is_playing ? "Pause" : "Play"} style={ctrlBtn(C.accent, 56)}>
                        {nowPlaying.is_playing ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
                      </button>
                      <button onClick={spotifyNext} aria-label="Next track" style={ctrlBtn(C.sub, 48)}><NextIcon size={22} /></button>
                      <button onClick={() => spotifySeek(10000)} aria-label="Forward 10 seconds" style={ctrlBtn(C.sub, 48)}><Fwd10Icon size={22} /></button>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                      <button onClick={() => spotifyVolumeDelta(-10)} aria-label="Volume down" style={ctrlBtn(C.sub, 44)}><VolDownIcon size={18} /></button>
                      <button onClick={() => spotifyVolumeDelta(10)} aria-label="Volume up" style={ctrlBtn(C.sub, 44)}><VolUpIcon size={18} /></button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: C.muted, fontSize: 13, fontWeight: 300, marginBottom: 24 }}>
                    Nothing playing. Search below or pick a playlist to start.
                  </div>
                )}

                <input
                  value={controllerQuery}
                  onChange={e => setControllerQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && controllerSubmit()}
                  placeholder="Search and play"
                  style={{ width: "100%", backgroundColor: C.bg, border: "1px solid " + C.border, padding: "14px 18px", color: C.text, fontSize: 14, fontWeight: 300, outline: "none", fontFamily: F, marginBottom: 24 }}
                />

                {userPlaylists.length > 0 && (
                  <>
                    <div style={{ ...LABEL, marginBottom: 16 }}>Your Playlists</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {userPlaylists.slice(0, 12).map(p => (
                        <button key={p.id} onClick={() => playPlaylistByUri(p.uri)}
                          style={{ width: "100%", padding: "14px 16px", backgroundColor: "transparent", border: "1px solid " + C.border, color: C.text, textAlign: "left", cursor: "pointer", fontFamily: F, display: "flex", alignItems: "center", gap: 12 }}>
                          {p.images?.[0]?.url && <img src={p.images[0].url} alt="" style={{ width: 36, height: 36, flexShrink: 0, display: "block" }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: C.sub, marginTop: 4, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 400 }}>{p.tracks?.total ?? 0} tracks</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── VOICE SETTINGS MODAL ────────────────── */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.85)", display: "flex", alignItems: "flex-end", zIndex: 110 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", backgroundColor: C.card, padding: "36px 32px 56px", borderTop: "1px solid " + C.border, animation: "slideUp 0.28s ease-out", maxHeight: "82vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={LABEL}>Settings</div>
              <button onClick={() => setShowSettings(false)} aria-label="Close" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22, padding: 4, lineHeight: 1, fontFamily: F }}>×</button>
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, letterSpacing: -0.8, lineHeight: 1.1 }}>Voice</div>
            <div style={{ fontSize: 12, color: C.sub, fontWeight: 300, marginBottom: 28, lineHeight: 1.5 }}>
              Pick the voice your assistant speaks in. Tap any option to preview it.
            </div>

            {voices.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 300, padding: "24px 0" }}>
                No voices available in this browser.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {voices.map(v => {
                  const active = currentVoiceName === v.name;
                  return (
                    <button
                      key={v.voiceURI || (v.name + v.lang)}
                      onClick={() => selectVoice(v)}
                      style={{
                        width: "100%",
                        padding: "16px 18px",
                        backgroundColor: "transparent",
                        border: "1px solid " + (active ? C.accent : C.border),
                        borderLeft: "2px solid " + (active ? C.accent : C.border),
                        color: C.text,
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: F,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: C.text, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                        <div style={{ fontSize: 10, color: C.sub, marginTop: 6, letterSpacing: 2, textTransform: "uppercase", fontWeight: 400 }}>
                          {v.lang}{v.default ? " · Default" : ""}{v.localService ? "" : " · Cloud"}
                        </div>
                      </div>
                      {active && (
                        <span style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase", fontWeight: 500, flexShrink: 0 }}>
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD MODAL ───────────────────────────── */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.85)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, margin: "0 auto", backgroundColor: C.card, padding: "36px 32px 56px", borderTop: "1px solid " + C.border, animation: "slideUp 0.28s ease-out" }}>
            <div style={{ ...LABEL, marginBottom: 16 }}>New</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, letterSpacing: -0.8, lineHeight: 1.1 }}>Add to your day</div>

            <input placeholder="What's happening?" value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              style={{ width: "100%", backgroundColor: C.bg, border: "1px solid " + C.border, padding: "16px 18px", color: C.text, fontSize: 14, fontWeight: 300, outline: "none", fontFamily: F, marginBottom: 10 }} />
            <input placeholder="Time (e.g. 3:00 PM)" value={draft.time}
              onChange={e => setDraft(d => ({ ...d, time: e.target.value }))}
              style={{ width: "100%", backgroundColor: C.bg, border: "1px solid " + C.border, padding: "16px 18px", color: C.text, fontSize: 14, fontWeight: 300, outline: "none", fontFamily: F, marginBottom: 28 }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 32 }}>
              {["call","dinner","meeting","reminder","errand","other"].map(t => (
                <button key={t} onClick={() => setDraft(d => ({ ...d, type: t }))}
                  style={{ padding: "14px 6px", backgroundColor: "transparent", border: "1px solid " + (draft.type === t ? C.accent : C.border), color: draft.type === t ? C.accent : C.sub, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", cursor: "pointer", fontFamily: F, fontWeight: 400 }}>
                  {t}
                </button>
              ))}
            </div>

            <button onClick={addEvent} disabled={!draft.title} style={{ width: "100%", backgroundColor: draft.title ? C.accent : "transparent", border: draft.title ? "none" : "1px solid " + C.border, padding: "18px", color: draft.title ? C.bg : C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: 500, cursor: draft.title ? "pointer" : "default", fontFamily: F }}>
              Add to schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
