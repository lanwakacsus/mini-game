const rooms = new Map();
const ROOM_TTL = 1000 * 60 * 60 * 8;
const SCHEMA_SQL = "CREATE TABLE IF NOT EXISTS signal_sprint_rooms (code TEXT PRIMARY KEY, state_json TEXT NOT NULL, updated_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS signal_sprint_rooms_updated_at_idx ON signal_sprint_rooms(updated_at);";
let schemaReady = false;

const roundPools = {
  bluff: [
    {
      prompt: "Which statement is true?",
      choices: [
        { id: "a", label: "A day on Venus is longer than a year on Venus." },
        { id: "b", label: "Lightning never strikes the same place twice." },
        { id: "c", label: "Humans use only ten percent of their brains." },
        { id: "d", label: "Goldfish have a three-second memory." },
      ],
      correct: ["a"],
      answerSummary: "Venus rotates so slowly that its day is longer than its year.",
    },
    {
      prompt: "Which statement is true?",
      choices: [
        { id: "a", label: "Bananas grow on trees." },
        { id: "b", label: "Octopuses have three hearts." },
        { id: "c", label: "The Great Wall is visible from the Moon." },
        { id: "d", label: "Bats are blind." },
      ],
      correct: ["b"],
      answerSummary: "Octopuses have three hearts.",
    },
    {
      prompt: "Which statement is true?",
      choices: [
        { id: "a", label: "Sound travels faster in air than in water." },
        { id: "b", label: "Sharks are mammals." },
        { id: "c", label: "Honey can remain edible for thousands of years." },
        { id: "d", label: "The Atlantic Ocean is the largest ocean." },
      ],
      correct: ["c"],
      answerSummary: "Properly stored honey can remain edible for extremely long periods.",
    },
    {
      prompt: "Which statement is true?",
      choices: [
        { id: "a", label: "Mount Everest is still growing slowly." },
        { id: "b", label: "The Sahara is the world's largest desert." },
        { id: "c", label: "Penguins live naturally at the North Pole." },
        { id: "d", label: "All planets rotate in the same direction." },
      ],
      correct: ["a"],
      answerSummary: "Everest is still rising slowly because tectonic plates keep pushing upward.",
    },
  ],
  storm: [
    {
      prompt: "Name things commonly found in a kitchen.",
      accepted: [
        "spoon", "fork", "knife", "plate", "bowl", "cup", "mug", "pan", "pot", "sink", "oven", "stove",
        "fridge", "refrigerator", "toaster", "microwave", "kettle", "blender", "whisk", "spatula", "towel",
        "soap", "sponge", "cutting board", "dishwasher", "cabinet", "drawer", "salt", "pepper", "food",
      ],
      answerSummary: "Kitchen items counted once per player.",
    },
    {
      prompt: "Name things people pack for a beach day.",
      accepted: [
        "towel", "sunscreen", "hat", "umbrella", "chair", "water", "snacks", "sandals", "flip flops",
        "swimsuit", "goggles", "book", "cooler", "ice", "speaker", "ball", "bucket", "shovel", "blanket",
        "sunglasses", "phone", "charger", "bag", "surfboard", "float", "water bottle",
      ],
      answerSummary: "Beach-day packing answers counted once per player.",
    },
    {
      prompt: "Name animals that can fly.",
      accepted: [
        "eagle", "hawk", "falcon", "owl", "parrot", "pigeon", "sparrow", "crow", "raven", "bat", "bee",
        "butterfly", "moth", "dragonfly", "wasp", "fly", "mosquito", "duck", "goose", "swan", "pelican",
        "seagull", "hummingbird", "flamingo", "turkey", "chicken",
      ],
      answerSummary: "Flying animals counted once per player.",
    },
    {
      prompt: "Name things you might see in a city.",
      accepted: [
        "bus", "taxi", "train", "subway", "building", "skyscraper", "park", "bench", "traffic light",
        "crosswalk", "restaurant", "shop", "store", "museum", "bridge", "bike", "scooter", "street",
        "sidewalk", "statue", "theater", "school", "hotel", "office", "apartment", "car",
      ],
      answerSummary: "City sights counted once per player.",
    },
  ],
  combo: [
    {
      prompt: "Choose the three items you would need to make a basic campfire.",
      need: 3,
      items: [
        { id: "spark", label: "Spark" },
        { id: "fuel", label: "Fuel" },
        { id: "oxygen", label: "Oxygen" },
        { id: "sand", label: "Sand" },
        { id: "ice", label: "Ice" },
        { id: "glass", label: "Glass" },
        { id: "magnet", label: "Magnet" },
        { id: "coin", label: "Coin" },
      ],
      correct: ["spark", "fuel", "oxygen"],
      answerSummary: "A fire needs heat, fuel, and oxygen.",
    },
    {
      prompt: "Choose the three primary colors of light.",
      need: 3,
      items: [
        { id: "red", label: "Red" },
        { id: "green", label: "Green" },
        { id: "blue", label: "Blue" },
        { id: "yellow", label: "Yellow" },
        { id: "black", label: "Black" },
        { id: "white", label: "White" },
        { id: "orange", label: "Orange" },
        { id: "purple", label: "Purple" },
      ],
      correct: ["red", "green", "blue"],
      answerSummary: "The primary colors of light are red, green, and blue.",
    },
    {
      prompt: "Choose the three ingredients in a classic BLT.",
      need: 3,
      items: [
        { id: "bacon", label: "Bacon" },
        { id: "lettuce", label: "Lettuce" },
        { id: "tomato", label: "Tomato" },
        { id: "turkey", label: "Turkey" },
        { id: "cheese", label: "Cheese" },
        { id: "egg", label: "Egg" },
        { id: "avocado", label: "Avocado" },
        { id: "pickles", label: "Pickles" },
      ],
      correct: ["bacon", "lettuce", "tomato"],
      answerSummary: "A BLT is bacon, lettuce, and tomato.",
    },
    {
      prompt: "Choose the three sides of a standard traffic light.",
      need: 3,
      items: [
        { id: "red", label: "Red" },
        { id: "yellow", label: "Yellow" },
        { id: "green", label: "Green" },
        { id: "blue", label: "Blue" },
        { id: "white", label: "White" },
        { id: "purple", label: "Purple" },
        { id: "black", label: "Black" },
        { id: "pink", label: "Pink" },
      ],
      correct: ["red", "yellow", "green"],
      answerSummary: "A standard traffic signal uses red, yellow, and green.",
    },
  ],
  jumble: [
    {
      prompt: "Find the hidden game words. Drag across letters, then claim the word.",
      grid: ["CODES", "ARENA", "PLAYS", "TIMER", "SCORE"],
      targets: ["CODE", "ARENA", "PLAY", "TIMER", "SCORE"],
      paths: {
        CODE: [[0, 0], [0, 1], [0, 2], [0, 3]],
        ARENA: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
        PLAY: [[2, 0], [2, 1], [2, 2], [2, 3]],
        TIMER: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
        SCORE: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
      },
      answerSummary: "Each hidden word found in the letter grid scored points.",
    },
    {
      prompt: "Find the hidden nature words. Drag across letters, then claim the word.",
      grid: ["RIVER", "OTTER", "STONE", "FIELD", "BLOOM"],
      targets: ["RIVER", "OTTER", "STONE", "FIELD", "BLOOM"],
      paths: {
        RIVER: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
        OTTER: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
        STONE: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
        FIELD: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
        BLOOM: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
      },
      answerSummary: "Each hidden nature word found in the letter grid scored points.",
    },
    {
      prompt: "Find the hidden speed words. Drag across letters, then claim the word.",
      grid: ["RACER", "BURST", "FLASH", "QUICK", "BOOST"],
      targets: ["RACER", "BURST", "FLASH", "QUICK", "BOOST"],
      paths: {
        RACER: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
        BURST: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
        FLASH: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
        QUICK: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
        BOOST: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
      },
      answerSummary: "Each hidden speed word found in the letter grid scored points.",
    },
    {
      prompt: "Find the hidden party words. Drag across letters, then claim the word.",
      grid: ["MUSIC", "DANCE", "LAUGH", "SNACK", "GAMES"],
      targets: ["MUSIC", "DANCE", "LAUGH", "SNACK", "GAMES"],
      paths: {
        MUSIC: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
        DANCE: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
        LAUGH: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
        SNACK: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
        GAMES: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]],
      },
      answerSummary: "Each hidden party word found in the letter grid scored points.",
    },
  ],
  finale: [
    {
      prompt: "Which number is prime?",
      choices: [
        { id: "a", label: "21" },
        { id: "b", label: "27" },
        { id: "c", label: "29" },
        { id: "d", label: "39" },
      ],
      correct: ["c"],
      answerSummary: "29 is prime.",
    },
    {
      prompt: "Which planet is closest to the Sun?",
      choices: [
        { id: "a", label: "Venus" },
        { id: "b", label: "Mercury" },
        { id: "c", label: "Mars" },
        { id: "d", label: "Earth" },
      ],
      correct: ["b"],
      answerSummary: "Mercury is closest to the Sun.",
    },
    {
      prompt: "Which word is a palindrome?",
      choices: [
        { id: "a", label: "Signal" },
        { id: "b", label: "Sprint" },
        { id: "c", label: "Level" },
        { id: "d", label: "Answer" },
      ],
      correct: ["c"],
      answerSummary: "Level reads the same forward and backward.",
    },
  ],
};

