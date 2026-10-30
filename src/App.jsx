import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Homepage from './pages/Homepage'
import DailyReports from './pages/DailyReports'
import WeeklyReports from './pages/WeeklyReports'
import MonthlyReports from './pages/MonthlyReports'
import About from './pages/About'
import SignIn from './pages/SingIn'
import SignUp from './pages/SignUp'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path='/' element={<Homepage />} />
            <Route path='/invoices/new' element={<ProtectedRoute><DailyReports /></ProtectedRoute>} />
            <Route path='/reports/week' element={<ProtectedRoute><WeeklyReports /></ProtectedRoute>} />
            <Route path='/reports/month' element={<ProtectedRoute><MonthlyReports /></ProtectedRoute>} />
            <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path='/about' element={<About />} />
            <Route path='/signin' element={<SignIn />} />
            <Route path='/signup' element={<SignUp />} />
            <Route path='*' element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App