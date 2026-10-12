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

test("two players can create, join, play a round, and score", async () => {
  const created = await post("/api/create", { name: "Ari" });
  assert.equal(created.state.phase, "lobby");
  const joined = await post("/api/join", { code: created.session.code, name: "Bo" });
  assert.equal(joined.state.players.length, 2);

  const briefing = await post("/api/start", created.session);
  assert.equal(briefing.state.phase, "briefing");
  const active = await post("/api/start-round", created.session);
  assert.equal(active.state.phase, "active");

  const ari = await post("/api/submit", { ...created.session, payload: { choiceId: "a" } });
  assert.equal(ari.state.me.submitted, true);
  const bo = await post("/api/submit", { ...joined.session, payload: { choiceId: "b" } });
  assert.equal(bo.state.phase, "results");
  assert.ok(bo.state.players.find((player) => player.name === "Ari").score > 0);
});

test("storm round accepts multiple unique answers", async () => {
  const created = await post("/api/create", { name: "Cy" });
  const joined = await post("/api/join", { code: created.session.code, name: "Dee" });
  await post("/api/start", created.session);
  await post("/api/start-round", created.session);
  await post("/api/submit", { ...created.session, payload: { choiceId: "a" } });
  await post("/api/submit", { ...joined.session, payload: { choiceId: "a" } });
  await post("/api/next", created.session);
  await post("/api/start-round", created.session);

  await post("/api/submit", { ...created.session, payload: { answer: "spoon" } });
  const result = await post("/api/submit", { ...created.session, payload: { answer: "fork" } });
  assert.deepEqual(result.state.me.answers, ["spoon", "fork"]);
  assert.equal(result.state.me.roundScore, 200);
});
