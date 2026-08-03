import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Session from './pages/Session'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/session" element={<Session />} />
    </Routes>
  )
}
