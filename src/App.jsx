import { useState, useEffect, useRef } from "react";

const TODAY = () => new Date().toDateString();
const SESSION_TYPES = ["아날로그 세션", "아웃풋 세션", "인풋 세션", "프리 세션"];

const MOODS = [
  { emoji: "😵", color: "#EF4444", tip: "쉬는 날 모드로 가." },
  { emoji: "😟", color: "#F97316", tip: "1세션만 앉아봐." },
  { emoji: "😐", color: "#EAB308", tip: "평소대로 가면 돼." },
  { emoji: "🙂", color: "#22C55E", tip: "2세션 목표." },
  { emoji: "⚡", color: "#C9A96E", tip: "오버페이스 조심." },
];

const PROOF_ITEMS = [
  { key: "openedDoc", label: "문서를 열었다" },
  { key: "wroteLine", label: "한 줄 썼다" },
  { key: "sharedIdea", label: "누군가에게 얘기했다" },
];

function loadLocal(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function saveLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const defSession = (type = "아날로그 세션", duration = 45) => ({
  type, duration, done: false, elapsed: 0, running: false, endAt: null,
});

const defDay = () => ({
  dateKey: TODAY(),
  mood: null,
  interest: null,
  todayCurious: "",
  todayDropped: "",
  dayType: "work",
  sessions: [
    defSession("아날로그 세션"),
    defSession("아웃풋 세션"),
    defSession("인풋 세션"),
  ],
  proofs: { openedDoc: false, wroteLine: false, sharedIdea: false, inputWatched: false, inputMemo: false },
  sessionCount: 0,
  feedback: "",
  ideas: [],
  heroUsed: false,
});

const defMeta = () => ({ weekData: {}, history: {} });

/* ── Ring ── */
function Ring({ elapsed, total, running }) {
  const totalSec = total * 60;
  const rem = Math.max(0, totalSec - elapsed);
  const pct = Math.min(elapsed / totalSec, 1);
  const r = 22, circ = 2 * Math.PI * r;
  const m = String(Math.floor(rem / 60)).padStart(2, "0");
  const s = String(rem % 60).padStart(2, "0");
  return (
    <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
      <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="#2A2D36" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none"
          stroke={running ? "#C9A96E" : "#3A3D46"} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: running ? "stroke-dashoffset 1s linear" : "none" }} />
      </svg>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:10, fontWeight:700, color:"#D1CEC8" }}>
        {m}:{s}
      </div>
    </div>
  );
}

