import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Session from './pages/Session'
import Login from './pages/Login'
import Signup from './pages/Signup'
import History from './pages/History'
import { AuthProvider } from './lib/auth'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session" element={<Session />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </AuthProvider>
  )
}
