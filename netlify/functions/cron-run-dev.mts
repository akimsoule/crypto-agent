import type { Config } from '@netlify/functions'
import runDev from '../trade.app/src/main/Second/Prod/runDev'

export default async (req: Request) => {
  // Netlify envoie un body JSON avec next_run
  let next_run: string | undefined
  try {
    const body = await req.json().catch(() => ({} as any))
    next_run = body?.next_run
  } catch {}
  console.log('[cron-run-dev] start', { next_run })
  try {
    await runDev()
    console.log('[cron-run-dev] done')
  } catch (e) {
    console.error('[cron-run-dev] error', e)
  }
}

export const config: Config = {
  schedule: '*/15 * * * *'
}
