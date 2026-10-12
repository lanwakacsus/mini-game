const app = document.querySelector("#app");
const storageKey = "signal-sprint-session";
let session = readSession();
let state = null;
let pollTimer = null;
let roundTimer = null;
let lastRoundKey = "";

const roundArt = {
  bluff: `
    <svg viewBox="0 0 360 220" role="img" aria-label="Truth and lie signal graphic">
      <defs><linearGradient id="bluffGlow" x1="0" x2="1"><stop stop-color="#00d6a3"/><stop offset="1" stop-color="#ff4f7b"/></linearGradient></defs>
      <rect x="18" y="34" width="324" height="152" rx="26" fill="#101827"/>
      <path d="M68 154 C112 80 142 80 180 148 S254 202 304 76" fill="none" stroke="url(#bluffGlow)" stroke-width="14" stroke-linecap="round"/>
      <circle cx="82" cy="86" r="28" fill="#00d6a3"/><path d="M69 86 l9 10 19 -24" fill="none" stroke="#071018" stroke-width="8" stroke-linecap="round"/>
      <circle cx="278" cy="136" r="28" fill="#ff4f7b"/><path d="M266 124 l24 24 M290 124 l-24 24" stroke="#071018" stroke-width="8" stroke-linecap="round"/>
    </svg>`,
  storm: `
    <svg viewBox="0 0 360 220" role="img" aria-label="Answer storm graphic">
      <rect x="26" y="26" width="308" height="168" rx="30" fill="#11202b"/>
      <path d="M94 160 L140 58 h55 l-26 54 h60 l-93 78 24-62 h-66z" fill="#ffd166"/>
      <circle cx="82" cy="70" r="14" fill="#70d6ff"/><circle cx="279" cy="72" r="18" fill="#f7aef8"/>
      <rect x="226" y="132" width="60" height="18" rx="9" fill="#5ee6a8"/><rect x="68" y="132" width="48" height="18" rx="9" fill="#ff6b6b"/>
    </svg>`,
  combo: `
    <svg viewBox="0 0 360 220" role="img" aria-label="Combination lock graphic">
      <rect x="34" y="34" width="292" height="152" rx="28" fill="#111b2e"/>
      <g fill="none" stroke-width="10" stroke-linecap="round">
        <path d="M120 96 h120" stroke="#7cfcbd"/><path d="M120 132 h120" stroke="#7da5ff"/>
        <path d="M120 96 l-34 36 M240 96 l34 36" stroke="#ffcc66"/>
      </g>
      <circle cx="86" cy="132" r="24" fill="#ffcc66"/><circle cx="120" cy="96" r="24" fill="#7cfcbd"/><circle cx="240" cy="96" r="24" fill="#7da5ff"/><circle cx="274" cy="132" r="24" fill="#ff7e9f"/>
    </svg>`,
  finale: `
    <svg viewBox="0 0 360 220" role="img" aria-label="Finale target graphic">
      <rect x="28" y="26" width="304" height="168" rx="30" fill="#101827"/>
      <circle cx="180" cy="110" r="74" fill="#ff4f7b"/><circle cx="180" cy="110" r="52" fill="#ffd166"/><circle cx="180" cy="110" r="30" fill="#5ee6a8"/>
      <path d="M180 52 v116 M122 110 h116" stroke="#101827" stroke-width="8" stroke-linecap="round"/>
    </svg>`,
};

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || null;
  } catch {
    return null;
  }
}

function saveSession(next) {
  session = next;
  localStorage.setItem(storageKey, JSON.stringify(next));
}

function forgetSession() {
  session = null;
  localStorage.removeItem(storageKey);
}

