import { test } from "node:test";
import assert from "node:assert/strict";
import { taskStats } from "../src/domain/stats.ts";
import type { Task } from "../src/domain/task.ts";

const t = (id: number, status: Task["status"]): Task => ({ id, title: `t${id}`, status, createdAt: "2026-11-01T00:00:00.000Z" });

test("taskStats counts open and done tasks and the percentage done", () => {
  assert.deepEqual(taskStats([t(1, "open"), t(2, "done")]), { total: 2, open: 1, done: 1, percentDone: 50 });
});
