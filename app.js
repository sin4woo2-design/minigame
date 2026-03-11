const STORE_KEY = "minigame_mvp_v1";
const PAYMENT_CONFIG = {
  checkoutEndpoint: "https://api.example.com/payments/checkout-session",
  verifyEndpoint: "https://api.example.com/payments/verify",
};

const state = loadState();
let currentGame = "tapDash";

const gameArea = document.getElementById("gameArea");
const premiumState = document.getElementById("premiumState");
const playerState = document.getElementById("playerState");
const playerNameInput = document.getElementById("playerName");
const leaderboardList = document.getElementById("leaderboardList");
const leaderboardGame = document.getElementById("leaderboardGame");
const themeSelect = document.getElementById("themeSelect");

init();

function init() {
  bindUI();
  applyTheme(state.theme);
  renderStatus();
  renderGame();
  renderLeaderboard();
}

function bindUI() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentGame = btn.dataset.game;
      renderGame();
    });
  });

  document.getElementById("saveNameBtn").addEventListener("click", () => {
    const v = playerNameInput.value.trim();
    state.playerName = v || "Guest";
    persist();
    renderStatus();
  });

  document.getElementById("premiumBtn").addEventListener("click", async () => {
    // 결제 훅 포인트 (실서비스에서는 서버 연동)
    // await startCheckout();
    state.premium = true; // demo unlock
    persist();
    renderStatus();
    alert("Premium unlocked (demo)");
  });

  themeSelect.value = state.theme;
  themeSelect.addEventListener("change", () => {
    const selected = themeSelect.value;
    if (["neon", "pastel"].includes(selected) && !state.premium) {
      alert("Premium theme. Unlock for $1.");
      themeSelect.value = state.theme;
      return;
    }
    state.theme = selected;
    persist();
    applyTheme(state.theme);
  });

  leaderboardGame.addEventListener("change", renderLeaderboard);
}

async function startCheckout() {
  const res = await fetch(PAYMENT_CONFIG.checkoutEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sku: "premium_pack_1usd",
      playerId: state.playerName,
      successUrl: window.location.href,
      cancelUrl: window.location.href,
    }),
  });
  const data = await res.json();
  if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
}

function renderStatus() {
  premiumState.textContent = state.premium ? "Yes" : "No";
  playerState.textContent = state.playerName;
  playerNameInput.value = state.playerName === "Guest" ? "" : state.playerName;
}

function renderGame() {
  if (currentGame === "tapDash") renderTapDash();
  if (currentGame === "memoryFlip") renderMemoryFlip();
  if (currentGame === "colorRush") renderColorRush();
}

function renderTapDash() {
  gameArea.innerHTML = `
    <h2>Tap Dash</h2>
    <p class="muted">Click moving targets for 20 seconds.</p>
    <button id="tapStart">Start</button>
    <p>Time: <span id="tapTime">20</span> | Score: <span id="tapScore">0</span></p>
    <div class="tap-field" id="tapField"></div>
  `;
  const tapStart = document.getElementById("tapStart");
  const tapTime = document.getElementById("tapTime");
  const tapScore = document.getElementById("tapScore");
  const tapField = document.getElementById("tapField");

  tapStart.onclick = () => {
    let time = 20;
    let score = 0;
    tapScore.textContent = "0";
    tapTime.textContent = "20";

    const spawn = () => {
      tapField.innerHTML = "";
      const t = document.createElement("button");
      t.className = "target";
      const x = Math.random() * (tapField.clientWidth - 42);
      const y = Math.random() * (tapField.clientHeight - 42);
      t.style.left = `${x}px`;
      t.style.top = `${y}px`;
      t.onclick = () => {
        score += 1;
        tapScore.textContent = String(score);
        spawn();
      };
      tapField.appendChild(t);
    };

    spawn();
    const timer = setInterval(() => {
      time -= 1;
      tapTime.textContent = String(time);
      if (time <= 0) {
        clearInterval(timer);
        tapField.innerHTML = "";
        submitScore("tapDash", score);
        alert(`Finished! Score: ${score}`);
      }
    }, 1000);
  };
}

