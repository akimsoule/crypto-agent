import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './pages/App'
import InvestorDetail from './pages/InvestorDetail'

export default function AppRoutes(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App/>} />
        <Route path="/investor" element={<InvestorDetail/>} />
      </Routes>
    </BrowserRouter>
  )
}
