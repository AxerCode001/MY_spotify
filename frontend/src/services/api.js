import axios from 'axios'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error
    
    if (response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout()
      toast.error('Session expired. Please log in again.')
      window.location.href = '/login'
    } else if (response?.status === 403) {
      toast.error('Access denied')
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (response?.status === 429) {
      toast.error('Too many requests. Please slow down.')
    } else if (!response) {
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  updatePreferences: (preferences) => api.put('/auth/preferences', preferences),
  changePassword: (passwordData) => api.put('/auth/password', passwordData),
  deleteAccount: (passwordData) => api.delete('/auth/account', { data: passwordData }),
}

// Music API
export const musicAPI = {
  search: (query, params = {}) => api.get('/music/search', { params: { q: query, ...params } }),
  getTrack: (trackId) => api.get(`/music/tracks/${trackId}`),
  getPopular: (params = {}) => api.get('/music/popular', { params }),
  getMoodTracks: (mood, params = {}) => api.get(`/music/mood/${mood}`, { params }),
  getRecommendations: (params = {}) => api.get('/music/recommendations', { params }),
  getGenres: () => api.get('/music/genres'),
  
  // Artists
  searchArtists: (query, params = {}) => api.get('/music/artists/search', { params: { q: query, ...params } }),
  getArtist: (artistId) => api.get(`/music/artists/${artistId}`),
  getArtistTracks: (artistId, params = {}) => api.get(`/music/artists/${artistId}/tracks`, { params }),
  
  // Favorites
  getFavorites: (params = {}) => api.get('/music/favorites', { params }),
  addToFavorites: (trackId) => api.post(`/music/favorites/${trackId}`),
  removeFromFavorites: (trackId) => api.delete(`/music/favorites/${trackId}`),
  
  // Recently played
  getRecentlyPlayed: (params = {}) => api.get('/music/recently-played', { params }),
}

// Playlists API
export const playlistsAPI = {
  getMyPlaylists: (params = {}) => api.get('/playlists/my', { params }),
  getPublicPlaylists: (params = {}) => api.get('/playlists/public', { params }),
  getPlaylist: (playlistId) => api.get(`/playlists/${playlistId}`),
  createPlaylist: (playlistData) => api.post('/playlists', playlistData),
  updatePlaylist: (playlistId, updates) => api.put(`/playlists/${playlistId}`, updates),
  deletePlaylist: (playlistId) => api.delete(`/playlists/${playlistId}`),
  
  // Tracks
  addTrackToPlaylist: (playlistId, trackData) => api.post(`/playlists/${playlistId}/tracks`, trackData),
  removeTrackFromPlaylist: (playlistId, trackId) => api.delete(`/playlists/${playlistId}/tracks/${trackId}`),
  reorderTracks: (playlistId, trackIds) => api.put(`/playlists/${playlistId}/tracks/reorder`, { trackIds }),
  
  // Play
  playPlaylist: (playlistId) => api.post(`/playlists/${playlistId}/play`),
}

// Users API
export const usersAPI = {
  getUser: (userId) => api.get(`/users/${userId}`),
  searchUsers: (query, params = {}) => api.get('/users', { params: { q: query, ...params } }),
  getUserPlaylists: (userId, params = {}) => api.get(`/users/${userId}/playlists`, { params }),
  getUserStats: (userId) => api.get(`/users/${userId}/stats`),
  getTopUsers: (params = {}) => api.get('/users/top/creators', { params }),
}

// Helper functions
export const handleAPIError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.message) {
    return error.response.data.message
  } else if (error.message) {
    return error.message
  } else {
    return defaultMessage
  }
}

export const isNetworkError = (error) => {
  return !error.response && error.code === 'NETWORK_ERROR'
}

export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403
}

export default api