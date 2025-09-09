#!/usr/bin/env tsx
/**
 * Simule un slot cron unique (15 min) avec un runId.
 * - Génère un runId déterministe basé sur l'intervalle 15m actuel
 * - Charge runDev
 * - Log JSON structuré début/fin
 */
import { runDev } from '../netlify/trade.app/src/main/Second/Prod/runDev.js';

function getSlotKey(date = new Date()): number {
  return Math.floor(date.getTime() / (15 * 60 * 1000));
}

async function main() {
  const start = Date.now();
  const slotKey = getSlotKey();
  const runId = `cron-${slotKey}`;
  const payload = { scope: 'dev:cron:once', runId, slotKey, appEnv: process.env.APP_ENV };
  console.log(JSON.stringify({ ...payload, event: 'start', ts: new Date().toISOString() }));
  try {
    await runDev();
    const durationMs = Date.now() - start;
    console.log(JSON.stringify({ ...payload, event: 'end', status: 'OK', durationMs }));
  } catch (e) {
    const durationMs = Date.now() - start;
    console.error(JSON.stringify({ ...payload, event: 'end', status: 'ERROR', error: (e as Error).message, durationMs }));
    process.exitCode = 1;
  }
}

main();