/* ── WeekDots ── */
function WeekDots({ weekData }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i));
    const key = d.toDateString();
    const raw = weekData[key];
    const count = typeof raw === "number" ? raw : (raw?.count || 0);
    const dayType = typeof raw === "object" ? raw?.dayType : null;
    return { key, count, dayType, isToday: i === 6, label: ["일","월","화","수","목","금","토"][d.getDay()] };
  });
  return (
    <div style={{ display:"flex", justifyContent:"space-between" }}>
      {days.map(({ key, count, dayType, isToday, label }) => {
        let bg = "#1C1F27";
        if (count >= 1) bg = dayType === "work" ? "#F97316" : dayType === "input" ? "#3B82F6" : "#C9A96E55";
        return (
          <div key={key} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:bg, border: isToday ? "2px solid #C9A96E" : "2px solid #2A2D36", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#F0EDE8", fontWeight:600 }}>
              {count > 0 ? count : ""}
            </div>
            <div style={{ fontSize:10, color: isToday ? "#C9A96E" : "#4B5563" }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Calendar Modal ── */
function CalendarModal({ weekData, onClose }) {
  const today = new Date();
  const year = today.getFullYear(), month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const getDot = (d) => {
    if (!d) return null;
    const raw = weekData[new Date(year, month, d).toDateString()];
    if (!raw) return null;
    const count = typeof raw === "number" ? raw : (raw?.count || 0);
    if (count < 1) return null;
    const dt = typeof raw === "object" ? raw?.dayType : null;
    return dt === "work" ? "#F97316" : dt === "input" ? "#3B82F6" : "#C9A96E";
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"#000000CC", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#1C1F27", borderRadius:20, padding:20, width:"100%", maxWidth:360, border:"1px solid #2A2D36" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#F0EDE8" }}>{year}년 {month+1}월</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6B7280", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:8 }}>
          {["일","월","화","수","목","금","토"].map(d => <div key={d} style={{ textAlign:"center", fontSize:10, color:"#6B7280", padding:"4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
          {cells.map((d, i) => {
            const dot = getDot(d);
            const isToday = d === today.getDate();
            return (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"5px 0", gap:4 }}>
                <div style={{ fontSize:12, color: d ? (isToday ? "#C9A96E" : "#D1CEC8") : "transparent", fontWeight: isToday ? 700 : 400 }}>{d || "·"}</div>
                <div style={{ width:7, height:7, borderRadius:"50%", background: dot || "transparent" }} />
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:16, fontSize:11, color:"#6B7280" }}>
          {[["작업 데이","#F97316"],["인풋 데이","#3B82F6"]].map(([l,bg]) => (
            <span key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:bg }} />{l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Add Session Modal ── */
function AddSessionModal({ onAdd, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000000CC", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#1C1F27", borderRadius:"20px 20px 0 0", padding:20, width:"100%", maxWidth:420, border:"1px solid #2A2D36", paddingBottom:"max(20px, env(safe-area-inset-bottom))" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:16 }}>세션 추가</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {SESSION_TYPES.map(type => (
            <button key={type} onClick={() => onAdd(type)} style={{ background:"#111318", border:"1px solid #2A2D36", borderRadius:12, padding:"14px 16px", color:"#D1CEC8", fontSize:14, cursor:"pointer", textAlign:"left" }}>
              {type}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ width:"100%", background:"none", border:"1px solid #2A2D36", borderRadius:12, padding:12, color:"#6B7280", fontSize:14, cursor:"pointer", marginTop:10 }}>취소</button>
      </div>
    </div>
  );
}

/* ── History Modal ── */
function HistoryModal({ history, onClose }) {
  const entries = Object.entries(history || {})
    .filter(([, v]) => v.curious || v.dropped || v.feedback)
    .sort((a, b) => new Date(b[0]) - new Date(a[0])).slice(0, 60);
  return (
    <div style={{ position:"fixed", inset:0, background:"#000000CC", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#1C1F27", borderRadius:20, padding:20, width:"100%", maxWidth:420, maxHeight:"80vh", border:"1px solid #2A2D36", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#F0EDE8" }}>지난 기록</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6B7280", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        {entries.length === 0
          ? <div style={{ fontSize:13, color:"#4B5563", textAlign:"center", padding:"20px 0" }}>아직 기록이 없어.</div>
          : entries.map(([dateKey, data]) => (
            <div key={dateKey} style={{ marginBottom:12, padding:14, background:"#111318", borderRadius:12, border:"1px solid #2A2D36" }}>
              <div style={{ fontSize:11, color:"#C9A96E", marginBottom:8 }}>
                {new Date(dateKey).toLocaleDateString("ko-KR", { month:"long", day:"numeric", weekday:"short" })}
              </div>
              {data.curious && <div style={{ fontSize:13, color:"#D1CEC8", marginBottom:4 }}>궁금했던 것: {data.curious}</div>}
              {data.dropped && <div style={{ fontSize:13, color:"#D1CEC8", marginBottom:4 }}>안 하기로 한 것: {data.dropped}</div>}
              {data.feedback && <div style={{ fontSize:13, color:"#9CA3AF", fontStyle:"italic", marginTop:6, paddingTop:6, borderTop:"1px solid #2A2D36" }}>"{data.feedback}"</div>}
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ══ Main App ══ */
export default function App() {
  const [day, setDay] = useState(() => {
    const sd = loadLocal("day_v4", null);
    if (sd?.dateKey === TODAY()) return { ...defDay(), ...sd, proofs: { ...defDay().proofs, ...(sd.proofs || {}) } };
    return defDay();
  });
  const [meta, setMeta] = useState(() => loadLocal("meta_v4", defMeta()));
  const [tab, setTab] = useState("routine");
  const [ideaInput, setIdeaInput] = useState("");
  const [heroOverlay, setHeroOverlay] = useState(false);
  const [heroLeft, setHeroLeft] = useState(20 * 60);
  const [heroEndAt, setHeroEndAt] = useState(null);
  const [heroDone, setHeroDone] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editDuration, setEditDuration] = useState(null);
  const [timerOverlay, setTimerOverlay] = useState(null); // session index
  const imageInputRef = useRef(null);

  useEffect(() => { saveLocal("day_v4", day); }, [day]);

  useEffect(() => {
    setMeta(prev => {
      const history = { ...prev.history, [TODAY()]: { curious: day.todayCurious, dropped: day.todayDropped, feedback: day.feedback } };
      const inputCount = (day.proofs.inputWatched ? 1 : 0) + (day.proofs.inputMemo ? 1 : 0);
      const count = day.dayType === "input" ? inputCount : day.sessionCount;
      const weekData = { ...prev.weekData, [TODAY()]: { count, dayType: day.dayType } };
      const next = { ...prev, history, weekData };
      saveLocal("meta_v4", next);
      return next;
    });
  }, [day.sessionCount, day.dayType, day.todayCurious, day.todayDropped, day.feedback, day.proofs.inputWatched, day.proofs.inputMemo]);

  /* 타이머 — 백그라운드 안전 (endAt 기준) */
  useEffect(() => {
    const id = setInterval(() => {
      setDay(prev => {
        let changed = false;
        const sessions = prev.sessions.map(s => {
          if (!s.running || !s.endAt) return s;
          const elapsed = Math.round((s.duration * 60 * 1000 - (s.endAt - Date.now())) / 1000);
          if (elapsed >= s.duration * 60) { changed = true; return { ...s, elapsed: s.duration * 60, running: false, endAt: null, done: true }; }
          return { ...s, elapsed: Math.max(0, elapsed) };
        });
        if (changed) return { ...prev, sessions, sessionCount: sessions.filter(s => s.done).length };
        return { ...prev, sessions };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* 히어로 카운트다운 */
  useEffect(() => {
    if (!heroEndAt) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((heroEndAt - Date.now()) / 1000));
      setHeroLeft(left);
      if (left <= 0) { setHeroEndAt(null); setHeroDone(true); }
    }, 1000);
    return () => clearInterval(id);
  }, [heroEndAt]);

  const upd = patch => setDay(prev => ({ ...prev, ...patch }));

  const startHero = () => {
    setHeroEndAt(Date.now() + 20 * 60 * 1000);
    setHeroLeft(20 * 60);
    setHeroDone(false);
    setHeroOverlay(true);
    upd({ heroUsed: true });
  };

  const cancelHero = () => { setHeroOverlay(false); setHeroEndAt(null); setHeroLeft(20 * 60); setHeroDone(false); };

  const toggleTimer = (i, openOverlay = false) => {
    setDay(prev => {
      const sessions = prev.sessions.map((s, idx) => {
        if (idx !== i) {
          if (!s.running) return s;
          const elapsed = s.endAt ? Math.max(0, Math.round((s.duration * 60 * 1000 - (s.endAt - Date.now())) / 1000)) : s.elapsed;
          return { ...s, running: false, endAt: null, elapsed };
        }
        if (s.running) {
          const elapsed = s.endAt ? Math.max(0, Math.round((s.duration * 60 * 1000 - (s.endAt - Date.now())) / 1000)) : s.elapsed;
          return { ...s, running: false, endAt: null, elapsed };
        }
        return { ...s, running: true, endAt: Date.now() + Math.max(0, s.duration * 60 - s.elapsed) * 1000 };
      });
      return { ...prev, sessions };
    });
    if (openOverlay) setTimerOverlay(i);
  };

  const toggleDone = i => {
    setDay(prev => {
      const sessions = prev.sessions.map((s, idx) => {
        if (idx !== i) return s;
        return s.done ? { ...s, done: false } : { ...s, done: true, running: false, endAt: null };
      });
      return { ...prev, sessions, sessionCount: sessions.filter(s => s.done).length };
    });
  };

  const addSession = type => { setDay(prev => ({ ...prev, sessions: [...prev.sessions, defSession(type)] })); setShowAddSession(false); };

  const updateDuration = (i, val) => {
    const dur = Math.min(60, Math.max(5, parseInt(val) || 45));
    setDay(prev => ({ ...prev, sessions: prev.sessions.map((s, idx) => idx === i ? { ...s, duration: dur } : s) }));
  };

  const toggleProof = key => upd({ proofs: { ...day.proofs, [key]: !day.proofs[key] } });

  const addIdea = () => {
    if (!ideaInput.trim()) return;
    upd({ ideas: [...day.ideas, { id: Date.now(), text: ideaInput.trim(), image: null, time: new Date().toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit" }) }] });
    setIdeaInput("");
  };

  const addIdeaImage = file => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => upd({ ideas: [...day.ideas, { id: Date.now(), text: "", image: e.target.result, time: new Date().toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit" }) }] });
    reader.readAsDataURL(file);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ day, meta, exportedAt: new Date().toISOString() }, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `hansol-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const isRoutineDone = Object.values(day.proofs).some(Boolean) || day.sessionCount > 0;
  const thisMonthCount = Object.entries(meta.weekData).filter(([k, v]) => {
    const d = new Date(k), now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && (typeof v === "number" ? v : v?.count || 0) >= 1;
  }).length;

  const heroM = String(Math.floor(heroLeft / 60)).padStart(2, "0");
  const heroS = String(heroLeft % 60).padStart(2, "0");

  return (
    <div style={S.root}>

      {/* 히어로 풀스크린 */}
      {heroOverlay && (
        <div style={{ position:"fixed", inset:0, background:"#0A0C11", zIndex:100, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
          <div style={{ fontSize:11, color:"#4B5563", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:48 }}>
            {heroDone ? "완료" : "착수 타이머"}
          </div>
          <div style={{ fontSize: heroDone ? 80 : 96, fontWeight:700, color: heroDone ? "#7BC67E" : "#C9A96E", letterSpacing:"-0.03em", lineHeight:1, marginBottom:48 }}>
            {heroDone ? "✓" : `${heroM}:${heroS}`}
          </div>
          <div style={{ fontSize:18, color:"#D1CEC8", textAlign:"center", lineHeight:2, marginBottom:64, whiteSpace:"pre-line" }}>
            {heroDone ? "잘 펼쳤어.\n이제 첫 세션 시작해." : "지금부터 20분.\n그냥 펼쳐.\n한글이든 다이어리든."}
          </div>
          {heroDone
            ? <button onClick={() => setHeroOverlay(false)} style={{ background:"#C9A96E", border:"none", borderRadius:16, padding:"16px 44px", color:"#111318", fontSize:16, fontWeight:700, cursor:"pointer" }}>첫 세션 시작 →</button>
            : <button onClick={cancelHero} style={{ position:"absolute", bottom:40, right:24, background:"none", border:"1px solid #2A2D36", borderRadius:20, padding:"8px 18px", color:"#4B5563", fontSize:12, cursor:"pointer" }}>취소</button>
          }
        </div>
      )}

      {showCalendar && <CalendarModal weekData={meta.weekData} onClose={() => setShowCalendar(false)} />}
      {showAddSession && <AddSessionModal onAdd={addSession} onClose={() => setShowAddSession(false)} />}
      {showHistory && <HistoryModal history={meta.history} onClose={() => setShowHistory(false)} />}

      {/* 세션 타이머 풀스크린 */}
      {timerOverlay !== null && day.sessions[timerOverlay] && (() => {
        const s = day.sessions[timerOverlay];
        const rem = Math.max(0, s.duration * 60 - s.elapsed);
        const m = String(Math.floor(rem / 60)).padStart(2, "0");
        const sec = String(rem % 60).padStart(2, "0");
        const pct = Math.min(s.elapsed / (s.duration * 60), 1);
        const r = 80, circ = 2 * Math.PI * r;
        return (
          <div style={{ position:"fixed", inset:0, background:"#0A0C11", zIndex:100, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
            <div style={{ fontSize:11, color:"#4B5563", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:24 }}>{s.type}</div>
            {s.done
              ? <>
                  <div style={{ fontSize:96, fontWeight:700, color:"#7BC67E", lineHeight:1, marginBottom:40 }}>✓</div>
                  <div style={{ fontSize:18, color:"#D1CEC8", marginBottom:64 }}>세션 완료!</div>
                  <button onClick={() => setTimerOverlay(null)} style={{ background:"#C9A96E", border:"none", borderRadius:16, padding:"16px 44px", color:"#111318", fontSize:16, fontWeight:700, cursor:"pointer" }}>확인</button>
                </>
              : <>
                  <div style={{ position:"relative", width:180, height:180, marginBottom:40 }}>
                    <svg width="180" height="180" style={{ transform:"rotate(-90deg)" }}>
                      <circle cx="90" cy="90" r={r} fill="none" stroke="#2A2D36" strokeWidth="8" />
                      <circle cx="90" cy="90" r={r} fill="none" stroke={s.running ? "#C9A96E" : "#3A3D46"} strokeWidth="8"
                        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                        style={{ transition: s.running ? "stroke-dashoffset 1s linear" : "none" }} />
                    </svg>
                    <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
                      <div style={{ fontSize:42, fontWeight:700, color:"#C9A96E", letterSpacing:"-0.02em", lineHeight:1 }}>{m}:{sec}</div>
                      <div style={{ fontSize:11, color:"#6B7280", marginTop:6 }}>{s.duration}분</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:12, marginBottom:48 }}>
                    <button onClick={() => toggleTimer(timerOverlay)}
                      style={{ background:"#C9A96E22", border:"1px solid #C9A96E44", borderRadius:14, padding:"14px 32px", color:"#C9A96E", fontSize:15, fontWeight:600, cursor:"pointer" }}>
                      {s.running ? "⏸ 일시정지" : "▶ 계속"}
                    </button>
                    <button onClick={() => { toggleDone(timerOverlay); setTimerOverlay(null); }}
                      style={{ background:"#1C1F27", border:"1px solid #2A2D36", borderRadius:14, padding:"14px 24px", color:"#9CA3AF", fontSize:15, cursor:"pointer" }}>
                      완료
                    </button>
                  </div>
                  <button onClick={() => setTimerOverlay(null)} style={{ position:"absolute", bottom:40, right:24, background:"none", border:"1px solid #2A2D36", borderRadius:20, padding:"8px 18px", color:"#4B5563", fontSize:12, cursor:"pointer" }}>뒤로</button>
                </>
            }
          </div>
        );
      })()}

      <div style={S.wrap}>

        {/* 헤더 */}
        <div style={{ padding:"24px 0 4px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div style={{ fontSize:12, color:"#6B7280" }}>{new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric" })} ({new Date().toLocaleDateString("ko-KR", { weekday:"short" })})</div>
            <button onClick={() => setShowCalendar(true)} style={{ fontSize:12, color:"#C9A96E", background:"#C9A96E18", border:"1px solid #C9A96E44", borderRadius:20, padding:"3px 10px", cursor:"pointer" }}>
              📅 이번 달 {thisMonthCount}일
            </button>
          </div>
          <h1 style={S.h1}>오늘의 작업</h1>
        </div>

        {/* 탭 */}
        <div style={{ display:"flex", gap:8 }}>
          {[["routine","루틴"],["ideas","아이디어"],["week","이번 주"]].map(([k,l]) => (
            <button key={k} style={{ ...S.tab, ...(tab===k ? S.tabOn : {}) }} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {/* ══ 루틴 ══ */}
        {tab === "routine" && <>

          {/* 1. 시작 전 */}
          <div style={S.card}>
            <div style={S.label}>시작 전</div>
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              {MOODS.map((m, i) => (
                <button key={i} onClick={() => upd({ mood: i })}
                  style={{ flex:1, background: day.mood===i ? m.color+"22" : "#111318", border:`2px solid ${day.mood===i ? m.color : "#2A2D36"}`, borderRadius:10, padding:"10px 4px", cursor:"pointer" }}>
                  <div style={{ fontSize:20, textAlign:"center" }}>{m.emoji}</div>
                </button>
              ))}
            </div>
            {day.mood !== null && <div style={{ fontSize:12, color:"#9CA3AF", marginBottom:16, padding:"8px 12px", background:"#111318", borderRadius:8 }}>{MOODS[day.mood].tip}</div>}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:"#6B7280", marginBottom:8 }}>흥미도</div>
              <div style={{ display:"flex", gap:6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => upd({ interest: n })}
                    style={{ flex:1, height:38, borderRadius:8, border:"none", background: day.interest===n ? "#C9A96E" : day.interest>n ? "#C9A96E22" : "#111318", color: day.interest===n ? "#111318" : "#9CA3AF", fontSize:14, fontWeight:700, cursor:"pointer", outline: day.interest===n ? "none" : "1px solid #2A2D36" }}>
                    {n}
                  </button>
                ))}
              </div>
              {day.interest !== null && <div style={{ fontSize:12, color:"#6B7280", marginTop:8 }}>
                {day.interest <= 2 ? "레퍼런스 보는 날이야. 억지로 쓰지 마." : day.interest === 3 ? "1세션만 써봐." : "좋아. 집필 먼저 가."}
              </div>}
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#6B7280", marginBottom:6 }}>오늘 가장 궁금한 것</div>
              <input style={S.input} placeholder="예: 이 장면이 왜 심심하지?" value={day.todayCurious} onChange={e => upd({ todayCurious: e.target.value })} />
              <div style={{ fontSize:11, color:"#4B5563", marginTop:6 }}>목표보다 질문이 먼저야.</div>
            </div>
            <div>
              <div style={{ fontSize:11, color:"#6B7280", marginBottom:6 }}>오늘 안 하기로 한 것</div>
              <input style={S.input} placeholder="예: 새 기획안 시작 안 하기" value={day.todayDropped} onChange={e => upd({ todayDropped: e.target.value })} />
              <div style={{ fontSize:11, color:"#4B5563", marginTop:6 }}>하나를 버려야 하나를 할 수 있어.</div>
            </div>
          </div>

          {/* 2. 모드 */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[["작업 데이","work"],["인풋 데이","input"]].map(([l,v]) => (
              <button key={v} style={{ ...S.tab, ...(day.dayType===v ? S.tabOn : {}) }} onClick={() => upd({ dayType: v })}>{l}</button>
            ))}
          </div>

          {/* 3. 히어로 버튼 */}
          <div style={{ ...S.card, ...(day.heroUsed ? { background:"#111A14", border:"2px solid #3D6B4F" } : { border:"2px solid #C9A96E44" }), textAlign:"center" }}>
            {!day.heroUsed && <div style={{ fontSize:13, color:"#6B7280", marginBottom:14 }}>준비됐어?</div>}
            <button onClick={day.heroUsed ? undefined : startHero}
              style={{ background: day.heroUsed ? "#1A3325" : "#C9A96E", border:"none", borderRadius:14, padding:"17px 0", color: day.heroUsed ? "#7BC67E" : "#111318", fontSize:17, fontWeight:700, cursor: day.heroUsed ? "default" : "pointer", width:"100%" }}>
              {day.heroUsed ? "✓  시작했어" : "시작하자!"}
            </button>
            {!day.heroUsed && <div style={{ fontSize:11, color:"#4B5563", marginTop:10 }}>20분 착수 타이머 · 폰 내려놔도 돼</div>}
          </div>

          {/* 4a. 세션 (작업 데이) */}
          {day.dayType === "work" && (
            <div style={S.card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={S.label}>세션</div>
                <button onClick={() => setShowAddSession(true)} style={{ background:"#C9A96E18", border:"1px solid #C9A96E44", borderRadius:8, padding:"4px 10px", color:"#C9A96E", fontSize:12, cursor:"pointer" }}>+ 추가</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {day.sessions.map((s, i) => (
                  <div key={i} style={{ ...S.block, ...(s.done ? S.blockDone : {}) }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:14 }}>
                      <div style={S.chk} onClick={() => toggleDone(i)}>{s.done ? "✓" : ""}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, color:"#D1CEC8", fontWeight:500 }}>{s.type}</div>
                        {editDuration === i && !s.done
                          ? <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                              <input type="number" min="5" max="60" value={s.duration}
                                onChange={e => updateDuration(i, e.target.value)}
                                onBlur={() => setEditDuration(null)} autoFocus
                                style={{ width:48, background:"#1C1F27", border:"1px solid #C9A96E", borderRadius:6, padding:"2px 6px", color:"#C9A96E", fontSize:12, outline:"none" }} />
                              <span style={{ fontSize:11, color:"#6B7280" }}>분 (최대 60)</span>
                            </div>
                          : <div style={{ fontSize:12, color:"#6B7280", marginTop:2, cursor: !s.done && !s.running ? "pointer" : "default" }} onClick={() => !s.running && !s.done && setEditDuration(i)}>
                              {s.duration}분{!s.done && !s.running && <span style={{ color:"#C9A96E55", marginLeft:4 }}>✎</span>}
                            </div>
                        }
                      </div>
                      {!s.done && <Ring elapsed={s.elapsed} total={s.duration} running={s.running} />}
                    </div>
                    {!s.done && (
                      <div style={{ padding:"0 14px 12px", display:"flex", gap:8 }}>
                        <button style={{ ...S.timerBtn, ...(s.running ? S.timerBtnOn : {}) }} onClick={() => toggleTimer(i, true)}>
                          {s.running ? "⏸ 일시정지" : s.elapsed > 0 ? "▶ 계속" : "▶ 시작"}
                        </button>
                        <button style={S.doneBtn} onClick={() => toggleDone(i)}>완료</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {day.sessions.length >= 4 && <div style={{ fontSize:12, color:"#F97316", textAlign:"center", marginTop:12 }}>오버페이스 조심해.</div>}
            </div>
          )}

          {/* 4b. 인풋 데이 */}
          {day.dayType === "input" && (
            <div style={S.card}>
              <div style={S.label}>인풋 데이</div>
              <div style={{ fontSize:13, color:"#9CA3AF", marginBottom:14 }}>오늘 뭘 봤어?</div>
              {[{ key:"inputWatched", label:"드라마 · 영화 1편 봤다" }, { key:"inputMemo", label:'"이 장면 왜 좋지?" 메모 남겼다' }].map(({ key, label }, i) => (
                <div key={key} style={{ ...S.block, ...(day.proofs[key] ? S.blockDone : {}), marginBottom: i===0 ? 8 : 0 }} onClick={() => upd({ proofs: { ...day.proofs, [key]: !day.proofs[key] } })}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:14 }}>
                    <div style={S.chk}>{day.proofs[key] ? "✓" : ""}</div>
                    <div style={{ fontSize:14, color:"#D1CEC8" }}>{label}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize:12, color:"#6B7280", textAlign:"center", marginTop:12 }}>이것도 작업이야.</div>
            </div>
          )}

          {/* 5. 오늘의 해냄 */}
          <div style={S.card}>
            <div style={S.label}>오늘의 해냄</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {PROOF_ITEMS.map(({ key, label }) => (
                <div key={key} style={{ ...S.block, ...(day.proofs[key] ? S.blockDone : {}) }} onClick={() => toggleProof(key)}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px" }}>
                    <div style={S.chk}>{day.proofs[key] ? "✓" : ""}</div>
                    <div style={{ fontSize:14, color:"#D1CEC8" }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:"#6B7280", marginTop:10 }}>작은 것도 작업의 증거야.</div>
          </div>

          {/* 7. 한 줄 피드백 */}
          {isRoutineDone && (
            <div style={S.card}>
              <div style={S.label}>오늘 한 줄</div>
              <input style={S.input} placeholder="오늘 작업 어땠어?" value={day.feedback} onChange={e => upd({ feedback: e.target.value })} />
              <button onClick={() => setShowHistory(true)} style={{ background:"none", border:"none", color:"#C9A96E", fontSize:12, cursor:"pointer", marginTop:10, padding:0 }}>
                ↗ 지난 기록 보기
              </button>
            </div>
          )}

          {/* 8. 마지막 멘트 */}
          <div style={{ textAlign:"center", padding:"20px 0 8px", transition:"all 0.4s" }}>
            {isRoutineDone
              ? <div style={{ fontSize:14, fontWeight:700, color:"#F0EDE8", lineHeight:1.8 }}>넌 오늘도 창작자야. <span style={{ color:"#C9A96E" }}>잘 썼든 못 썼든.</span></div>
              : <div style={{ fontSize:14, color:"#6B7280", lineHeight:1.8 }}>창작자가 될 준비됐어?</div>
            }
          </div>
        </>}

        {/* ══ 아이디어 ══ */}
        {tab === "ideas" && <>
          <div style={S.card}>
            <div style={S.label}>지금 떠오른 거</div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input style={{ ...S.input, flex:1 }} placeholder="장면, 대사, 감정, 뭐든지" value={ideaInput} onChange={e => setIdeaInput(e.target.value)} onKeyDown={e => e.key==="Enter" && addIdea()} />
              <button onClick={addIdea} style={{ background:"#C9A96E", border:"none", borderRadius:10, padding:"0 18px", color:"#111318", fontSize:22, cursor:"pointer", fontWeight:700 }}>+</button>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => imageInputRef.current?.click()} style={{ background:"#111318", border:"1px solid #2A2D36", borderRadius:8, padding:"8px 14px", color:"#9CA3AF", fontSize:12, cursor:"pointer", flex:1 }}>📷 이미지</button>
              <button onClick={exportBackup} style={{ background:"#111318", border:"1px solid #2A2D36", borderRadius:8, padding:"8px 14px", color:"#9CA3AF", fontSize:12, cursor:"pointer", flex:1 }}>💾 백업</button>
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { addIdeaImage(e.target.files[0]); e.target.value=""; }} />
            <div style={{ fontSize:11, color:"#4B5563", marginTop:10 }}>완성 안 해도 돼. 일단 남겨.</div>
          </div>
          <div style={S.card}>
            <div style={S.label}>오늘 메모 ({day.ideas.length})</div>
            {day.ideas.length === 0
              ? <div style={{ fontSize:13, color:"#4B5563", textAlign:"center", padding:"20px 0" }}>아직 없어.</div>
              : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {day.ideas.map(idea => (
                    <div key={idea.id} style={{ background:"#111318", borderRadius:10, padding:"12px 14px", border:"1px solid #2A2D36" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                        <div style={{ flex:1 }}>
                          {idea.image && <img src={idea.image} alt="" style={{ width:"100%", borderRadius:8, marginBottom: idea.text ? 8 : 0, maxHeight:220, objectFit:"cover" }} />}
                          {idea.text && <div style={{ fontSize:14, color:"#D1CEC8", lineHeight:1.6 }}>{idea.text}</div>}
                          <div style={{ fontSize:11, color:"#4B5563", marginTop:4 }}>{idea.time}</div>
                        </div>
                        <button onClick={() => upd({ ideas: day.ideas.filter(id => id.id !== idea.id) })} style={{ background:"none", border:"none", color:"#4B5563", fontSize:18, cursor:"pointer", flexShrink:0, lineHeight:1 }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </>}

        {/* ══ 이번 주 ══ */}
        {tab === "week" && <>
          <div style={S.card}>
            <div style={S.label}>이번 주</div>
            <WeekDots weekData={meta.weekData} />
            <div style={{ display:"flex", gap:16, marginTop:14, fontSize:11, color:"#6B7280" }}>
              {[["작업 데이","#F97316"],["인풋 데이","#3B82F6"]].map(([l,bg]) => (
                <span key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ display:"inline-block", width:9, height:9, borderRadius:"50%", background:bg }} />{l}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ ...S.card, textAlign:"center" }}>
              <div style={{ fontSize:48, fontWeight:700, color:"#F0EDE8", lineHeight:1, padding:"8px 0" }}>{thisMonthCount}</div>
              <div style={{ fontSize:11, color:"#6B7280" }}>이번 달 돌아온 날</div>
              <div style={{ fontSize:11, color:"#4B5563", marginTop:6 }}>
                {thisMonthCount === 0 ? "오늘 시작하면 돼." : `${new Date().getMonth()+1}월에 ${thisMonthCount}번 앉았어.`}
              </div>
            </div>
            <div style={{ ...S.card, textAlign:"center" }}>
              <div style={{ fontSize:48, fontWeight:700, color:"#F0EDE8", lineHeight:1, padding:"8px 0" }}>
                {Object.entries(meta.weekData).filter(([k]) => (new Date()-new Date(k))/864e5 < 7).reduce((s,[,v]) => s+(typeof v==="number"?v:v?.count||0), 0)}
              </div>
              <div style={{ fontSize:11, color:"#6B7280" }}>이번 주 세션</div>
            </div>
          </div>
          <div style={{ ...S.card, textAlign:"center" }}>
            <button onClick={() => setShowHistory(true)} style={{ background:"none", border:"none", color:"#C9A96E", fontSize:14, cursor:"pointer" }}>↗ 지난 기록 모아보기</button>
          </div>
        </>}

      </div>
    </div>
  );
}

const S = {
  root: { minHeight:"100svh", background:"#111318", display:"flex", justifyContent:"center", padding:"env(safe-area-inset-top, 24px) 16px 64px", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif" },
  wrap: { width:"100%", maxWidth:420, display:"flex", flexDirection:"column", gap:14 },
  h1: { fontSize:26, fontWeight:700, color:"#F0EDE8", margin:0, letterSpacing:"-0.02em" },
  card: { background:"#1C1F27", borderRadius:16, padding:20, border:"1px solid #2A2D36" },
  label: { fontSize:11, fontWeight:600, color:"#C9A96E", letterSpacing:"0.08em", marginBottom:14, textTransform:"uppercase" },
  tab: { flex:1, background:"#1C1F27", border:"1px solid #2A2D36", borderRadius:10, padding:12, color:"#6B7280", fontSize:13, cursor:"pointer", fontFamily:"inherit" },
  tabOn: { background:"#C9A96E", border:"1px solid #C9A96E", color:"#111318", fontWeight:600 },
  input: { width:"100%", background:"#111318", border:"1px solid #2A2D36", borderRadius:10, padding:"12px 14px", color:"#F0EDE8", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  block: { background:"#111318", borderRadius:10, border:"1px solid #2A2D36", overflow:"hidden" },
  blockDone: { background:"#1A2820", border:"1px solid #3D6B4F" },
  chk: { width:22, height:22, borderRadius:6, background:"#1C1F27", border:"1px solid #3A3D46", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#7BC67E", flexShrink:0, cursor:"pointer" },
  timerBtn: { flex:1, background:"#1C1F27", border:"1px solid #2A2D36", borderRadius:8, padding:"8px 12px", color:"#9CA3AF", fontSize:12, cursor:"pointer", fontFamily:"inherit" },
  timerBtnOn: { background:"#C9A96E22", border:"1px solid #C9A96E44", color:"#C9A96E" },
  doneBtn: { background:"#1C1F27", border:"1px solid #2A2D36", borderRadius:8, padding:"8px 16px", color:"#6B7280", fontSize:12, cursor:"pointer", fontFamily:"inherit" },
};