const roundTemplates = {
  bluff: {
    kind: "bluff",
    title: "Spot the Signal",
    rule: "Tap the one true statement. Correct answers score up to 700 points, and faster taps keep more of the bonus.",
    duration: 16,
  },
  storm: {
    kind: "storm",
    title: "Answer Storm",
    rule: "Type as many valid answers as you can before time runs out. Each unique correct answer is worth 100 points.",
    duration: 28,
  },
  combo: {
    kind: "combo",
    title: "Combo Lock",
    rule: "Pick the exact set that matches the clue. Partial matches score, but an exact fast lock is the big move.",
    duration: 22,
  },
  jumble: {
    kind: "jumble",
    title: "Letter Dash",
    rule: "Drag across letters to spell hidden words, then claim them. Each word can score once per player.",
    duration: 34,
  },
  finale: {
    kind: "finale",
    title: "Sudden Signal",
    rule: "Tiebreaker only: tap the correct answer. Winner takes a 500 point final burst.",
    duration: 12,
  },
};

export function createRoomState(hostName, origin) {
  const host = createPlayer(hostName, true);
  const code = makeCode();
  return {
    code,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    phase: "lobby",
    players: [host],
    hostId: host.id,
    roundIndex: -1,
    roundStartedAt: null,
    endsAt: null,
    submissions: {},
    roundScores: {},
    roundResults: [],
    roundBank: dealRoundBank(),
    shareUrl: `${origin}/?room=${code}`,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const storage = storageFor(env);
    await cleanupRooms(storage);

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, url, storage);
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};

