const STORE_KEY = "tap_dash_arena_v3";
const state = load();

const SKINS = [
  { id: "classic", name: "Classic", coin: 0, premium: false },
  { id: "neon", name: "Neon Pulse", coin: 300, premium: true },
  { id: "gold", name: "Gold Rush", coin: 500, premium: true },
  { id: "blossom", name: "Blossom", coin: 250, premium: false },
];

const MISSIONS = [
  { id: "play3", label: "Play 3 runs", goal: 3, reward: 80 },
  { id: "score150", label: "Reach score 150 in one run", goal: 1, reward: 140 },
  { id: "combo10", label: "Reach combo x10", goal: 1, reward: 120 },
];

const el = {
  premiumBtn: byId("premiumBtn"),
  playerLabel: byId("playerLabel"),
  coinLabel: byId("coinLabel"),
  bestLabel: byId("bestLabel"),
  streakLabel: byId("streakLabel"),
  playerInput: byId("playerInput"),
  savePlayerBtn: byId("savePlayerBtn"),
  startBtn: byId("startBtn"),
  timeLabel: byId("timeLabel"),
  scoreLabel: byId("scoreLabel"),
  comboLabel: byId("comboLabel"),
  missLabel: byId("missLabel"),
  arena: byId("arena"),
  missionList: byId("missionList"),
  skinList: byId("skinList"),
  rankList: byId("rankList"),
};

init();

function init() {
  bind();
  refreshStreak();
  renderAll();
}

function bind() {
  el.savePlayerBtn.onclick = () => {
    state.playerName = el.playerInput.value.trim() || "Guest";
    save();
    renderTop();
  };

  el.premiumBtn.onclick = () => {
    state.premium = true; // TODO: Stripe checkout 연동
    save();
    renderTop();
    toast("Premium unlocked (demo)");
  };

  el.startBtn.onclick = startRun;
}

function renderAll() {
  renderTop();
  renderMissions();
  renderShop();
  renderRank();
  applySkin();
}

function renderTop() {
  el.playerLabel.textContent = state.playerName;
  el.coinLabel.textContent = String(state.coins);
  el.bestLabel.textContent = String(state.bestScore);
  el.streakLabel.textContent = `${state.streak}🔥`;
  el.playerInput.value = state.playerName === "Guest" ? "" : state.playerName;
  el.premiumBtn.textContent = state.premium ? "Premium Active ✅" : "Unlock Premium ($0.99)";
}

function startRun() {
  let time = 45;
  let score = 0;
  let combo = 1;
  let miss = 0;
  let targetSize = 56;
  let activeTarget = null;

  el.arena.innerHTML = "";
  syncHud();
  spawnTarget();

  const timer = setInterval(() => {
    time -= 1;
    if (time % 7 === 0 && targetSize > 34) targetSize -= 3;
    syncHud();

    if (time <= 0 || miss >= 5) {
      clearInterval(timer);
      if (activeTarget) activeTarget.remove();
      finishRun(score);
    }
  }, 1000);

  function spawnTarget() {
    if (activeTarget) activeTarget.remove();

    const bonus = Math.random() < 0.16;
    const t = document.createElement("button");
    t.className = `target ${bonus ? "bonus" : ""}`;
    t.style.width = `${targetSize}px`;
    t.style.height = `${targetSize}px`;

    const maxX = Math.max(1, el.arena.clientWidth - targetSize);
    const maxY = Math.max(1, el.arena.clientHeight - targetSize);
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    t.style.left = `${x}px`;
    t.style.top = `${y}px`;

    let clicked = false;
    const vanishMs = Math.max(390, 1050 - combo * 35);

    t.onclick = () => {
      clicked = true;
      const gain = bonus ? Math.floor(8 * combo) : Math.floor(4 * combo);
      score += gain;
      combo += 1;

      if (combo >= 10) progressMission("combo10", 1);
      popScore(x + targetSize / 2, y + 8, `+${gain}`);
      burst(x + targetSize / 2, y + targetSize / 2, bonus ? 10 : 7);

      syncHud();
      spawnTarget();
    };

    el.arena.appendChild(t);
    activeTarget = t;

    setTimeout(() => {
      if (clicked || time <= 0) return;
      miss += 1;
      combo = 1;
      syncHud();
      spawnTarget();
    }, vanishMs);
  }

  function syncHud() {
    el.timeLabel.textContent = String(time);
    el.scoreLabel.textContent = String(score);
    el.comboLabel.textContent = `x${combo}`;
    el.missLabel.textContent = String(miss);
  }
}

