import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main.ts";

function harness() {
  const out: string[] = [];
  const err: string[] = [];
  const env = { TODO_FILE: join(mkdtempSync(join(tmpdir(), "todo-")), "tasks.json") };
  const exec = (...argv: string[]) => run(argv, { out: (l) => out.push(l), err: (l) => err.push(l), env, now: () => new Date("2026-01-01T00:00:00Z") });
  return { out, err, exec };
}

test("add then list --json returns the task", () => {
  const h = harness();
  assert.equal(h.exec("add", "buy", "milk"), 0);
  assert.equal(h.exec("list", "--json"), 0);
  const tasks = JSON.parse(h.out.at(-1)!);
  assert.deepEqual(tasks.map((t: { id: number; title: string; status: string }) => [t.id, t.title, t.status]), [[1, "buy milk", "open"]]);
});

test("done marks a task complete", () => {
  const h = harness();
  h.exec("add", "write report");
  assert.equal(h.exec("done", "1"), 0);
  h.exec("list", "--json");
  assert.equal(JSON.parse(h.out.at(-1)!)[0].status, "done");
});

test("done with unknown id fails with a message", () => {
  const h = harness();
  assert.equal(h.exec("done", "42"), 1);
  assert.match(h.err.join("\n"), /No task with id 42/);
});

test("empty title is rejected", () => {
  const h = harness();
  assert.equal(h.exec("add", "  "), 1);
});

test("unknown command exits 2 and help exits 0", () => {
  const h = harness();
  assert.equal(h.exec("frobnicate"), 2);
  assert.equal(h.exec("help"), 0);
  assert.match(h.out.join("\n"), /Usage:/);
});
