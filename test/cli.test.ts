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

test("legacy v0.1 task file without priority loads, lists as medium, and is not rewritten", () => {
  const h = harness();
  const path = h.env.TODO_FILE!;
  const legacy = { version: 1, nextId: 2, tasks: [{ id: 1, title: "legacy", status: "open", createdAt: "2026-01-01T00:00:00.000Z" }] };
  writeFileSync(path, JSON.stringify(legacy));
  assert.equal(h.exec("list", "--json"), 0);
  assert.deepEqual(JSON.parse(h.out.at(-1)!), legacy.tasks.map((t) => ({ ...t, priority: "medium" })));
  h.exec("list");
  assert.equal(h.out.at(-1), "[ ]   #1 legacy");
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

test("prioritise updates the task and prints the change", () => {
  const h = harness();
  h.exec("add", "tidy desk");
  assert.equal(h.exec("prioritise", "1", "high"), 0);
  assert.match(h.out.at(-1)!, /#1: medium → high/);
  h.exec("list", "--json");
  assert.equal(JSON.parse(h.out.at(-1)!)[0].priority, "high");
});

test("prioritise with unknown id or invalid level fails and leaves the file unchanged", () => {
  const h = harness();
  h.exec("add", "tidy desk");
  const before = readFileSync(h.env.TODO_FILE!, "utf8");
  assert.equal(h.exec("prioritise", "9", "high"), 1);
  assert.match(h.err.at(-1)!, /No task with id 9/);
  assert.equal(h.exec("prioritise", "1", "urgent"), 1);
  assert.match(h.err.at(-1)!, /Valid levels/);
  assert.equal(readFileSync(h.env.TODO_FILE!, "utf8"), before);
});

test("list orders open tasks high → medium → low then id, done tasks last", () => {
  const h = harness();
  h.exec("add", "--priority", "low", "a");
  h.exec("add", "b");
  h.exec("add", "--priority", "high", "c");
  h.exec("add", "--priority", "high", "d");
  h.exec("done", "3");
  h.exec("list", "--json");
  assert.deepEqual(JSON.parse(h.out.at(-1)!).map((t: { title: string }) => t.title), ["d", "b", "a", "c"]);
});

test("human list marks high with ! and low with ↓; json includes priority", () => {
  const h = harness();
  h.exec("add", "--priority", "high", "hot");
  h.exec("add", "--priority", "low", "cold");
  h.exec("add", "warm");
  h.exec("list");
  assert.deepEqual(h.out.slice(-3), ["[ ] ! #1 hot", "[ ]   #3 warm", "[ ] ↓ #2 cold"]);
  h.exec("list", "--json");
  assert.deepEqual(JSON.parse(h.out.at(-1)!).map((t: { priority: string }) => t.priority), ["high", "medium", "low"]);
});

test("help documents prioritise", () => {
  const h = harness();
  h.exec("help");
  assert.match(h.out.join("\n"), /todo prioritise <id> <high\|medium\|low>/);
});

test("list --open shows only open tasks and --done only completed ones", () => {
  const h = harness();
  h.exec("add", "a");
  h.exec("add", "b");
  h.exec("done", "1");
  h.exec("list", "--open");
  assert.deepEqual(h.out.slice(-1), ["[ ]   #2 b"]);
  h.exec("list", "--done");
  assert.deepEqual(h.out.slice(-1), ["[x]   #1 a"]);
});

test("list filters combine with --json", () => {
  const h = harness();
  h.exec("add", "a");
  h.exec("add", "b");
  h.exec("done", "2");
  h.exec("list", "--open", "--json");
  assert.deepEqual(JSON.parse(h.out.at(-1)!).map((t: { id: number }) => t.id), [1]);
  h.exec("list", "--json", "--done");
  assert.deepEqual(JSON.parse(h.out.at(-1)!).map((t: { id: number }) => t.id), [2]);
});

test("list --open --done together exits 2 with a usage message", () => {
  const h = harness();
  assert.equal(h.exec("list", "--open", "--done"), 2);
  assert.match(h.err.at(-1)!, /Usage: todo list \[--open \| --done\]/);
});

test("filtered list with no matches says so", () => {
  const h = harness();
  h.exec("add", "a");
  h.exec("list", "--done");
  assert.equal(h.out.at(-1), "No completed tasks.");
});

// #11 — due dates. `now` is local noon so today/tomorrow resolve the same in every time zone.
function dueHarness() {
  const h = harness();
  const exec = (...argv: string[]) => run(argv, { out: (l) => h.out.push(l), err: (l) => h.err.push(l), env: h.env, now: () => new Date(2026, 10, 30, 12) });
  return { ...h, exec };
}

test("add --due stores an ISO date; today/tomorrow resolve against the injected local date (#11 AC1)", () => {
  const h = dueHarness();
  assert.equal(h.exec("add", "--due", "2026-11-15", "file", "taxes"), 0);
  assert.equal(h.exec("add", "pay", "rent", "--due", "today"), 0);
  assert.equal(h.exec("add", "--priority", "high", "--due", "tomorrow", "call", "mum"), 0);
  assert.equal(h.exec("add", "no", "date"), 0);
  const stored = JSON.parse(readFileSync(h.env.TODO_FILE!, "utf8")).tasks;
  assert.deepEqual(stored.map((t: { title: string; dueDate?: string }) => [t.title, t.dueDate]), [
    ["file taxes", "2026-11-15"],
    ["pay rent", "2026-11-30"],
    ["call mum", "2026-12-01"],
    ["no date", undefined],
  ]);
  assert.equal("dueDate" in stored[3], false);
  assert.equal(stored[2].priority, "high");
});

test("invalid or missing due date exits 1, lists accepted forms, and writes nothing (#11 AC2)", () => {
  const h = dueHarness();
  for (const bad of ["2026-02-30", "someday", "2026-13-01", "2026-1-5", ""]) {
    assert.equal(h.exec("add", "--due", bad, "task"), 1, bad);
    assert.match(h.err.at(-1)!, /Use YYYY-MM-DD, today, or tomorrow/);
  }
  assert.equal(h.exec("add", "task", "--due"), 1);
  assert.match(h.err.at(-1)!, /Use YYYY-MM-DD, today, or tomorrow/);
  assert.equal(existsSync(h.env.TODO_FILE!), false);
});

test("v0.2 task file without dueDate loads, lists unchanged, and is not rewritten (#11 AC3)", () => {
  const h = dueHarness();
  const path = h.env.TODO_FILE!;
  const v02 = {
    version: 1,
    nextId: 3,
    tasks: [
      { id: 1, title: "old high", status: "open", priority: "high", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: 2, title: "old done", status: "done", priority: "low", createdAt: "2026-01-01T00:00:00.000Z", completedAt: "2026-01-02T00:00:00.000Z" },
    ],
  };
  writeFileSync(path, JSON.stringify(v02));
  assert.equal(h.exec("list", "--json"), 0);
  assert.deepEqual(JSON.parse(h.out.at(-1)!), v02.tasks);
  h.exec("list");
  assert.deepEqual(h.out.slice(-2), ["[ ] ! #1 old high", "[x] ↓ #2 old done"]);
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), v02);
});

test("adding a due date keeps TaskList.version at 1 and only adds the dueDate field (#11 AC4)", () => {
  const h = dueHarness();
  h.exec("add", "plain");
  h.exec("add", "--due", "2026-12-25", "dated");
  const file = JSON.parse(readFileSync(h.env.TODO_FILE!, "utf8"));
  assert.equal(file.version, 1);
  const [plain, dated] = file.tasks;
  assert.deepEqual(Object.keys(dated).sort(), [...Object.keys(plain), "dueDate"].sort());
});

test("help documents add --due and the accepted date forms", () => {
  const h = harness();
  h.exec("help");
  assert.match(h.out.join("\n"), /todo add .*\[--due <date>\]/);
  assert.match(h.out.join("\n"), /YYYY-MM-DD, today, or tomorrow/);
});
