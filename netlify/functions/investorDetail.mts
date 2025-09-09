import { endpoint, json } from './_lib/middleware.mts'

// Helpers locaux (limiter l'impact sur le reste du code)
function toNum(v: unknown, def = 0): number {
  if (v === null || v === undefined) return def
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : def
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.floor(ms / 86_400_000)
}

export default endpoint({
  methods: ['GET'],
  auth: false,
  handler: async ({ req, prisma }) => {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return json({ success: false, error: 'Param id requis' }, 400)

    // Récupération du profil + relations nécessaires
    const profile = await prisma.investorProfile.findUnique({
      where: { id },
      include: {
        Position: true,
        Order: {
          orderBy: { createdAt: 'desc' },
          take: 50 // limiter pour l'instant
        },
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!profile) return json({ success: false, error: 'Investor introuvable' }, 404)

    // Conversion des positions en structure "front"
    const now = new Date()
    const positions = profile.Position.map(pos => {
      const openPrice = toNum(pos.openPriceAvg)
      const markPrice = toNum(pos.markPrice)
      const unrealized = toNum(pos.unrealizedPL)
      // Pourcent : (mark - open)/open * 100 (ajuster SHORT)
      let pct = 0
      if (openPrice > 0) {
        const raw = ((markPrice - openPrice) / openPrice) * 100
        pct = pos.holdSide?.toUpperCase() === 'SHORT' ? -raw : raw
      }
      const createdAt = pos.createdAt ?? now
      return {
        id: pos.id, // NOTE: front a un type number, mais l'id Prisma est une string
        snapshotId: 0, // pas de lien direct pour l'instant
        coinId: pos.symbol,
        symbol: pos.symbol,
        name: pos.symbol,
        quantity: toNum(pos.available) + toNum(pos.locked),
        avgBuyPrice: openPrice,
        currentPrice: markPrice,
        unrealizedPnL: unrealized,
        unrealizedPnLPercent: pct,
        daysSinceEntry: daysBetween(createdAt, now),
        lastUpdated: (pos.updatedAt ?? now).toISOString()
      }
    })

    // Agrégations de base
    const totalUnrealized = positions.reduce((acc, p) => acc + p.unrealizedPnL, 0)
    // Valeur approximative: balance initiale + PnL latent (en attendant un suivi de balance réel)
    const initialBalance = profile.initialBalance ?? 0
    const totalValue = initialBalance + totalUnrealized
    const totalReturn = totalValue - initialBalance
    const totalReturnPercent = initialBalance > 0 ? (totalReturn / initialBalance) * 100 : 0

    // Construction d'un snapshot courant synthétique
    const currentSnapshot = {
      id: 0, // synthétique (pas stocké en DB)
      investorId: profile.id,
      timestamp: new Date().toISOString(),
      totalValue,
      cashBalance: initialBalance, // placeholder (à raffiner si on suit le cash réellement)
      totalReturn,
      totalReturnPercent,
      winRate: 0, // nécessite historique de trades fermés
      avgWinPercent: 0,
      avgLossPercent: 0,
      maxDrawdown: 0, // nécessite série temporelle
      totalTrades: profile.Order.length, // approximatif
      winningTrades: 0,
      losingTrades: 0,
      activePositions: positions.length,
      positions
    }

    // Adaptation des snapshots historiques si des métriques sont présentes
    const historical = profile.snapshots.map(s => {
      const metrics = (s.metrics as any) || {}
      return {
        id: 1, // placeholder uniforme (le front n'utilise peut-être pas encore l'id réel)
        investorId: profile.id,
        timestamp: s.createdAt.toISOString(),
        totalValue: toNum(metrics.totalValue),
        cashBalance: toNum(metrics.cashBalance),
        totalReturn: toNum(metrics.totalReturn),
        totalReturnPercent: toNum(metrics.totalReturnPercent),
        winRate: toNum(metrics.winRate),
        avgWinPercent: toNum(metrics.avgWinPercent),
        avgLossPercent: toNum(metrics.avgLossPercent),
        maxDrawdown: toNum(metrics.maxDrawdown),
        totalTrades: toNum(metrics.totalTrades),
        winningTrades: toNum(metrics.winningTrades),
        losingTrades: toNum(metrics.losingTrades),
        activePositions: toNum(metrics.activePositions),
        positions: []
      }
    })

    // Investments : on dérive des Orders récentes (structure minimaliste)
    const investments = profile.Order.slice(0, 20).map(o => ({
      id: o.orderId,
      investorId: profile.id,
      coinId: o.symbol,
      symbol: o.symbol,
      timestamp: o.createdAt.toISOString()
    }))

    return {
      id: profile.id,
      name: profile.name,
      type: profile.type,
      riskTolerance: profile.riskTolerance ?? 0,
      maxPositionSize: profile.maxPositionSize ?? 0,
      holdingPeriod: 0,
      sellThreshold: 0,
      stopLoss: 0,
      sentimentWeight: 0,
      technicalWeight: 0,
      description: profile.strategyName,
      initialBalance,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      investments,
      portfolioSnapshots: [currentSnapshot, ...historical]
    }
  }
})