async function handleApi(request, url, storage) {
  try {
    if (request.method === "GET" && url.pathname === "/api/state") {
      const session = Object.fromEntries(url.searchParams.entries());
      const room = await requireRoom(session.code, storage);
      const changed = tickRoom(room);
      if (changed) await saveRoom(room, storage);
      return json({ state: publicState(room, session.playerId, url.origin) });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const body = await request.json().catch(() => ({}));

    if (url.pathname === "/api/create") {
      const room = createRoomState(cleanName(body.name), url.origin);
      while (await loadRoom(room.code, storage)) room.code = makeCode();
      room.shareUrl = `${url.origin}/?room=${room.code}`;
      await saveRoom(room, storage);
      const player = room.players[0];
      return json({ session: sessionFor(room, player), state: publicState(room, player.id, url.origin) });
    }

    if (url.pathname === "/api/join") {
      const room = await requireRoom(body.code, storage);
      if (room.phase !== "lobby") throw new HttpError("That game already started.", 409);
      const name = cleanName(body.name);
      const existing = room.players.find((player) => player.name.toLowerCase() === name.toLowerCase());
      const player = existing || createPlayer(name, false);
      if (!existing) room.players.push(player);
      touch(room);
      await saveRoom(room, storage);
      return json({ session: sessionFor(room, player), state: publicState(room, player.id, url.origin) });
    }

    const room = await requireRoom(body.code, storage);
    const player = requirePlayer(room, body.playerId, body.token);
    let changed = tickRoom(room);

    if (url.pathname === "/api/start" || url.pathname === "/api/start-round" || url.pathname === "/api/next" || url.pathname === "/api/reset") {
      requireHost(room, player);
      handleHostAction(room, url.pathname.slice(5));
      await saveRoom(room, storage);
      return json({ state: publicState(room, player.id, url.origin) });
    }

    if (url.pathname === "/api/submit") {
      changed = handleSubmission(room, player, body.payload || {}) || changed;
      await saveRoom(room, storage);
      return json({ state: publicState(room, player.id, url.origin) });
    }

    return json({ error: "Unknown endpoint." }, 404);
  } catch (error) {
    const status = error.status || 500;
    const message = status === 500 ? "The game server hit a snag." : error.message;
    return json({ error: message }, status);
  }
}

function handleHostAction(room, action) {
  if (action === "reset") {
    room.phase = "lobby";
    room.roundIndex = -1;
    room.roundStartedAt = null;
    room.endsAt = null;
    room.submissions = {};
    room.roundScores = {};
    room.roundResults = [];
    room.roundBank = dealRoundBank();
    room.players.forEach((player) => {
      player.score = 0;
      player.answers = [];
      player.foundWords = [];
      player.submitted = false;
      player.roundScore = 0;
    });
    return touch(room);
  }

  if (action === "start" && room.phase === "lobby") {
    if (room.players.length < 2) throw new HttpError("At least two players need to join.", 409);
    room.roundIndex = 0;
    room.phase = "briefing";
    resetRound(room);
    return touch(room);
  }

  if (action === "start-round" && room.phase === "briefing") {
    room.phase = "active";
    room.roundStartedAt = Date.now();
    room.endsAt = room.roundStartedAt + currentRound(room).duration * 1000;
    return touch(room);
  }

  if (action === "next" && room.phase === "results") {
    if (room.roundIndex === 3 && !needsFinale(room)) {
      room.phase = "final";
      return touch(room);
    }
    if (room.roundIndex >= room.roundBank.length - 1) {
      room.phase = "final";
      return touch(room);
    }
    room.roundIndex += 1;
    room.phase = "briefing";
    resetRound(room);
    return touch(room);
  }

  throw new HttpError("That action is not available right now.", 409);
}

function handleSubmission(room, player, payload) {
  if (room.phase !== "active") throw new HttpError("This round is not accepting answers.", 409);
  const round = currentRound(room);
  const now = Date.now();
  if (now > room.endsAt) {
    finalizeRound(room);
    throw new HttpError("Time is up.", 409);
  }

  if (round.kind === "storm") {
    const answer = normalizeAnswer(payload.answer);
    if (!answer) throw new HttpError("Type an answer first.", 400);
    const accepted = new Set(round.accepted.map(normalizeAnswer));
    if (!accepted.has(answer)) throw new HttpError("That one is not on this prompt's answer list.", 400);
    const playerAnswers = room.submissions[player.id]?.answers || [];
    if (playerAnswers.includes(answer)) throw new HttpError("You already used that answer.", 400);
    playerAnswers.push(answer);
    room.submissions[player.id] = { answers: playerAnswers, at: now };
    player.answers = playerAnswers;
    player.roundScore = playerAnswers.length * 100;
    room.roundScores[player.id] = player.roundScore;
    touch(room);
    return;
  }

  if (round.kind === "jumble") {
    const cells = normalizeCells(payload.cells);
    if (!cells.length) throw new HttpError("Drag across the letters for one hidden word, then claim it.", 400);
    const matchedWord = matchingJumbleWord(round, cells);
    if (!matchedWord) throw new HttpError("That path is not one of the hidden words.", 400);
    const foundWords = room.submissions[player.id]?.foundWords || [];
    if (foundWords.includes(matchedWord)) throw new HttpError("You already found that word.", 400);
    foundWords.push(matchedWord);
    room.submissions[player.id] = { foundWords, at: now };
    player.foundWords = foundWords;
    player.roundScore = foundWords.reduce((total, foundWord) => total + jumbleWordPoints(foundWord), 0);
    room.roundScores[player.id] = player.roundScore;
    touch(room);
    return true;
  }

  if (room.submissions[player.id]) throw new HttpError("You already locked in.", 409);
  if (round.kind === "combo") {
    const selected = Array.isArray(payload.selected) ? [...new Set(payload.selected.map(String))] : [];
    if (selected.length !== round.need) throw new HttpError(`Choose exactly ${round.need} items.`, 400);
    room.submissions[player.id] = { selected, at: now };
  } else {
    const choiceId = String(payload.choiceId || "");
    if (!round.choices.some((choice) => choice.id === choiceId)) throw new HttpError("Pick one of the visible choices.", 400);
    room.submissions[player.id] = { choiceId, at: now };
  }
  player.submitted = true;
  touch(room);

  const allLocked = room.players.every((roomPlayer) => room.submissions[roomPlayer.id]);
  if (allLocked) return finalizeRound(room);
  return true;
}

function tickRoom(room) {
  if (room.phase === "active" && Date.now() >= room.endsAt) return finalizeRound(room);
  return false;
}

function finalizeRound(room) {
  if (room.phase !== "active") return false;
  const round = currentRound(room);
  const results = [];

  for (const player of room.players) {
    const submission = room.submissions[player.id];
    let earned = 0;
    if (round.kind === "storm") {
      earned = (submission?.answers?.length || 0) * 100;
    } else if (round.kind === "jumble") {
      earned = (submission?.foundWords || []).reduce((total, word) => total + jumbleWordPoints(word), 0);
    } else if (round.kind === "combo") {
      const correct = new Set(round.correct);
      const selected = submission?.selected || [];
      const hits = selected.filter((id) => correct.has(id)).length;
      const misses = selected.length - hits;
      const exact = hits === correct.size && misses === 0;
      earned = Math.max(0, hits * 160 - misses * 80);
      if (exact) earned += speedBonus(round, room, submission.at, 420);
    } else {
      const correct = round.correct.includes(submission?.choiceId);
      earned = correct ? 300 + speedBonus(round, room, submission.at, round.kind === "finale" ? 500 : 400) : 0;
    }
    player.score += earned;
    player.roundScore = earned;
    results.push({ id: player.id, name: player.name, points: earned });
  }

  room.roundResults = results.sort((a, b) => b.points - a.points);
  room.phase = "results";
  room.endsAt = null;
  touch(room);
  return true;
}

function speedBonus(round, room, at, maxBonus) {
  if (!at || !room.roundStartedAt) return 0;
  const elapsed = Math.max(0, at - room.roundStartedAt);
  const ratio = Math.max(0, 1 - elapsed / (round.duration * 1000));
  return Math.round(maxBonus * ratio);
}

function resetRound(room) {
  room.submissions = {};
  room.roundScores = {};
  room.roundResults = [];
  room.endsAt = null;
  room.roundStartedAt = null;
  room.players.forEach((player) => {
    player.submitted = false;
    player.answers = [];
    player.foundWords = [];
    player.roundScore = 0;
  });
}

function publicState(room, playerId, origin) {
  const player = room.players.find((item) => item.id === playerId);
  const round = currentRound(room);
  return {
    code: room.code,
    phase: room.phase,
    shareUrl: `${origin}/?room=${room.code}`,
    secondsLeft: room.endsAt ? Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000)) : 0,
    endsAt: room.endsAt,
    players: [...room.players]
      .map(({ id, name, score }) => ({ id, name, score }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)),
    me: {
      id: player?.id,
      name: player?.name,
      isHost: room.hostId === player?.id,
      submitted: Boolean(player?.submitted),
      answers: player?.answers || [],
      foundWords: player?.foundWords || [],
      roundScore: player?.roundScore || 0,
    },
    round: round ? publicRound(round, room.roundIndex) : null,
    roundResults: room.roundResults,
  };
}

