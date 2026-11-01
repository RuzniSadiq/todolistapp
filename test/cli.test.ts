import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main.ts";
import { isOverdue, parseDueDate, sortTasks, type Task } from "../src/domain/task.ts";

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
  assert.deepEqual(JSON.parse(h.out.at(-1)!), legacy.tasks.map((t) => ({ ...t, priority: "medium", overdue: false })));
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
  assert.deepEqual(JSON.parse(h.out.at(-1)!), v02.tasks.map((t) => ({ ...t, overdue: false })));
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

// #11 — adversarial edge cases (test-engineer).
test("parseDueDate: leap days and calendar rollovers (#11 AC1/AC2 edges)", () => {
  const jan = new Date(2026, 0, 1, 12);
  assert.equal(parseDueDate("2028-02-29", jan), "2028-02-29");
  for (const bad of ["2027-02-29", "2026-04-31", "2026-00-10", " 2026-11-15", "2026-11-15T00:00", "Today"]) {
    assert.throws(() => parseDueDate(bad, jan), /Use YYYY-MM-DD, today, or tomorrow/, bad);
  }
  assert.equal(parseDueDate("tomorrow", new Date(2026, 11, 31, 12)), "2027-01-01");
  assert.equal(parseDueDate("tomorrow", new Date(2028, 1, 28, 12)), "2028-02-29");
  assert.equal(parseDueDate("today", new Date(2026, 10, 1, 23, 59)), "2026-11-01");
});

test("invalid due date leaves an existing task file byte-identical (#11 AC2)", () => {
  const h = dueHarness();
  h.exec("add", "--due", "2026-12-01", "existing");
  const before = readFileSync(h.env.TODO_FILE!, "utf8");
  assert.equal(h.exec("add", "--due", "2026-02-30", "bad"), 1);
  assert.equal(h.exec("add", "--due", "someday", "bad"), 1);
  assert.equal(readFileSync(h.env.TODO_FILE!, "utf8"), before);
});

test("dueDate survives done and is exposed by list --json (#11 AC4 additive)", () => {
  const h = dueHarness();
  h.exec("add", "--due", "2026-12-25", "wrap", "gifts");
  assert.equal(h.exec("done", "1"), 0);
  h.exec("list", "--json");
  const [task] = JSON.parse(h.out.at(-1)!);
  assert.equal(task.dueDate, "2026-12-25");
  assert.equal(task.status, "done");
  assert.equal(JSON.parse(readFileSync(h.env.TODO_FILE!, "utf8")).version, 1);
});

// #12 — `todo due` and overdue-first list. dueHarness "today" is 2026-11-30 (local).
const listJson = (h: ReturnType<typeof dueHarness>) => {
  h.exec("list", "--json");
  return JSON.parse(h.out.at(-1)!) as (Task & { overdue: boolean })[];
};

test("due sets, changes, and clears a due date and prints the change (#12 AC1)", () => {
  const h = dueHarness();
  h.exec("add", "file", "taxes");
  assert.equal(h.exec("due", "1", "2026-12-24"), 0);
  assert.equal(h.out.at(-1), "Due #1: none → 2026-12-24 (file taxes)");
  assert.equal(h.exec("due", "1", "today"), 0);
  assert.equal(h.out.at(-1), "Due #1: 2026-12-24 → 2026-11-30 (file taxes)");
  assert.equal(h.exec("due", "1", "tomorrow"), 0);
  assert.equal(h.out.at(-1), "Due #1: 2026-11-30 → 2026-12-01 (file taxes)");
  assert.equal(h.exec("due", "1", "none"), 0);
  assert.equal(h.out.at(-1), "Due #1: 2026-12-01 → none (file taxes)");
  const [stored] = JSON.parse(readFileSync(h.env.TODO_FILE!, "utf8")).tasks;
  assert.equal("dueDate" in stored, false);
});

