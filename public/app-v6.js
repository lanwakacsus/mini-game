const app = document.querySelector("#app");
const buildVersion = "v6-arcade-backdrop";
const storageKey = "signal-sprint-session";
let session = readSession();
let state = null;
let pollTimer = null;
let roundTimer = null;
let lastRoundKey = "";
let lastRenderSignature = "";
const comboSelections = new Map();
const jumbleSelections = new Map();

const roundArt = {
  bluff: `
    <svg class="round-svg bluff-svg" viewBox="0 0 360 220" role="img" aria-label="Truth and lie signal graphic">
      <defs>
        <linearGradient id="bluffGlow" x1="0" x2="1"><stop stop-color="#00d6a3"/><stop offset="1" stop-color="#ff4f7b"/></linearGradient>
        <filter id="softGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect class="art-card" x="18" y="34" width="324" height="152" rx="26" fill="#101827"/>
      <g class="signal-lines" opacity=".45">
        <path d="M48 62 h48 M264 62 h48 M46 176 h62 M246 176 h68" stroke="#70d6ff" stroke-width="5" stroke-linecap="round"/>
      </g>
      <path class="truth-wave" d="M68 154 C112 80 142 80 180 148 S254 202 304 76" fill="none" stroke="url(#bluffGlow)" stroke-width="14" stroke-linecap="round" filter="url(#softGlow)"/>
      <g class="truth-node">
        <circle cx="82" cy="86" r="28" fill="#00d6a3"/><path d="M69 86 l9 10 19 -24" fill="none" stroke="#071018" stroke-width="8" stroke-linecap="round"/>
      </g>
      <g class="lie-node">
        <circle cx="278" cy="136" r="28" fill="#ff4f7b"/><path d="M266 124 l24 24 M290 124 l-24 24" stroke="#071018" stroke-width="8" stroke-linecap="round"/>
      </g>
      <circle class="ping-dot ping-one" cx="180" cy="110" r="5" fill="#ffd166"/>
      <circle class="ping-dot ping-two" cx="214" cy="92" r="4" fill="#70d6ff"/>
    </svg>`,
  storm: `
    <svg class="round-svg storm-svg" viewBox="0 0 360 220" role="img" aria-label="Answer storm graphic">
      <rect class="art-card" x="26" y="26" width="308" height="168" rx="30" fill="#11202b"/>
      <g class="rain-lines" stroke-linecap="round">
        <path d="M74 44 l-18 26 M126 38 l-20 30 M276 42 l-18 26 M306 92 l-22 32" stroke="#70d6ff" stroke-width="6"/>
        <path d="M62 162 l-16 22 M266 158 l-20 26" stroke="#f7aef8" stroke-width="6"/>
      </g>
      <path class="bolt" d="M94 160 L140 58 h55 l-26 54 h60 l-93 78 24-62 h-66z" fill="#ffd166"/>
      <circle class="storm-bubble bubble-a" cx="82" cy="70" r="14" fill="#70d6ff"/><circle class="storm-bubble bubble-b" cx="279" cy="72" r="18" fill="#f7aef8"/>
      <rect class="answer-token token-a" x="226" y="132" width="60" height="18" rx="9" fill="#5ee6a8"/><rect class="answer-token token-b" x="68" y="132" width="48" height="18" rx="9" fill="#ff6b6b"/>
      <rect class="answer-token token-c" x="208" y="92" width="34" height="14" rx="7" fill="#70d6ff"/>
    </svg>`,
  combo: `
    <svg class="round-svg combo-svg" viewBox="0 0 360 220" role="img" aria-label="Combination lock graphic">
      <rect class="art-card" x="34" y="34" width="292" height="152" rx="28" fill="#111b2e"/>
      <g class="combo-links" fill="none" stroke-width="10" stroke-linecap="round">
        <path d="M120 96 h120" stroke="#7cfcbd"/><path d="M120 132 h120" stroke="#7da5ff"/>
        <path d="M120 96 l-34 36 M240 96 l34 36" stroke="#ffcc66"/>
      </g>
      <g class="combo-orbit"><circle cx="180" cy="110" r="68" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-dasharray="5 12" stroke-width="4"/></g>
      <circle class="combo-node node-a" cx="86" cy="132" r="24" fill="#ffcc66"/><circle class="combo-node node-b" cx="120" cy="96" r="24" fill="#7cfcbd"/><circle class="combo-node node-c" cx="240" cy="96" r="24" fill="#7da5ff"/><circle class="combo-node node-d" cx="274" cy="132" r="24" fill="#ff7e9f"/>
      <path class="lock-shine" d="M72 58 h84" stroke="#fff" stroke-opacity=".28" stroke-width="8" stroke-linecap="round"/>
    </svg>`,
  jumble: `
    <svg class="round-svg jumble-svg" viewBox="0 0 360 220" role="img" aria-label="Letter jumble graphic">
      <rect class="art-card" x="36" y="26" width="288" height="168" rx="28" fill="#111b2e"/>
      <g class="letter-tiles">
        <rect x="76" y="54" width="42" height="42" rx="10" fill="#5ee6a8"/><text x="97" y="82" text-anchor="middle" fill="#071018" font-size="24" font-weight="900">W</text>
        <rect x="128" y="54" width="42" height="42" rx="10" fill="#70d6ff"/><text x="149" y="82" text-anchor="middle" fill="#071018" font-size="24" font-weight="900">O</text>
        <rect x="180" y="54" width="42" height="42" rx="10" fill="#ffd166"/><text x="201" y="82" text-anchor="middle" fill="#071018" font-size="24" font-weight="900">R</text>
        <rect x="232" y="54" width="42" height="42" rx="10" fill="#ff7e9f"/><text x="253" y="82" text-anchor="middle" fill="#071018" font-size="24" font-weight="900">D</text>
      </g>
      <g class="jumble-path" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M97 118 L149 144 L201 118 L253 144"/>
      </g>
      <g class="letter-tiles lower">
        <rect x="76" y="124" width="42" height="42" rx="10" fill="#ffcc66"/><text x="97" y="152" text-anchor="middle" fill="#071018" font-size="24" font-weight="900">F</text>
        <rect x="128" y="124" width="42" height="42" rx="10" fill="#7da5ff"/><text x="149" y="152" text-anchor="middle" fill="#071018" font-size="24" font-weight="900">I</text>
        <rect x="180" y="124" width="42" height="42" rx="10" fill="#7cfcbd"/><text x="201" y="152" text-anchor="middle" fill="#071018" font-size="24" font-weight="900">N</text>
        <rect x="232" y="124" width="42" height="42" rx="10" fill="#f7aef8"/><text x="253" y="152" text-anchor="middle" fill="#071018" font-size="24" font-weight="900">D</text>
      </g>
      <circle class="ping-dot" cx="300" cy="62" r="5" fill="#ffd166"/>
    </svg>`,
  finale: `
    <svg class="round-svg finale-svg" viewBox="0 0 360 220" role="img" aria-label="Finale target graphic">
      <rect class="art-card" x="28" y="26" width="304" height="168" rx="30" fill="#101827"/>
      <g class="target-rings">
        <circle cx="180" cy="110" r="88" fill="none" stroke="#70d6ff" stroke-opacity=".18" stroke-width="5"/>
        <circle cx="180" cy="110" r="74" fill="#ff4f7b"/><circle cx="180" cy="110" r="52" fill="#ffd166"/><circle cx="180" cy="110" r="30" fill="#5ee6a8"/>
      </g>
      <path class="crosshair" d="M180 52 v116 M122 110 h116" stroke="#101827" stroke-width="8" stroke-linecap="round"/>
      <g class="confetti">
        <rect x="70" y="58" width="12" height="6" rx="2" fill="#70d6ff"/><rect x="286" y="74" width="12" height="6" rx="2" fill="#ffd166"/>
        <rect x="90" y="162" width="12" height="6" rx="2" fill="#5ee6a8"/><rect x="264" y="156" width="12" height="6" rx="2" fill="#ff7e9f"/>
      </g>
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
  const selected = [...currentComboSelection()];
  if (!selected.length) return setError("Pick a combination first.");
  try {
    const result = await api("/api/submit", { ...session, payload: { selected } });
    state = result.state;
    render();
  } catch (error) {
    setError(error.message);
  }
}

async function submitJumbleWord() {
  const selection = [...currentJumbleSelection()];
  if (!selection.length) return setError("Tap letters to spell a hidden word first.");
  try {
    const result = await api("/api/submit", { ...session, payload: { cells: selection } });
    currentJumbleSelection().clear();
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
    const nextSignature = renderSignature(result.state);
    state = result.state;
    if (nextSignature === lastRenderSignature) {
      updateClockText();
      return;
    }
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
    if (state.phase !== "active") comboSelections.clear();
    if (state.phase !== "active") jumbleSelections.clear();
    resetFocus = true;
  }
  lastRenderSignature = renderSignature(state);
  const html = `
    <section class="topbar">
      <div>
        <p class="eyebrow">Signal Sprint</p>
        <h1>${state.code}</h1>
        <span class="build-version">${buildVersion}</span>
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
      <section class="play-panel phase-${state.phase} kind-${state.round?.kind || "lobby"}">
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
        <span class="build-version">${buildVersion}</span>
        <p>Race through deception, answer storms, combo puzzles, and clickable word jumbles. Highest score wins after four rounds, with a sudden-death finale only when first place is tied.</p>
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
          <li>Round 4: tap letters to find hidden words.</li>
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
  if (round.kind === "jumble") return renderJumble(round);
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
  const selected = currentComboSelection();
  return `
    <div class="round-header">
      <div><p class="eyebrow">Round ${round.number}</p><h2>${escapeHtml(round.prompt)}</h2></div>
      <div class="clock" data-clock>${state.secondsLeft}s</div>
    </div>
    <div class="round-art slim">${roundArt.combo}</div>
    <div class="combo-grid">
      ${round.items.map((item) => `<button class="${selected.has(item.id) ? "is-selected" : ""}" type="button" data-combo="${item.id}" ${submitted ? "disabled" : ""}>${escapeHtml(item.label)}</button>`).join("")}
    </div>
    <button class="wide-button" type="button" data-submit-combo ${submitted ? "disabled" : ""}>Lock combination</button>
    ${submitted ? `<p class="submitted">Combination locked.</p>` : `<p class="hint">Choose exactly ${round.need} items.</p>`}
    <p class="form-error" data-error></p>`;
}

