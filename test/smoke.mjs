// Release smoke test against the built CLI: add → list --json → done → help.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bin = process.argv[2] ?? "dist/cli/main.js";
const env = { ...process.env, TODO_FILE: join(mkdtempSync(join(tmpdir(), "todo-smoke-")), "tasks.json") };
const todo = (...args) => execFileSync(process.execPath, [bin, ...args], { env, encoding: "utf8" });

todo("add", "smoke task");
const tasks = JSON.parse(todo("list", "--json"));
if (tasks.length !== 1 || tasks[0].title !== "smoke task") throw new Error("smoke: list --json mismatch");
todo("done", "1");
if (JSON.parse(todo("list", "--json"))[0].status !== "done") throw new Error("smoke: done failed");
if (!todo("help").includes("Usage:")) throw new Error("smoke: help missing");
console.log("smoke: ok");
