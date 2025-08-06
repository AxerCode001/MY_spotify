import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Auth store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: (userData, authToken) => {
        set({
          user: userData,
          token: authToken,
          isAuthenticated: true,
        })
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
        // Clear other stores
        useMusicPlayerStore.getState().reset()
      },
      
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }))
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// Music player store
export const useMusicPlayerStore = create(
  persist(
    (set, get) => ({
      // Current track
      currentTrack: null,
      currentPlaylist: null,
      queue: [],
      currentIndex: 0,
      
      // Player state
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      currentTime: 0,
      duration: 0,
      isLoading: false,
      
      // Playback modes
      shuffle: false,
      repeat: 'off', // 'off', 'one', 'all'
      
      // Actions
      setCurrentTrack: (track, playlist = null, index = 0) => {
        set({
          currentTrack: track,
          currentPlaylist: playlist,
          currentIndex: index,
          isLoading: true,
        })
      },
      
      setQueue: (tracks, startIndex = 0) => {
        set({
          queue: tracks,
          currentIndex: startIndex,
          currentTrack: tracks[startIndex] || null,
        })
      },
      
      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      
      setVolume: (volume) => {
        set({ volume, isMuted: volume === 0 })
      },
      
      toggleMute: () => {
        const state = get()
        if (state.isMuted) {
          set({ isMuted: false, volume: state.volume || 0.8 })
        } else {
          set({ isMuted: true, volume: 0 })
        }
      },
      
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      // Navigation
      nextTrack: () => {
        const state = get()
        const { queue, currentIndex, repeat, shuffle } = state
        
        if (!queue.length) return
        
        let nextIndex
        
        if (shuffle) {
          // Random track (but not current one)
          const availableIndices = queue.map((_, i) => i).filter(i => i !== currentIndex)
          nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
        } else if (repeat === 'one') {
          nextIndex = currentIndex
        } else if (repeat === 'all' && currentIndex === queue.length - 1) {
          nextIndex = 0
        } else if (currentIndex < queue.length - 1) {
          nextIndex = currentIndex + 1
        } else {
          return // No next track
        }
        
        set({
          currentIndex: nextIndex,
          currentTrack: queue[nextIndex],
          currentTime: 0,
          isLoading: true,
        })
      },
      
      previousTrack: () => {
        const state = get()
        const { queue, currentIndex, repeat } = state
        
        if (!queue.length) return
        
        let prevIndex
        
        if (repeat === 'all' && currentIndex === 0) {
          prevIndex = queue.length - 1
        } else if (currentIndex > 0) {
          prevIndex = currentIndex - 1
        } else {
          return // No previous track
        }
        
        set({
          currentIndex: prevIndex,
          currentTrack: queue[prevIndex],
          currentTime: 0,
          isLoading: true,
        })
      },
      
      toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
      
      setRepeat: (mode) => set({ repeat: mode }),
      
      toggleRepeat: () => {
        const modes = ['off', 'all', 'one']
        const currentMode = get().repeat
        const currentIndex = modes.indexOf(currentMode)
        const nextMode = modes[(currentIndex + 1) % modes.length]
        set({ repeat: nextMode })
      },
      
      // Seek to specific track in queue
      seekToTrack: (index) => {
        const state = get()
        if (index >= 0 && index < state.queue.length) {
          set({
            currentIndex: index,
            currentTrack: state.queue[index],
            currentTime: 0,
            isLoading: true,
          })
        }
      },
      
      // Add track to queue
      addToQueue: (track) => {
        set((state) => ({
          queue: [...state.queue, track]
        }))
      },
      
      // Remove track from queue
      removeFromQueue: (index) => {
        set((state) => {
          const newQueue = state.queue.filter((_, i) => i !== index)
          let newCurrentIndex = state.currentIndex
          
          if (index < state.currentIndex) {
            newCurrentIndex = state.currentIndex - 1
          } else if (index === state.currentIndex) {
            if (newQueue.length === 0) {
              return {
                queue: [],
                currentTrack: null,
                currentIndex: 0,
                isPlaying: false,
              }
            } else if (newCurrentIndex >= newQueue.length) {
              newCurrentIndex = 0
            }
          }
          
          return {
            queue: newQueue,
            currentIndex: newCurrentIndex,
            currentTrack: newQueue[newCurrentIndex] || null,
          }
        })
      },
      
      // Clear queue
      clearQueue: () => {
        set({
          queue: [],
          currentTrack: null,
          currentIndex: 0,
          isPlaying: false,
          currentTime: 0,
        })
      },
      
      // Reset player
      reset: () => {
        set({
          currentTrack: null,
          currentPlaylist: null,
          queue: [],
          currentIndex: 0,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          isLoading: false,
        })
      },
    }),
    {
      name: 'music-player-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        shuffle: state.shuffle,
        repeat: state.repeat,
      }),
    }
  )
)

// UI store for general UI state
export const useUIStore = create((set) => ({
  // Theme
  theme: 'light',
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),
  setTheme: (theme) => set({ theme }),
  
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // Modals
  modals: {},
  openModal: (modalName, data = null) => set((state) => ({
    modals: { ...state.modals, [modalName]: { open: true, data } }
  })),
  closeModal: (modalName) => set((state) => ({
    modals: { ...state.modals, [modalName]: { open: false, data: null } }
  })),
  
  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // Loading states
  loading: {},
  setLoading: (key, loading) => set((state) => ({
    loading: { ...state.loading, [key]: loading }
  })),
}))

// Favorites store
export const useFavoritesStore = create((set, get) => ({
  favorites: [],
  
  setFavorites: (favorites) => set({ favorites }),
  
  addFavorite: (track) => {
    set((state) => {
      const exists = state.favorites.some(fav => fav.trackId === track.trackId)
      if (!exists) {
        return { favorites: [...state.favorites, track] }
      }
      return state
    })
  },
  
  removeFavorite: (trackId) => {
    set((state) => ({
      favorites: state.favorites.filter(fav => fav.trackId !== trackId)
    }))
  },
  
  isFavorite: (trackId) => {
    const state = get()
    return state.favorites.some(fav => fav.trackId === trackId)
  },
}))

// Playlists store
export const usePlaylistsStore = create((set, get) => ({
  playlists: [],
  currentPlaylist: null,
  
  setPlaylists: (playlists) => set({ playlists }),
  
  addPlaylist: (playlist) => {
    set((state) => ({
      playlists: [playlist, ...state.playlists]
    }))
  },
  
  updatePlaylist: (playlistId, updates) => {
    set((state) => ({
      playlists: state.playlists.map(p => 
        p.id === playlistId ? { ...p, ...updates } : p
      )
    }))
  },
  
  removePlaylist: (playlistId) => {
    set((state) => ({
      playlists: state.playlists.filter(p => p.id !== playlistId)
    }))
  },
  
  setCurrentPlaylist: (playlist) => set({ currentPlaylist: playlist }),
}))

export default {
  useAuthStore,
  useMusicPlayerStore,
  useUIStore,
  useFavoritesStore,
  usePlaylistsStore,
}