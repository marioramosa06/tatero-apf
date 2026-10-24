import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Homepage from './pages/Homepage'
import DailyReports from './pages/DailyReports'
import WeeklyReports from './pages/WeeklyReports'
import MonthlyReports from './pages/MonthlyReports'
import About from './pages/About'
import SignIn from './pages/SingIn'
import SignUp from './pages/SignUp'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path='/' element={<Homepage />} />
          <Route path='/invoices/day/new' element={<DailyReports />} />
          <Route path='/invoices/week' element={<WeeklyReports />} />
          <Route path='/invoices/month' element={<MonthlyReports />} />
          <Route path='/about' element={<About />} />
          <Route path='/signin' element={<SignIn />} />
          <Route path='/signup' element={<SignUp />} />

        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App