test("due with unknown id or invalid date exits 1 and leaves the file byte-identical (#12 AC2)", () => {
  const h = dueHarness();
  h.exec("add", "--due", "2026-12-01", "existing");
  const before = readFileSync(h.env.TODO_FILE!, "utf8");
  const cases: string[][] = [["due", "42", "2026-12-02"], ["due", "1", "2026-02-30"], ["due", "1", "someday"], ["due", "1"], ["due", "x", "today"], ["due"]];
  for (const argv of cases) {
    assert.equal(h.exec(...argv), 1, argv.join(" "));
    assert.equal(readFileSync(h.env.TODO_FILE!, "utf8"), before, argv.join(" "));
  }
  assert.match(h.err.join("\n"), /No task with id 42/);
  assert.match(h.err.join("\n"), /Use YYYY-MM-DD, today, or tomorrow/);
});

test("overdue = open and due strictly before today; due today and done tasks are not overdue (#12 AC3)", () => {
  const open = (dueDate?: string): Task => ({ id: 1, title: "t", status: "open", createdAt: "", ...(dueDate ? { dueDate } : {}) });
  assert.equal(isOverdue(open("2026-11-29"), "2026-11-30"), true);
  assert.equal(isOverdue(open("2025-12-31"), "2026-01-01"), true);
  assert.equal(isOverdue(open("2026-11-30"), "2026-11-30"), false);
  assert.equal(isOverdue(open("2026-12-01"), "2026-11-30"), false);
  assert.equal(isOverdue(open(), "2026-11-30"), false);
  assert.equal(isOverdue({ ...open("2026-01-01"), status: "done" }, "2026-11-30"), false);

  const h = dueHarness();
  h.exec("add", "--due", "2026-11-29", "yesterday");
  h.exec("add", "--due", "today", "today");
  h.exec("add", "--due", "2026-01-01", "done late");
  h.exec("done", "3");
  assert.deepEqual(listJson(h).map((t) => [t.title, t.overdue]), [["yesterday", true], ["today", false], ["done late", false]]);
});

test("list orders overdue first (oldest due, then id), then open by priority, then done (#12 AC4)", () => {
  const h = dueHarness();
  h.exec("add", "--priority", "low", "--due", "2026-11-20", "late low"); // 1 overdue
  h.exec("add", "--priority", "high", "fresh high"); // 2
  h.exec("add", "--due", "2026-10-01", "oldest"); // 3 overdue
  h.exec("add", "--priority", "high", "--due", "2026-11-20", "late high"); // 4 overdue, same date as #1
  h.exec("add", "--priority", "low", "--due", "2027-01-01", "future low"); // 5
  h.exec("add", "--due", "today", "due today"); // 6
  h.exec("add", "--due", "2026-01-01", "done"); // 7
  h.exec("done", "7");
  assert.deepEqual(listJson(h).map((t) => t.id), [3, 1, 4, 2, 6, 5, 7]);
  h.exec("list", "--open", "--json");
  assert.deepEqual(JSON.parse(h.out.at(-1)!).map((t: Task) => t.id), [3, 1, 4, 2, 6, 5]);
});

test("human list shows due date and OVERDUE; --json has dueDate and overdue (#12 AC5)", () => {
  const h = dueHarness();
  h.exec("add", "--priority", "high", "--due", "2026-11-01", "late");
  h.exec("add", "--due", "2026-12-25", "later");
  h.exec("add", "plain");
  h.exec("add", "--priority", "low", "--due", "2026-01-01", "finished");
  h.exec("done", "4");
  h.exec("list");
  assert.deepEqual(h.out.slice(-4), [
    "[ ] ! #1 late (due 2026-11-01, OVERDUE)",
    "[ ]   #2 later (due 2026-12-25)",
    "[ ]   #3 plain",
    "[x] ↓ #4 finished (due 2026-01-01)",
  ]);
  const json = listJson(h);
  assert.deepEqual(json.map((t) => [t.id, t.dueDate, t.overdue]), [[1, "2026-11-01", true], [2, "2026-12-25", false], [3, undefined, false], [4, "2026-01-01", false]]);
  assert.equal("dueDate" in json[2]!, false);
});

test("help documents --due and todo due (#12 AC6)", () => {
  const h = harness();
  assert.equal(h.exec("help"), 0);
  const help = h.out.join("\n");
  assert.match(help, /todo add .*\[--due <date>\]/);
  assert.match(help, /todo due <id> <date\|none>/);
  assert.match(help, /YYYY-MM-DD, today, or tomorrow/);
  assert.match(help, /OVERDUE/);
});