function renderJumble(round) {
  const selected = currentJumbleSelection();
  const selectedKey = (row, col) => selected.findIndex((cell) => cell.row === row && cell.col === col);
  return `
    <div class="round-header">
      <div><p class="eyebrow">Round ${round.number}</p><h2>${escapeHtml(round.prompt)}</h2></div>
      <div class="clock" data-clock>${state.secondsLeft}s</div>
    </div>
    <div class="jumble-shell">
      <div class="jumble-targets" aria-label="Hidden words">
        ${round.targets.map((word) => `<span class="${state.me.foundWords.includes(word) ? "is-found" : ""}">${escapeHtml(word)}</span>`).join("")}
      </div>
      <div class="jumble-grid" style="--grid-size: ${round.grid.length}">
        ${round.grid.map((row, rowIndex) => [...row].map((letter, colIndex) => {
          const order = selectedKey(rowIndex, colIndex);
          return `<button class="${order >= 0 ? "is-selected" : ""}" type="button" data-jumble-row="${rowIndex}" data-jumble-col="${colIndex}" aria-label="Letter ${letter}">${escapeHtml(letter)}${order >= 0 ? `<small>${order + 1}</small>` : ""}</button>`;
        }).join("")).join("")}
      </div>
      <div class="jumble-actions">
        <button type="button" data-submit-jumble>Claim word</button>
        <button class="ghost-button" type="button" data-clear-jumble>Clear</button>
      </div>
      <div class="chips">
        ${state.me.foundWords.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}
      </div>
      <p class="submitted">${points(state.me.roundScore)} points this round so far.</p>
    </div>
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
    button.addEventListener("click", () => {
      const selected = currentComboSelection();
      if (selected.has(button.dataset.combo)) selected.delete(button.dataset.combo);
      else selected.add(button.dataset.combo);
      button.classList.toggle("is-selected", selected.has(button.dataset.combo));
      setError("");
    });
  });
  document.querySelector("[data-submit-combo]")?.addEventListener("click", submitCombo);
  document.querySelectorAll("[data-jumble-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = Number(button.dataset.jumbleRow);
      const col = Number(button.dataset.jumbleCol);
      const selected = currentJumbleSelection();
      const existingIndex = selected.findIndex((cell) => cell.row === row && cell.col === col);
      if (existingIndex >= 0) selected.splice(existingIndex, 1);
      else selected.push({ row, col });
      setError("");
      render(false);
    });
  });
  document.querySelector("[data-clear-jumble]")?.addEventListener("click", () => {
    currentJumbleSelection().clear();
    render(false);
  });
  document.querySelector("[data-submit-jumble]")?.addEventListener("click", submitJumbleWord);
}

function tickClock() {
  clearInterval(roundTimer);
  const clock = document.querySelector("[data-clock]");
  if (!clock || !state.endsAt) return;
  roundTimer = setInterval(updateClockText, 200);
}

function updateClockText() {
  const clock = document.querySelector("[data-clock]");
  if (!clock || !state?.endsAt) return;
  const remaining = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  clock.textContent = `${remaining}s`;
}

function currentComboSelection() {
  const key = `${state?.code || ""}-${session?.playerId || ""}-${state?.round?.number || 0}`;
  if (!comboSelections.has(key)) comboSelections.set(key, new Set());
  return comboSelections.get(key);
}

function currentJumbleSelection() {
  const key = `${state?.code || ""}-${session?.playerId || ""}-${state?.round?.number || 0}`;
  if (!jumbleSelections.has(key)) jumbleSelections.set(key, []);
  return jumbleSelections.get(key);
}

function renderSignature(nextState) {
  if (!nextState) return "";
  const stableState = {
    ...nextState,
    secondsLeft: 0,
    endsAt: nextState.endsAt ? "timer" : null,
  };
  return JSON.stringify(stableState);
}

if (session) startPolling();
else renderHome();