async function api(path, body, method = "POST") {
  const response = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Something went wrong.");
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function points(value) {
  return Number(value || 0).toLocaleString();
}

function copyCode() {
  if (!state?.shareUrl) return;
  navigator.clipboard?.writeText(state.shareUrl);
}

function setError(message) {
  const target = document.querySelector("[data-error]");
  if (target) target.textContent = message || "";
}

async function createRoom(event) {
  event.preventDefault();
  const name = new FormData(event.currentTarget).get("name").trim();
  if (!name) return setError("Pick a player name first.");
  try {
    const result = await api("/api/create", { name });
    saveSession(result.session);
    state = result.state;
    startPolling();
    render();
  } catch (error) {
    setError(error.message);
  }
}

async function joinRoom(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = form.get("name").trim();
  const code = form.get("code").trim().toUpperCase();
  if (!name || !code) return setError("Enter your name and room code.");
  try {
    const result = await api("/api/join", { name, code });
    saveSession(result.session);
    state = result.state;
    startPolling();
    render();
  } catch (error) {
    setError(error.message);
  }
}

async function hostAction(action) {
  if (!session) return;
  try {
    const result = await api(`/api/${action}`, session);
    state = result.state;
    render();
  } catch (error) {
    setError(error.message);
  }
}

async function submitChoice(choiceId) {
  if (!session || state?.me?.submitted) return;
  try {
    const result = await api("/api/submit", { ...session, payload: { choiceId } });
    state = result.state;
    render();
  } catch (error) {
    setError(error.message);
  }
}

async function submitCombo() {
  const selected = [...document.querySelectorAll("[data-combo].is-selected")].map((button) => button.dataset.combo);
  if (!selected.length) return setError("Pick a combination first.");
  try {
    const result = await api("/api/submit", { ...session, payload: { selected } });
    state = result.state;
    render();
  } catch (error) {
    setError(error.message);
  }
}

async function submitAnswer(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const answer = input.value.trim();
  if (!answer) return;
  input.value = "";
  try {
    const result = await api("/api/submit", { ...session, payload: { answer } });
    state = result.state;
    render();
  } catch (error) {
    setError(error.message);
  }
}

function startPolling() {
  clearInterval(pollTimer);
  if (!session) return;
  poll();
  pollTimer = setInterval(poll, 900);
}

async function poll() {
  if (!session) return;
  try {
    const query = new URLSearchParams(session).toString();
    const result = await api(`/api/state?${query}`, null, "GET");
    state = result.state;
    render(false);
  } catch (error) {
    if (error.message.includes("Room not found")) {
      forgetSession();
      clearInterval(pollTimer);
      render();
    }
  }
}

function render(resetFocus = true) {
  if (!session || !state) return renderHome();
  const roundKey = `${state.phase}-${state.round?.number || 0}`;
  if (roundKey !== lastRoundKey) {
    lastRoundKey = roundKey;
    resetFocus = true;
  }
  const html = `
    <section class="topbar">
      <div>
        <p class="eyebrow">Signal Sprint</p>
        <h1>${state.code}</h1>
      </div>
      <div class="topbar-actions">
        <button class="icon-button" type="button" title="Copy invite link" data-copy>Copy link</button>
        <button class="ghost-button" type="button" data-leave>Leave</button>
      </div>
    </section>
    <section class="game-grid">
      <aside class="score-panel">
        <div class="section-label">Players</div>
        <ol class="score-list">
          ${state.players.map((player, index) => `
            <li class="${player.id === session.playerId ? "is-me" : ""}">
              <span class="rank">${index + 1}</span>
              <span class="player-name">${escapeHtml(player.name)}</span>
              <strong>${points(player.score)}</strong>
            </li>`).join("")}
        </ol>
      </aside>
      <section class="play-panel">
        ${renderPhase()}
      </section>
    </section>`;
  app.innerHTML = html;
  wireCommon();
  wirePhase();
  tickClock();
  if (resetFocus) document.querySelector("[autofocus]")?.focus();
}

function renderHome() {
  const sharedCode = new URLSearchParams(location.search).get("room")?.toUpperCase() || "";
  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Free-for-all party game</p>
        <h1>Signal Sprint</h1>
        <p>Race through deception, answer storms, and combo puzzles. Highest score wins after three rounds, with a sudden-death finale only when first place is tied.</p>
      </div>
      <div class="hero-art">${roundArt.bluff}</div>
    </section>
    <section class="join-grid">
      <form class="entry-panel" data-create-form>
        <h2>Create a room</h2>
        <label>Your name <input name="name" maxlength="18" autocomplete="nickname" autofocus /></label>
        <button type="submit">Create game</button>
      </form>
      <form class="entry-panel" data-join-form>
        <h2>Join a room</h2>
        <label>Your name <input name="name" maxlength="18" autocomplete="nickname" /></label>
        <label>Room code <input name="code" maxlength="5" inputmode="text" value="${escapeHtml(sharedCode)}" /></label>
        <button type="submit">Join game</button>
      </form>
    </section>
    <p class="form-error" data-error></p>`;
  document.querySelector("[data-create-form]").addEventListener("submit", createRoom);
  document.querySelector("[data-join-form]").addEventListener("submit", joinRoom);
}

function renderPhase() {
  if (state.phase === "lobby") return renderLobby();
  if (state.phase === "briefing") return renderBriefing();
  if (state.phase === "active") return renderActiveRound();
  if (state.phase === "results") return renderResults();
  return renderFinal();
}

function renderLobby() {
  return `
    <div class="round-layout">
      <div class="round-art">${roundArt.storm}</div>
      <div class="round-copy">
        <p class="eyebrow">Waiting room</p>
        <h2>Bring in at least two players.</h2>
        <p>Share room code <strong>${state.code}</strong>. Everyone plays solo from their own device.</p>
        <ul class="rules-list">
          <li>Round 1: pick the true signal fastest.</li>
          <li>Round 2: type as many valid answers as you can.</li>
          <li>Round 3: click the exact correct combination.</li>
          <li>A finale starts only if first place is tied.</li>
        </ul>
        ${state.me.isHost ? `<button data-host-action="start" ${state.players.length < 2 ? "disabled" : ""}>Start game</button>` : `<p class="waiting">The host starts when everyone is in.</p>`}
        <p class="form-error" data-error></p>
      </div>
    </div>`;
}

function renderBriefing() {
  const round = state.round;
  return `
    <div class="round-layout">
      <div class="round-art">${roundArt[round.kind]}</div>
      <div class="round-copy">
        <p class="eyebrow">Round ${round.number}</p>
        <h2>${escapeHtml(round.title)}</h2>
        <p>${escapeHtml(round.rule)}</p>
        ${state.me.isHost ? `<button data-host-action="start-round">Begin round</button>` : `<p class="waiting">Get ready. The host will begin the round.</p>`}
        <p class="form-error" data-error></p>
      </div>
    </div>`;
}

function renderActiveRound() {
  const round = state.round;
  const submitted = state.me.submitted;
  if (round.kind === "storm") return renderStorm(round);
  if (round.kind === "combo") return renderCombo(round, submitted);
  return renderChoiceRound(round, submitted);
}

function renderChoiceRound(round, submitted) {
  return `
    <div class="round-header">
      <div><p class="eyebrow">Round ${round.number}</p><h2>${escapeHtml(round.prompt)}</h2></div>
      <div class="clock" data-clock>${state.secondsLeft}s</div>
    </div>
    <div class="round-art slim">${roundArt[round.kind]}</div>
    <div class="choice-grid">
      ${round.choices.map((choice) => `
        <button class="choice-button" type="button" data-choice="${choice.id}" ${submitted ? "disabled" : ""}>
          <span>${escapeHtml(choice.label)}</span>
        </button>`).join("")}
    </div>
    ${submitted ? `<p class="submitted">Locked in. Faster correct picks score more.</p>` : ""}
    <p class="form-error" data-error></p>`;
}

function renderStorm(round) {
  return `
    <div class="round-header">
      <div><p class="eyebrow">Round ${round.number}</p><h2>${escapeHtml(round.prompt)}</h2></div>
      <div class="clock" data-clock>${state.secondsLeft}s</div>
    </div>
    <div class="round-art slim">${roundArt.storm}</div>
    <form class="answer-form" data-answer-form>
      <input name="answer" autocomplete="off" placeholder="Type an answer" autofocus />
      <button type="submit">Send</button>
    </form>
    <div class="chips">
      ${state.me.answers.map((answer) => `<span>${escapeHtml(answer)}</span>`).join("")}
    </div>
    <p class="submitted">${points(state.me.roundScore)} points this round so far.</p>
    <p class="form-error" data-error></p>`;
}

function renderCombo(round, submitted) {
  return `
    <div class="round-header">
      <div><p class="eyebrow">Round ${round.number}</p><h2>${escapeHtml(round.prompt)}</h2></div>
      <div class="clock" data-clock>${state.secondsLeft}s</div>
    </div>
    <div class="round-art slim">${roundArt.combo}</div>
    <div class="combo-grid">
      ${round.items.map((item) => `<button type="button" data-combo="${item.id}" ${submitted ? "disabled" : ""}>${escapeHtml(item.label)}</button>`).join("")}
    </div>
    <button class="wide-button" type="button" data-submit-combo ${submitted ? "disabled" : ""}>Lock combination</button>
    ${submitted ? `<p class="submitted">Combination locked.</p>` : `<p class="hint">Choose exactly ${round.need} items.</p>`}
    <p class="form-error" data-error></p>`;
}

function renderResults() {
  const round = state.round;
  return `
    <div class="round-layout">
      <div class="round-art">${roundArt[round.kind]}</div>
      <div class="round-copy">
        <p class="eyebrow">Round ${round.number} results</p>
        <h2>${escapeHtml(round.answerSummary)}</h2>
        <ol class="results-list">
          ${state.roundResults.map((row) => `<li><span>${escapeHtml(row.name)}</span><strong>+${points(row.points)}</strong></li>`).join("")}
        </ol>
        ${state.me.isHost ? `<button data-host-action="next">Continue</button>` : `<p class="waiting">Waiting for the host to continue.</p>`}
        <p class="form-error" data-error></p>
      </div>
    </div>`;
}

function renderFinal() {
  const winners = state.players.filter((player) => player.score === state.players[0].score);
  return `
    <div class="round-layout">
      <div class="round-art">${roundArt.finale}</div>
      <div class="round-copy">
        <p class="eyebrow">Final score</p>
        <h2>${winners.length > 1 ? "Shared victory" : `${escapeHtml(winners[0].name)} wins`}</h2>
        <p>${winners.map((winner) => escapeHtml(winner.name)).join(", ")} finished with ${points(winners[0].score)} points.</p>
        <ol class="results-list">
          ${state.players.map((player) => `<li><span>${escapeHtml(player.name)}</span><strong>${points(player.score)}</strong></li>`).join("")}
        </ol>
        ${state.me.isHost ? `<button data-host-action="reset">Play again</button>` : ""}
      </div>
    </div>`;
}

function wireCommon() {
  document.querySelector("[data-copy]")?.addEventListener("click", copyCode);
  document.querySelector("[data-leave]")?.addEventListener("click", () => {
    forgetSession();
    clearInterval(pollTimer);
    renderHome();
  });
}

function wirePhase() {
  document.querySelectorAll("[data-host-action]").forEach((button) => {
    button.addEventListener("click", () => hostAction(button.dataset.hostAction));
  });
  document.querySelectorAll("[data-choice]").forEach((button) => {
    button.addEventListener("click", () => submitChoice(button.dataset.choice));
  });
  document.querySelector("[data-answer-form]")?.addEventListener("submit", submitAnswer);
  document.querySelectorAll("[data-combo]").forEach((button) => {
    button.addEventListener("click", () => button.classList.toggle("is-selected"));
  });
  document.querySelector("[data-submit-combo]")?.addEventListener("click", submitCombo);
}

function tickClock() {
  clearInterval(roundTimer);
  const clock = document.querySelector("[data-clock]");
  if (!clock || !state.endsAt) return;
  roundTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
    clock.textContent = `${remaining}s`;
  }, 200);
}

if (session) startPolling();
else renderHome();
