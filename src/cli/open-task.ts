import { exec } from "node:child_process";

/** Open a web search for a task title in the default browser. */
export function searchWeb(title: string): void {
  exec(`open "https://www.google.com/search?q=${title}"`);
}
