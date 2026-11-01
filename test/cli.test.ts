import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main.ts";

function harness() {
  const out: string[] = [];
  const err: string[] = [];
  const env = { TODO_FILE: join(mkdtempSync(join(tmpdir(), "todo-")), "tasks.json") };
  const exec = (...argv: string[]) => run(argv, { out: (l) => out.push(l), err: (l) => err.push(l), env, now: () => new Date("2026-01-01T00:00:00Z") });
  return { out, err, env, exec };
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

test("legacy v0.1 task file without priority loads and lists unchanged", () => {
  const h = harness();
  const path = h.env.TODO_FILE!;
  const legacy = { version: 1, nextId: 2, tasks: [{ id: 1, title: "legacy", status: "open", createdAt: "2026-01-01T00:00:00.000Z" }] };
  writeFileSync(path, JSON.stringify(legacy));
  assert.equal(h.exec("list", "--json"), 0);
  assert.deepEqual(JSON.parse(h.out.at(-1)!), legacy.tasks);
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), legacy);
});

test("add stores supplied priority and defaults to medium", () => {
  const h = harness();
  assert.equal(h.exec("add", "--priority", "high", "urgent", "task"), 0);
  assert.equal(h.exec("add", "normal", "task"), 0);
  assert.equal(h.exec("list", "--json"), 0);
  assert.deepEqual(JSON.parse(h.out.at(-1)!).map((task: { priority: string }) => task.priority), ["high", "medium"]);
});

test("invalid priority fails without writing a task file", () => {
  const h = harness();
  assert.equal(h.exec("add", "--priority", "urgent", "task"), 1);
  assert.match(h.err.join("\n"), /Valid levels: low, medium, high/);
  assert.equal(existsSync(h.env.TODO_FILE!), false);
});
