import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

type Investment = {
  id: string
  action: 'BUY' | 'SELL' | string
  amount: number
  price: number
  quantity: number
  timestamp: string
  reason?: string
}

type Snapshot = {
  id: string
  timestamp: string
  totalValue: number
}

type Investor = {
  id: string
  name: string
  description?: string
  initialBalance: number
  investments?: Investment[]
  portfolioSnapshots?: Snapshot[]
}

export default function InvestorsList() {
  const [investors, setInvestors] = useState<Investor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    axios
      .get('/.netlify/functions/investors')
      .then((res) => {
        if (!mounted) return
        setInvestors(res.data || [])
      })
      .catch((err) => {
        console.error(err)
        setError(err?.message || 'Erreur réseau')
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <div className="flex items-center justify-center p-8">Chargement...</div>
  if (error) return <div className="alert alert-error">Erreur: {error}</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {investors.map((inv) => {
        const lastSnapshot = inv.portfolioSnapshots?.[0]
        const totalValue = lastSnapshot?.totalValue ?? inv.initialBalance
        const returnPct = inv.initialBalance
          ? (((totalValue - inv.initialBalance) / inv.initialBalance) * 100).toFixed(2)
          : '0.00'

        return (
          <div key={inv.id} className="card bg-base-100 shadow hover:shadow-lg transition">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="card-title">{inv.name}</h2>
                  <p className="text-sm text-base-content/70">{inv.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm">Valeur actuelle</div>
                  <div className="text-xl font-mono">${totalValue.toLocaleString()}</div>
                  <div className={`text-sm ${Number(returnPct) >= 0 ? 'text-success' : 'text-error'}`}>
                    {Number(returnPct) >= 0 ? '+' : ''}{returnPct}%
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-semibold text-xs">Dernières actions</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {(inv.investments || []).slice(0, 4).map((it) => (
                    <li key={it.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${it.action === 'BUY' ? 'badge-primary' : 'badge-ghost'}`}>{it.action}</span>
                        <span className="truncate w-40">{it.quantity.toFixed(4)} @ ${it.price.toFixed(4)}</span>
                      </div>
                      <div className="text-xs text-base-content/60">{new Date(it.timestamp).toLocaleDateString()}</div>
                    </li>
                  ))}
                  {(!inv.investments || inv.investments.length === 0) && (
                    <li className="text-sm text-base-content/60">Aucune action enregistrée</li>
                  )}
                </ul>
              </div>

              <div className="card-actions justify-end mt-4">
                <Link to={`/investor?id=${encodeURIComponent(inv.id)}`} className="btn btn-sm btn-outline">Voir le détail</Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