function publicRound(round, index) {
  const base = {
    number: index + 1,
    kind: round.kind,
    title: round.title,
    rule: round.rule,
    prompt: round.prompt,
    answerSummary: round.answerSummary,
  };
  if (round.choices) base.choices = round.choices;
  if (round.items) {
    base.items = round.items;
    base.need = round.need;
  }
  if (round.grid) {
    base.grid = round.grid;
    base.targets = round.targets;
  }
  return base;
}

function needsFinale(room) {
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  return sorted.length > 1 && sorted[0].score === sorted[1].score;
}

function currentRound(room) {
  if (!room.roundBank) room.roundBank = dealRoundBank();
  return room.roundBank[room.roundIndex] || null;
}

function dealRoundBank() {
  return [
    buildRound("bluff"),
    buildRound("storm"),
    buildRound("combo"),
    buildRound("jumble"),
    buildRound("finale"),
  ];
}

function buildRound(kind) {
  const pool = roundPools[kind];
  const prompt = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...roundTemplates[kind],
    ...structuredClone(prompt),
  };
}

function createPlayer(name, isHost) {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    name: cleanName(name || (isHost ? "Host" : "Player")),
    score: 0,
    submitted: false,
    answers: [],
    roundScore: 0,
  };
}

function sessionFor(room, player) {
  return { code: room.code, playerId: player.id, token: player.token };
}

