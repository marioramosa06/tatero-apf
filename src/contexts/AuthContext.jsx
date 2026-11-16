import { createContext, useEffect, useState } from 'react'
import { AUTH_EXPIRED_EVENT } from '../utils/apiConfig'
import { clearOfflineUserCache } from '../utils/offlineStore'

export const AuthContext = createContext(null)

const getStoredUser = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('user'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(getStoredUser)

  const login = (nextToken, nextUser) => {
    if (typeof nextToken !== 'string' || !nextToken.trim()) return
    const safeUser =
      nextUser && typeof nextUser === 'object' && !Array.isArray(nextUser) ? nextUser : null
    localStorage.setItem('token', nextToken)
    localStorage.setItem('user', JSON.stringify(safeUser))
    setToken(nextToken)
    setUser(safeUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    clearOfflineUserCache()
    setToken(null)
    setUser(null)
  }

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}