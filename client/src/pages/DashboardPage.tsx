import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, clearToken, type User } from '../api/auth'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {
        // token is missing, expired or fake
        clearToken()
        navigate('/login')
      })
  }, [navigate])

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  if (!user) {
    return <p>Loading...</p>
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Logged in as {user.email}</p>
      <button onClick={handleLogout}>Log out</button>
    </div>
  )
}