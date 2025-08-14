import InvestorsList from '../components/InvestorsList'

export default function App() {
  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-4">Crypto Investors</h1>
        <InvestorsList />
      </div>
    </div>
  )
}