// #12 — adversarial edge cases (test-engineer).
test("due rejects non-positive / non-integer ids and case-variant or relative keywords, file byte-identical (#12 AC2 edges)", () => {
  const h = dueHarness();
  h.exec("add", "--due", "2026-12-01", "existing");
  const before = readFileSync(h.env.TODO_FILE!, "utf8");
  const cases: string[][] = [["due", "0", "today"], ["due", "-1", "today"], ["due", "1.5", "today"], ["due", "", "today"], ["due", "1", ""], ["due", "1", "None"], ["due", "1", "NONE"], ["due", "1", "yesterday"], ["due", "1", "2026-11-31"]];
  for (const argv of cases) {
    assert.equal(h.exec(...argv), 1, JSON.stringify(argv));
    assert.equal(readFileSync(h.env.TODO_FILE!, "utf8"), before, JSON.stringify(argv));
  }
});

test("due none on a task without a due date succeeds and stores no dueDate key (#12 AC1 edge)", () => {
  const h = dueHarness();
  h.exec("add", "plain");
  assert.equal(h.exec("due", "1", "none"), 0);
  assert.equal(h.out.at(-1), "Due #1: none → none (plain)");
  assert.equal("dueDate" in JSON.parse(readFileSync(h.env.TODO_FILE!, "utf8")).tasks[0], false);
});

test("due on a done task with a past date never makes it overdue or moves it up (#12 AC3/AC4 edge)", () => {
  const h = dueHarness();
  h.exec("add", "open");
  h.exec("add", "finished");
  h.exec("done", "2");
  assert.equal(h.exec("due", "2", "2020-01-01"), 0);
  assert.deepEqual(listJson(h).map((t) => [t.id, t.overdue]), [[1, false], [2, false]]);
  h.exec("list");
  assert.equal(h.out.at(-1), "[x]   #2 finished (due 2020-01-01)");
});

test("overdue uses the local calendar date: just after local midnight yesterday's task is overdue (#12 AC3 edge)", () => {
  const h = dueHarness();
  h.exec("add", "--due", "2026-11-30", "due yesterday");
  const exec = (...argv: string[]) => run(argv, { out: (l) => h.out.push(l), err: (l) => h.err.push(l), env: h.env, now: () => new Date(2026, 11, 1, 0, 1) });
  exec("list", "--json");
  assert.equal(JSON.parse(h.out.at(-1)!)[0].overdue, true);
  const lateNight = (...argv: string[]) => run(argv, { out: (l) => h.out.push(l), err: (l) => h.err.push(l), env: h.env, now: () => new Date(2026, 10, 30, 23, 59) });
  lateNight("list", "--json");
  assert.equal(JSON.parse(h.out.at(-1)!)[0].overdue, false);
});

test("sortTasks without today treats nothing as overdue and does not mutate its input (#12 AC4 edge)", () => {
  const t = (id: number, extra: Partial<Task> = {}): Task => ({ id, title: `t${id}`, status: "open", createdAt: "", ...extra });
  const input = [t(1, { priority: "low", dueDate: "2000-01-01" }), t(2, { priority: "high" }), t(3, { status: "done" })];
  const snapshot = JSON.stringify(input);
  assert.deepEqual(sortTasks(input).map((x) => x.id), [2, 1, 3]);
  assert.deepEqual(sortTasks(input, "2026-11-30").map((x) => x.id), [1, 2, 3]);
  assert.equal(JSON.stringify(input), snapshot);
});

test("list --done --json reports overdue false even for past-due completed tasks (#12 AC5 edge)", () => {
  const h = dueHarness();
  h.exec("add", "--due", "2026-01-01", "old");
  h.exec("add", "--due", "2026-01-01", "late open");
  h.exec("done", "1");
  h.exec("list", "--done", "--json");
  assert.deepEqual(JSON.parse(h.out.at(-1)!).map((x: Task & { overdue: boolean }) => [x.id, x.dueDate, x.overdue]), [[1, "2026-01-01", false]]);
});