async function requireRoom(code, storage) {
  const room = await loadRoom(String(code || "").trim().toUpperCase(), storage);
  if (!room) throw new HttpError("Room not found.", 404);
  return room;
}

function requirePlayer(room, playerId, token) {
  const player = room.players.find((item) => item.id === playerId && item.token === token);
  if (!player) throw new HttpError("Player session not found.", 403);
  return player;
}

function requireHost(room, player) {
  if (room.hostId !== player.id) throw new HttpError("Only the host can do that.", 403);
}

function cleanName(name) {
  const cleaned = String(name || "").replace(/\s+/g, " ").trim().slice(0, 18);
  if (!cleaned) throw new HttpError("Enter a player name.", 400);
  return cleaned;
}

function normalizeAnswer(answer) {
  return String(answer || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function normalizeCells(cells) {
  if (!Array.isArray(cells)) return [];
  return cells.map((cell) => ({
    row: Number(cell?.row),
    col: Number(cell?.col),
  })).filter((cell) => Number.isInteger(cell.row) && Number.isInteger(cell.col));
}

function matchingJumbleWord(round, cells) {
  for (const target of round.targets || []) {
    const expected = round.paths?.[target] || [];
    const reversed = [...expected].reverse();
    if (samePath(cells, expected) || samePath(cells, reversed)) return target;
  }
  return "";
}

function samePath(cells, expected) {
  return cells.length === expected.length && cells.every((cell, index) => (
    cell.row === expected[index][0] && cell.col === expected[index][1]
  ));
}

function jumbleWordPoints(word) {
  return 80 + String(word || "").length * 25;
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function touch(room) {
  room.updatedAt = Date.now();
}

function storageFor(env) {
  return env?.DB ? { db: env.DB } : { memory: rooms };
}

async function ensureSchema(storage) {
  if (!storage.db || schemaReady) return;
  for (const statement of SCHEMA_SQL.split(";").map((sql) => sql.trim()).filter(Boolean)) {
    await storage.db.prepare(statement).run();
  }
  schemaReady = true;
}

async function loadRoom(code, storage) {
  if (!code) return null;
  if (storage.db) {
    await ensureSchema(storage);
    const row = await storage.db
      .prepare("SELECT state_json FROM signal_sprint_rooms WHERE code = ?")
      .bind(code)
      .first();
    return row?.state_json ? JSON.parse(row.state_json) : null;
  }
  return storage.memory.get(code) || null;
}

async function saveRoom(room, storage) {
  touch(room);
  if (storage.db) {
    await ensureSchema(storage);
    await storage.db
      .prepare("INSERT INTO signal_sprint_rooms (code, state_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at")
      .bind(room.code, JSON.stringify(room), room.updatedAt)
      .run();
    return;
  }
  storage.memory.set(room.code, room);
}

async function cleanupRooms(storage) {
  const cutoff = Date.now() - ROOM_TTL;
  if (storage.db) {
    await ensureSchema(storage);
    await storage.db.prepare("DELETE FROM signal_sprint_rooms WHERE updated_at < ?").bind(cutoff).run();
    return;
  }
  for (const [code, room] of storage.memory) {
    if (room.updatedAt < cutoff) storage.memory.delete(code);
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
