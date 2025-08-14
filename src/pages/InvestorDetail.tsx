import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import axios from 'axios'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

type Snapshot = { id: string; timestamp: string; totalValue: number }
type Investment = { id: string; action: string; price: number; quantity: number; amount: number; timestamp: string; reason?: string }

type Investor = {
  id: string
  name: string
  description?: string
  initialBalance: number
  portfolioSnapshots?: Snapshot[]
  investments?: Investment[]
}

export default function InvestorDetail(){
  const [params] = useSearchParams()
  const id = params.get('id')
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    axios
      .get(`/.netlify/functions/investorDetail?id=${encodeURIComponent(id)}`)
      .then(res => setInvestor(res.data))
      .catch(err => setError(err?.message || 'Erreur'))
      .finally(() => setLoading(false))
  }, [id])

  if (!id) return <div className="p-6">ID manquant</div>
  if (loading) return <div className="p-6">Chargement...</div>
  if (error) return <div className="alert alert-error">Erreur: {error}</div>
  if (!investor) return <div className="p-6">Aucun investisseur trouvé</div>

  const snapshots = (investor.portfolioSnapshots || []).slice().reverse()
  const labels = snapshots.map(s => new Date(s.timestamp).toLocaleDateString())
  const data = snapshots.map(s => s.totalValue)

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">{investor.name}</h2>
      <p className="text-base-content/70 mb-4">{investor.description}</p>

      <div className="card bg-base-100 p-4 mb-4">
        <h3 className="font-semibold mb-2">Évolution du portefeuille</h3>
        {data.length > 1 ? (
          <Line
            data={{ labels, datasets: [{ label: 'Valeur totale', data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)' }] }}
          />
        ) : (
          <div className="text-sm text-base-content/60">Pas assez de snapshots pour afficher un graphique</div>
        )}
      </div>

      <div className="card bg-base-100 p-4">
        <h3 className="font-semibold mb-2">Historique des transactions</h3>
        <ul className="space-y-2">
          {(investor.investments || []).map(inv => (
            <li key={inv.id} className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{inv.action} {inv.quantity.toFixed(4)} @ ${inv.price.toFixed(4)}</div>
                <div className="text-sm text-base-content/60">{new Date(inv.timestamp).toLocaleString()}</div>
                {inv.reason && <div className="text-xs text-base-content/50">{inv.reason}</div>}
              </div>
              <div className="text-right font-mono">${inv.amount.toFixed(2)}</div>
            </li>
          ))}
          {(investor.investments || []).length === 0 && <li className="text-sm text-base-content/60">Aucune transaction</li>}
        </ul>
      </div>
    </div>
  )
}