function renderMemoryFlip() {
  const symbols = ["🍎", "🍌", "🍇", "🍒", "🍋", "🥝", "🍑", "🍉"];
  const deck = [...symbols, ...symbols].sort(() => Math.random() - 0.5);

  gameArea.innerHTML = `
    <h2>Memory Flip</h2>
    <p class="muted">Match all pairs as fast as possible.</p>
    <button id="memStart">Start</button>
    <p>Time: <span id="memTime">0</span>s | Matches: <span id="memMatches">0</span>/8</p>
    <div class="memory-grid" id="memGrid"></div>
  `;

  const memStart = document.getElementById("memStart");
  const memGrid = document.getElementById("memGrid");
  const memTime = document.getElementById("memTime");
  const memMatches = document.getElementById("memMatches");

  memStart.onclick = () => {
    let open = [];
    let locked = false;
    let matches = 0;
    let sec = 0;
    memMatches.textContent = "0";
    memGrid.innerHTML = "";

    const timer = setInterval(() => {
      sec += 1;
      memTime.textContent = String(sec);
    }, 1000);

    deck.forEach((sym, i) => {
      const card = document.createElement("div");
      card.className = "memory-card";
      card.dataset.index = String(i);
      card.dataset.symbol = sym;
      card.textContent = "?";
      card.onclick = () => {
        if (locked || card.classList.contains("open") || open.includes(card)) return;
        card.classList.add("open");
        card.textContent = sym;
        open.push(card);

        if (open.length === 2) {
          const [a, b] = open;
          if (a.dataset.symbol === b.dataset.symbol) {
            matches += 1;
            memMatches.textContent = String(matches);
            open = [];
            if (matches === 8) {
              clearInterval(timer);
              const score = Math.max(1, 200 - sec * 5);
              submitScore("memoryFlip", score);
              alert(`Clear! Time ${sec}s · Score ${score}`);
            }
          } else {
            locked = true;
            setTimeout(() => {
              a.classList.remove("open");
              b.classList.remove("open");
              a.textContent = "?";
              b.textContent = "?";
              open = [];
              locked = false;
            }, 700);
          }
        }
      };
      memGrid.appendChild(card);
    });
  };
}

function renderColorRush() {
  const colors = ["red", "blue", "green", "purple", "orange"];
  gameArea.innerHTML = `
    <h2>Color Rush</h2>
    <p class="muted">Click the FONT color, not the text word. 30 seconds.</p>
    <button id="colorStart">Start</button>
    <p>Time: <span id="colorTime">30</span> | Score: <span id="colorScore">0</span></p>
    <h3 id="colorPrompt">Ready?</h3>
    <div class="color-options" id="colorOptions"></div>
  `;

  const colorStart = document.getElementById("colorStart");
  const colorTime = document.getElementById("colorTime");
  const colorScore = document.getElementById("colorScore");
  const colorPrompt = document.getElementById("colorPrompt");
  const colorOptions = document.getElementById("colorOptions");

  colorOptions.innerHTML = colors
    .map((c) => `<button class="color-btn" data-color="${c}">${c}</button>`)
    .join("");

  colorStart.onclick = () => {
    let time = 30;
    let score = 0;
    let answer = "";

    const next = () => {
      const word = colors[Math.floor(Math.random() * colors.length)];
      answer = colors[Math.floor(Math.random() * colors.length)];
      colorPrompt.textContent = word.toUpperCase();
      colorPrompt.style.color = answer;
    };

    next();
    const timer = setInterval(() => {
      time -= 1;
      colorTime.textContent = String(time);
      if (time <= 0) {
        clearInterval(timer);
        submitScore("colorRush", score);
        alert(`Finished! Score: ${score}`);
      }
    }, 1000);

    colorOptions.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        if (btn.dataset.color === answer) score += 2;
        else score = Math.max(0, score - 1);
        colorScore.textContent = String(score);
        next();
      };
    });
  };
}

function submitScore(game, score) {
  const entry = {
    name: state.playerName || "Guest",
    score,
    at: Date.now(),
  };
  state.scores[game] = state.scores[game] || [];
  state.scores[game].push(entry);
  state.scores[game] = state.scores[game]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  persist();
  renderLeaderboard();
}

function renderLeaderboard() {
  const game = leaderboardGame.value;
  const list = state.scores[game] || [];
  leaderboardList.innerHTML = list.length
    ? list
        .map((r) => `<li>${escapeHtml(r.name)} — <strong>${r.score}</strong></li>`)
        .join("")
    : "<li>No score yet</li>";
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw)
      return {
        playerName: "Guest",
        premium: false,
        theme: "classic",
        scores: { tapDash: [], memoryFlip: [], colorRush: [] },
      };
    return JSON.parse(raw);
  } catch {
    return {
      playerName: "Guest",
      premium: false,
      theme: "classic",
      scores: { tapDash: [], memoryFlip: [], colorRush: [] },
    };
  }
}

function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
