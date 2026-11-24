import { simulateSessions } from "../src/game/soundDetective/simulate.ts";

const result = simulateSessions();
console.log(`${result.passed}/${result.sessions} sessions passed · ${result.challenges} challenges · ${result.errors.length} errors`);
for (const error of result.errors) console.error(error);
if (result.errors.length) process.exitCode = 1;
