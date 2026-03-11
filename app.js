const STORE_KEY = "tap_dash_arena_v5";
const state = load();
let audio = null;
let runActive = false;

const SKINS = [
  { id: "classic", name: "Classic", coin: 0, premium: false },
  { id: "neon", name: "Neon Pulse", coin: 300, premium: true },
  { id: "gold", name: "Gold Rush", coin: 500, premium: true },
  { id: "blossom", name: "Blossom", coin: 250, premium: false },
];
const MISSIONS = [
  { id: "play3", label: "Play 3 runs", goal: 3, reward: 80 },
  { id: "score180", label: "Reach score 180", goal: 1, reward: 160 },
  { id: "combo12", label: "Reach combo x12", goal: 1, reward: 130 },
];

const el = {
  premiumBtn: byId("premiumBtn"), playerLabel: byId("playerLabel"), coinLabel: byId("coinLabel"), bestLabel: byId("bestLabel"), streakLabel: byId("streakLabel"),
  playerInput: byId("playerInput"), savePlayerBtn: byId("savePlayerBtn"), muteBtn: byId("muteBtn"),
  startBtn: byId("startBtn"), timeLabel: byId("timeLabel"), scoreLabel: byId("scoreLabel"), comboLabel: byId("comboLabel"), missLabel: byId("missLabel"),
  comboBanner: byId("comboBanner"), arena: byId("arena"), missionList: byId("missionList"), skinList: byId("skinList"), rankList: byId("rankList"),
  resultModal: byId("resultModal"), gradeText: byId("gradeText"), resultScore: byId("resultScore"), resultCoins: byId("resultCoins"), retryBtn: byId("retryBtn"),
  gameSection: document.querySelector("section.game"),
  tabs: [...document.querySelectorAll(".tab")], panels: [...document.querySelectorAll(".panel")],
};

init();

function init() {
  bind();
  refreshStreak();
  renderAll();
  if (el.gameSection) el.gameSection.style.display = "block";
}

function bind() {
  el.savePlayerBtn.onclick = () => { state.playerName = el.playerInput.value.trim() || "Guest"; save(); renderTop(); };
  el.premiumBtn.onclick = () => { state.premium = true; save(); renderTop(); toast("Premium unlocked (demo)"); };
  el.muteBtn.onclick = () => { state.muted = !state.muted; save(); renderTop(); };
  el.startBtn.onclick = () => { if (runActive) return; ensureAudio(); startRun(); };
  el.retryBtn.onclick = () => { closeModal(); startRun(); };

  el.tabs.forEach((tab) => {
    tab.onclick = () => {
      const key = tab.dataset.panel;
      el.tabs.forEach((t) => t.classList.toggle("active", t === tab));
      el.panels.forEach((p) => p.classList.toggle("active", p.id === `panel-${key}`));
      if (el.gameSection) {
        el.gameSection.style.display = key === "play" ? "block" : "none";
      }
    };
  });
}

function renderAll() { renderTop(); renderMissions(); renderShop(); renderRank(); }
function renderTop() {
  el.playerLabel.textContent = state.playerName;
  el.coinLabel.textContent = state.coins;
  el.bestLabel.textContent = state.bestScore;
  el.streakLabel.textContent = `${state.streak}🔥`;
  el.playerInput.value = state.playerName === "Guest" ? "" : state.playerName;
  el.premiumBtn.textContent = state.premium ? "Premium Active ✅" : "Unlock Premium";
  el.muteBtn.textContent = state.muted ? "🔇" : "🔊";
}

