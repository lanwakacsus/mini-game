import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/index.js";

function env() {
  return {
    ASSETS: {
      fetch() {
        return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
      },
    },
  };
}

async function post(path, body) {
  const response = await worker.fetch(new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), env());
  const payload = await response.json();
  assert.equal(response.status, 200, payload.error);
  return payload;
}

async function getState(session) {
  const query = new URLSearchParams(session).toString();
  const response = await worker.fetch(new Request(`https://example.test/api/state?${query}`), env());
  const payload = await response.json();
  assert.equal(response.status, 200, payload.error);
  return payload;
}

async function finishTimedRound(session, milliseconds = 60000) {
  const realNow = Date.now;
  Date.now = () => realNow() + milliseconds;
  try {
    return await getState(session);
  } finally {
    Date.now = realNow;
  }
}

function correctChoiceId(round) {
  const summary = round.answerSummary.toLowerCase();
  if (summary.includes("venus")) return round.choices.find((choice) => choice.label.includes("Venus")).id;
  if (summary.includes("octopuses")) return round.choices.find((choice) => choice.label.includes("Octopuses")).id;
  if (summary.includes("honey")) return round.choices.find((choice) => choice.label.includes("Honey")).id;
  if (summary.includes("everest")) return round.choices.find((choice) => choice.label.includes("Everest")).id;
  return round.choices[0].id;
}

function stormAnswers(round) {
  if (round.prompt.includes("beach")) return ["towel", "sunscreen"];
  if (round.prompt.includes("animals")) return ["eagle", "bat"];
  if (round.prompt.includes("city")) return ["bus", "taxi"];
  return ["spoon", "fork"];
}

test("two players can create, join, play a round, and score", async () => {
  const created = await post("/api/create", { name: "Ari" });
  assert.equal(created.state.phase, "lobby");
  const joined = await post("/api/join", { code: created.session.code, name: "Bo" });
  assert.equal(joined.state.players.length, 2);

  const briefing = await post("/api/start", created.session);
  assert.equal(briefing.state.phase, "briefing");
  const active = await post("/api/start-round", created.session);
  assert.equal(active.state.phase, "active");
  const correctChoice = correctChoiceId(active.state.round);
  const wrongChoice = active.state.round.choices.find((choice) => choice.id !== correctChoice).id;

  const ari = await post("/api/submit", { ...created.session, payload: { choiceId: correctChoice } });
  assert.equal(ari.state.me.submitted, true);
  const bo = await post("/api/submit", { ...joined.session, payload: { choiceId: wrongChoice } });
  assert.equal(bo.state.phase, "results");
  assert.ok(bo.state.players.find((player) => player.name === "Ari").score > 0);
});

test("storm round accepts multiple unique answers", async () => {
  const created = await post("/api/create", { name: "Cy" });
  const joined = await post("/api/join", { code: created.session.code, name: "Dee" });
  await post("/api/start", created.session);
  const active = await post("/api/start-round", created.session);
  const correctChoice = correctChoiceId(active.state.round);
  await post("/api/submit", { ...created.session, payload: { choiceId: correctChoice } });
  await post("/api/submit", { ...joined.session, payload: { choiceId: correctChoice } });
  await post("/api/next", created.session);
  const storm = await post("/api/start-round", created.session);
  const answers = stormAnswers(storm.state.round);

  await post("/api/submit", { ...created.session, payload: { answer: answers[0] } });
  const result = await post("/api/submit", { ...created.session, payload: { answer: answers[1] } });
  assert.deepEqual(result.state.me.answers, answers);
  assert.equal(result.state.me.roundScore, 200);
});

test("new rooms include a dealt round bank", async () => {
  const created = await post("/api/create", { name: "Eli" });
  assert.equal(created.state.round, null);
  const joined = await post("/api/join", { code: created.session.code, name: "Fran" });
  await post("/api/start", created.session);
  const roundOne = await post("/api/start-round", created.session);
  assert.equal(roundOne.state.round.kind, "bluff");
  assert.ok(roundOne.state.round.choices.length >= 4);
  await post("/api/submit", { ...created.session, payload: { choiceId: correctChoiceId(roundOne.state.round) } });
  await post("/api/submit", { ...joined.session, payload: { choiceId: correctChoiceId(roundOne.state.round) } });
});

test("jumble round accepts clicked letter paths", async () => {
  const created = await post("/api/create", { name: "Gia" });
  const joined = await post("/api/join", { code: created.session.code, name: "Hal" });
  await post("/api/start", created.session);

  const bluff = await post("/api/start-round", created.session);
  await post("/api/submit", { ...created.session, payload: { choiceId: correctChoiceId(bluff.state.round) } });
  await post("/api/submit", { ...joined.session, payload: { choiceId: correctChoiceId(bluff.state.round) } });
  await post("/api/next", created.session);

  const storm = await post("/api/start-round", created.session);
  const answers = stormAnswers(storm.state.round);
  await post("/api/submit", { ...created.session, payload: { answer: answers[0] } });
  await finishTimedRound(created.session);
  await post("/api/next", created.session);

  const combo = await post("/api/start-round", created.session);
  const selected = combo.state.round.items.slice(0, combo.state.round.need).map((item) => item.id);
  await post("/api/submit", { ...created.session, payload: { selected } });
  await post("/api/submit", { ...joined.session, payload: { selected } });
  await post("/api/next", created.session);

  const jumble = await post("/api/start-round", created.session);
  assert.equal(jumble.state.round.kind, "jumble");
  const word = jumble.state.round.targets[0];
  const cells = [...word].map((_, col) => ({ row: 0, col }));
  const result = await post("/api/submit", { ...created.session, payload: { cells } });
  assert.deepEqual(result.state.me.foundWords, [word]);
  assert.ok(result.state.me.roundScore > 0);
});