function finishRun(score) {
  const coinReward = Math.floor(score / 7) + 12;
  state.coins += coinReward;
  state.bestScore = Math.max(state.bestScore, score);
  state.runs += 1;

  progressMission("play3", 1);
  if (score >= 150) progressMission("score150", 1);

  state.ranking.push({ name: state.playerName, score, at: Date.now() });
  state.ranking = state.ranking.sort((a, b) => b.score - a.score).slice(0, 20);

  save();
  renderAll();
  toast(`Run done · Score ${score} · +${coinReward} coins`);
}

function popScore(x, y, text) {
  const n = document.createElement("div");
  n.className = "float-score";
  n.textContent = text;
  n.style.left = `${x}px`;
  n.style.top = `${y}px`;
  el.arena.appendChild(n);
  setTimeout(() => n.remove(), 560);
}

function burst(x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    const ang = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 34;
    p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
    p.style.setProperty("--dy", `${Math.sin(ang) * dist}px`);
    el.arena.appendChild(p);
    setTimeout(() => p.remove(), 480);
  }
}

function renderMissions() {
  ensureMissionDay();
  el.missionList.innerHTML = MISSIONS.map((m) => {
    const p = state.missions[m.id] || { value: 0, claimed: false };
    const done = p.value >= m.goal;
    return `<li class="mission-item ${done ? "done" : ""}">
      <div><strong>${m.label}</strong></div>
      <div>${Math.min(p.value, m.goal)}/${m.goal} · reward ${m.reward} coins</div>
      <button data-claim="${m.id}" ${!done || p.claimed ? "disabled" : ""}>${p.claimed ? "Claimed" : "Claim"}</button>
    </li>`;
  }).join("");

  el.missionList.querySelectorAll("button[data-claim]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.claim;
      const mission = MISSIONS.find((m) => m.id === id);
      const prog = state.missions[id];
      if (!mission || !prog || prog.claimed || prog.value < mission.goal) return;
      prog.claimed = true;
      state.coins += mission.reward;
      save();
      renderAll();
    };
  });
}

function progressMission(id, delta) {
  ensureMissionDay();
  state.missions[id] = state.missions[id] || { value: 0, claimed: false };
  state.missions[id].value += delta;
}

function ensureMissionDay() {
  const today = dayKey();
  if (state.missionDay !== today) {
    state.missionDay = today;
    state.missions = {};
    MISSIONS.forEach((m) => (state.missions[m.id] = { value: 0, claimed: false }));
  }
}

function renderShop() {
  el.skinList.innerHTML = SKINS.map((s) => {
    const owned = state.ownedSkins.includes(s.id);
    const equipped = state.skin === s.id;
    const lockedPremium = s.premium && !state.premium;

    let btn = "";
    if (equipped) btn = `<button disabled>Equipped</button>`;
    else if (owned) btn = `<button data-equip="${s.id}">Equip</button>`;
    else if (lockedPremium) btn = `<button disabled>Premium only</button>`;
    else btn = `<button data-buy="${s.id}">Buy ${s.coin} coins</button>`;

    return `<div class="skin-item">
      <strong>${s.name}</strong>
      <div class="muted">${s.premium ? "Premium" : "Free line"}</div>
      ${btn}
    </div>`;
  }).join("");

  el.skinList.querySelectorAll("button[data-buy]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.buy;
      const skin = SKINS.find((s) => s.id === id);
      if (!skin) return;
      if (state.coins < skin.coin) return toast("Not enough coins");
      state.coins -= skin.coin;
      state.ownedSkins.push(id);
      state.skin = id;
      save();
      renderAll();
    };
  });

  el.skinList.querySelectorAll("button[data-equip]").forEach((btn) => {
    btn.onclick = () => {
      state.skin = btn.dataset.equip;
      save();
      renderAll();
    };
  });
}

function renderRank() {
  el.rankList.innerHTML = state.ranking.length
    ? state.ranking.slice(0, 10).map((r) => `<li>${esc(r.name)} — <b>${r.score}</b></li>`).join("")
    : "<li>No score yet</li>";
}

function applySkin() { document.body.dataset.skin = state.skin; }

function refreshStreak() {
  const today = dayKey();
  if (state.lastOpenDay === today) return;
  const y = dayKey(Date.now() - 86400000);
  state.streak = state.lastOpenDay === y ? state.streak + 1 : 1;
  state.lastOpenDay = today;
  state.coins += 15;
  save();
}

function toast(msg) {
  alert(msg);
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    playerName: "Guest",
    premium: false,
    coins: 120,
    bestScore: 0,
    runs: 0,
    streak: 0,
    lastOpenDay: null,
    missionDay: null,
    missions: {},
    ranking: [],
    ownedSkins: ["classic"],
    skin: "classic",
  };
}

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function byId(id) { return document.getElementById(id); }
function dayKey(ts = Date.now()) { return new Date(ts).toISOString().slice(0, 10); }
function esc(v) {
  return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