function startRun() {
  runActive = true;
  el.startBtn.disabled = true;
  closeModal();

  let time = 45, score = 0, combo = 1, miss = 0, targetSize = 56, target = null;
  el.arena.innerHTML = "";
  banner("");
  sync();
  spawn();

  const timer = setInterval(() => {
    time -= 1;
    if (time % 7 === 0 && targetSize > 34) targetSize -= 3;
    if (time <= 10) banner(`⏱ ${time}s LEFT`);
    sync();
    if (time <= 0 || miss >= 5) {
      clearInterval(timer);
      if (target) target.remove();
      finish(score);
    }
  }, 1000);

  function spawn() {
    if (!runActive) return;
    if (target) target.remove();
    const bonus = Math.random() < 0.18;
    target = document.createElement("button");
    target.className = `target ${bonus ? "bonus" : ""}`;
    target.style.width = `${targetSize}px`;
    target.style.height = `${targetSize}px`;

    const maxX = Math.max(2, el.arena.clientWidth - targetSize - 2);
    const maxY = Math.max(2, el.arena.clientHeight - targetSize - 2);
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;

    let clicked = false;
    const vanish = Math.max(360, 1050 - combo * 35);

    target.onclick = () => {
      if (!runActive) return;
      clicked = true;
      const gain = bonus ? Math.floor(10 * combo) : Math.floor(4 * combo);
      score += gain; combo += 1;
      if (combo >= 12) progressMission("combo12", 1);
      if (combo === 5) banner("NICE COMBO x5");
      if (combo === 10) banner("INSANE x10 🔥");
      popScore(x + targetSize / 2, y + 10, `+${gain}`, bonus);
      burst(x + targetSize / 2, y + targetSize / 2, bonus ? 12 : 8, bonus);
      sound(bonus ? "bonus" : "hit", combo);
      sync();
      spawn();
    };

    el.arena.appendChild(target);

    setTimeout(() => {
      if (!runActive || clicked || time <= 0) return;
      miss += 1; combo = 1; sound("miss"); sync(); spawn();
    }, vanish);
  }

  function sync() {
    el.timeLabel.textContent = time;
    el.scoreLabel.textContent = score;
    el.comboLabel.textContent = `x${combo}`;
    el.missLabel.textContent = miss;
  }
}

function finish(score) {
  runActive = false;
  el.startBtn.disabled = false;
  const coin = Math.floor(score / 7) + 12;
  state.coins += coin;
  state.bestScore = Math.max(state.bestScore, score);
  state.runs += 1;
  progressMission("play3", 1);
  if (score >= 180) progressMission("score180", 1);
  state.ranking.push({ name: state.playerName, score, at: Date.now() });
  state.ranking = state.ranking.sort((a, b) => b.score - a.score).slice(0, 20);
  save();
  renderAll();
  openResult(score, coin);
  sound("finish");
}

function renderMissions() {
  ensureMissionDay();
  el.missionList.innerHTML = MISSIONS.map((m) => {
    const p = state.missions[m.id] || { value: 0, claimed: false };
    const done = p.value >= m.goal;
    return `<li class="mission-item ${done ? "done" : ""}"><div><strong>${m.label}</strong></div><div>${Math.min(p.value, m.goal)}/${m.goal} · reward ${m.reward}</div><button data-claim="${m.id}" ${!done || p.claimed ? "disabled" : ""}>${p.claimed ? "Claimed" : "Claim"}</button></li>`;
  }).join("");
  el.missionList.querySelectorAll("button[data-claim]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.claim; const m = MISSIONS.find((x) => x.id === id); const p = state.missions[id];
      if (!m || !p || p.claimed || p.value < m.goal) return;
      p.claimed = true; state.coins += m.reward; save(); renderAll();
    };
  });
}

function renderShop() {
  el.skinList.innerHTML = SKINS.map((s) => {
    const owned = state.ownedSkins.includes(s.id);
    const eq = state.skin === s.id;
    const locked = s.premium && !state.premium;
    let btn = eq ? `<button disabled>Equipped</button>` : owned ? `<button data-equip="${s.id}">Equip</button>` : locked ? `<button disabled>Premium only</button>` : `<button data-buy="${s.id}">Buy ${s.coin}</button>`;
    return `<div class="skin-item"><strong>${s.name}</strong><div class="muted">${s.premium ? "Premium" : "Standard"}</div>${btn}</div>`;
  }).join("");

  el.skinList.querySelectorAll("button[data-buy]").forEach((b) => b.onclick = () => {
    const skin = SKINS.find((s) => s.id === b.dataset.buy);
    if (!skin) return;
    if (state.coins < skin.coin) return toast("Not enough coins");
    state.coins -= skin.coin; state.ownedSkins.push(skin.id); state.skin = skin.id; save(); renderAll();
  });

  el.skinList.querySelectorAll("button[data-equip]").forEach((b) => b.onclick = () => {
    state.skin = b.dataset.equip; save(); renderAll();
  });
}

function renderRank() {
  el.rankList.innerHTML = state.ranking.length ? state.ranking.slice(0, 10).map((r) => `<li>${esc(r.name)} — <b>${r.score}</b></li>`).join("") : "<li>No score yet</li>";
}

