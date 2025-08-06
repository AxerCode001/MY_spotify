import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from './store'
import { authAPI } from './services/api'

// Layout components
import Layout from './components/Layout/Layout'
import AuthLayout from './components/Layout/AuthLayout'

// Pages
import Home from './pages/Home'
import Search from './pages/Search'
import Library from './pages/Library'
import Playlist from './pages/Playlist'
import Artist from './pages/Artist'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

// Auth pages
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

// Components
import MusicPlayer from './components/Player/MusicPlayer'
import ProtectedRoute from './components/Common/ProtectedRoute'

function App() {
  const { isAuthenticated, token, updateUser } = useAuthStore()
  const { theme, setTheme } = useUIStore()

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [setTheme])

  // Apply theme changes
  useEffect(() => {
    localStorage.setItem('theme', theme)
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Update CSS custom properties for toast
    document.documentElement.style.setProperty(
      '--toast-bg',
      theme === 'dark' ? '#1e293b' : '#ffffff'
    )
    document.documentElement.style.setProperty(
      '--toast-color',
      theme === 'dark' ? '#f1f5f9' : '#0f172a'
    )
  }, [theme])

  // Fetch user data on app load if authenticated
  useEffect(() => {
    const fetchUserData = async () => {
      if (isAuthenticated && token) {
        try {
          const response = await authAPI.getMe()
          updateUser(response.data.user)
        } catch (error) {
          console.error('Failed to fetch user data:', error)
          // Token might be invalid, let the interceptor handle logout
        }
      }
    }

    fetchUserData()
  }, [isAuthenticated, token, updateUser])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100">
      <Routes>
        {/* Auth routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <AuthLayout>
                <Login />
              </AuthLayout>
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <AuthLayout>
                <Register />
              </AuthLayout>
            )
          }
        />

        {/* Main app routes */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/playlist/:id" element={<Playlist />} />
                <Route path="/artist/:id" element={<Artist />} />
                <Route path="/profile/:id" element={<Profile />} />

                {/* Protected routes */}
                <Route
                  path="/library"
                  element={
                    <ProtectedRoute>
                      <Library />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>

      {/* Global music player */}
      <MusicPlayer />
    </div>
  )
}

export default App