function progressMission(id, delta) { ensureMissionDay(); state.missions[id] = state.missions[id] || { value: 0, claimed: false }; state.missions[id].value += delta; }
function ensureMissionDay() { const d = dayKey(); if (state.missionDay !== d) { state.missionDay = d; state.missions = {}; MISSIONS.forEach((m) => state.missions[m.id] = { value: 0, claimed: false }); } }
function refreshStreak() { const t = dayKey(); if (state.lastOpenDay === t) return; const y = dayKey(Date.now() - 86400000); state.streak = state.lastOpenDay === y ? state.streak + 1 : 1; state.lastOpenDay = t; state.coins += 15; save(); }

function grade(score) { if (score >= 650) return "S"; if (score >= 480) return "A"; if (score >= 320) return "B"; if (score >= 180) return "C"; return "D"; }
function openResult(score, coin) { el.gradeText.textContent = `${grade(score)} Rank`; el.resultScore.textContent = `Score ${score}`; el.resultCoins.textContent = `+${coin} coins`; el.resultModal.classList.remove("hidden"); }
function closeModal() { el.resultModal.classList.add("hidden"); }
function banner(text) { el.comboBanner.textContent = text; }
function popScore(x, y, text, bonus) { const n = document.createElement("div"); n.className = "float-score"; n.textContent = text; n.style.left = `${x}px`; n.style.top = `${y}px`; n.style.color = bonus ? "#ffe7a5" : "#d8f8ff"; el.arena.appendChild(n); setTimeout(() => n.remove(), 560); }
function burst(x, y, count, bonus) { for (let i = 0; i < count; i++) { const p = document.createElement("div"); p.className = "particle"; p.style.left = `${x}px`; p.style.top = `${y}px`; p.style.background = bonus ? "#ffe9a8" : "#bef4ff"; const a = Math.random() * Math.PI * 2; const d = 12 + Math.random() * 34; p.style.setProperty("--dx", `${Math.cos(a) * d}px`); p.style.setProperty("--dy", `${Math.sin(a) * d}px`); el.arena.appendChild(p); setTimeout(() => p.remove(), 500); } }

function ensureAudio() { if (!audio) audio = { ctx: new (window.AudioContext || window.webkitAudioContext)() }; }
function sound(type, v = 0) {
  if (state.muted || !audio) return;
  const { ctx } = audio, now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.connect(gain).connect(ctx.destination);
  if (type === "hit") { osc.type = "triangle"; osc.frequency.setValueAtTime(Math.min(900, 240 + v * 10), now); gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.08, now + .01); gain.gain.exponentialRampToValueAtTime(0.0001, now + .08); osc.start(now); osc.stop(now + .09); }
  else if (type === "bonus") { osc.type = "sine"; osc.frequency.setValueAtTime(520, now); osc.frequency.exponentialRampToValueAtTime(940, now + .12); gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.12, now + .02); gain.gain.exponentialRampToValueAtTime(0.0001, now + .16); osc.start(now); osc.stop(now + .17); }
  else if (type === "miss") { osc.type = "sawtooth"; osc.frequency.setValueAtTime(220, now); osc.frequency.exponentialRampToValueAtTime(120, now + .16); gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(0.09, now + .02); gain.gain.exponentialRampToValueAtTime(0.0001, now + .18); osc.start(now); osc.stop(now + .19); }
  else if (type === "finish") { [480, 600, 740].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "triangle"; o.frequency.setValueAtTime(f, now + i * .09); o.connect(g).connect(ctx.destination); g.gain.setValueAtTime(0.0001, now + i * .09); g.gain.exponentialRampToValueAtTime(0.09, now + i * .09 + .01); g.gain.exponentialRampToValueAtTime(0.0001, now + i * .09 + .14); o.start(now + i * .09); o.stop(now + i * .09 + .15); }); }
}

function load() { try { const r = localStorage.getItem(STORE_KEY); if (r) return JSON.parse(r); } catch {} return { playerName: "Guest", premium: false, muted: false, coins: 120, bestScore: 0, runs: 0, streak: 0, lastOpenDay: null, missionDay: null, missions: {}, ranking: [], ownedSkins: ["classic"], skin: "classic" }; }
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function byId(id) { return document.getElementById(id); }
function dayKey(ts = Date.now()) { return new Date(ts).toISOString().slice(0, 10); }
function esc(v) { return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
function toast(msg) { alert(msg); }
