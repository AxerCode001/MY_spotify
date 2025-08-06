import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { musicAPI, playlistsAPI, authAPI, usersAPI } from '../services/api'
import { useMusicPlayerStore, useFavoritesStore, usePlaylistsStore } from '../store'
import { debounce } from '../utils'

// Audio hook for music player
export const useAudio = (src, options = {}) => {
  const audioRef = useRef(null)
  const [state, setState] = useState({
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isLoading: false,
    error: null,
  })

  const { onTimeUpdate, onLoadedMetadata, onEnded, onError, onLoadStart, onCanPlay } = options

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }))
      onTimeUpdate?.(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setState(prev => ({ ...prev, duration: audio.duration, isLoading: false }))
      onLoadedMetadata?.(audio.duration)
    }

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }))
      onEnded?.()
    }

    const handleError = (e) => {
      setState(prev => ({ ...prev, error: e.target.error, isLoading: false }))
      onError?.(e.target.error)
    }

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      onLoadStart?.()
    }

    const handleCanPlay = () => {
      setState(prev => ({ ...prev, isLoading: false }))
      onCanPlay?.()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [onTimeUpdate, onLoadedMetadata, onEnded, onError, onLoadStart, onCanPlay])

  useEffect(() => {
    if (audioRef.current && src) {
      audioRef.current.src = src
      audioRef.current.load()
    }
  }, [src])

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setState(prev => ({ ...prev, isPlaying: true })))
        .catch(error => setState(prev => ({ ...prev, error })))
    }
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setState(prev => ({ ...prev, isPlaying: false }))
    }
  }, [])

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  const setVolume = useCallback((volume) => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [])

  return {
    ...state,
    play,
    pause,
    seek,
    setVolume,
    audio: audioRef.current,
  }
}

// Search hook with debouncing
export const useSearch = (initialQuery = '', delay = 300) => {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  const debouncedSetQuery = useCallback(
    debounce((value) => setDebouncedQuery(value), delay),
    [delay]
  )

  useEffect(() => {
    debouncedSetQuery(query)
  }, [query, debouncedSetQuery])

  const { data: searchResults, isLoading, error } = useQuery(
    ['search', debouncedQuery],
    () => musicAPI.search(debouncedQuery),
    {
      enabled: debouncedQuery.length > 0,
      keepPreviousData: true,
    }
  )

  return {
    query,
    setQuery,
    searchResults: searchResults?.data || null,
    isLoading,
    error,
  }
}

// Favorites hook
export const useFavorites = () => {
  const queryClient = useQueryClient()
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore()

  const { data: favorites, isLoading } = useQuery(
    'favorites',
    () => musicAPI.getFavorites(),
    {
      onSuccess: (data) => {
        useFavoritesStore.getState().setFavorites(data.data.tracks)
      },
    }
  )

  const addToFavoritesMutation = useMutation(
    (trackId) => musicAPI.addToFavorites(trackId),
    {
      onSuccess: (data, trackId) => {
        const track = { trackId, ...data.data.track }
        addFavorite(track)
        queryClient.invalidateQueries('favorites')
      },
    }
  )

  const removeFromFavoritesMutation = useMutation(
    (trackId) => musicAPI.removeFromFavorites(trackId),
    {
      onSuccess: (data, trackId) => {
        removeFavorite(trackId)
        queryClient.invalidateQueries('favorites')
      },
    }
  )

  const toggleFavorite = useCallback((track) => {
    if (isFavorite(track.id)) {
      removeFromFavoritesMutation.mutate(track.id)
    } else {
      addToFavoritesMutation.mutate(track.id)
    }
  }, [isFavorite, addToFavoritesMutation, removeFromFavoritesMutation])

  return {
    favorites: favorites?.data?.tracks || [],
    isLoading,
    isFavorite,
    toggleFavorite,
    isToggling: addToFavoritesMutation.isLoading || removeFromFavoritesMutation.isLoading,
  }
}

// Playlists hook
export const usePlaylists = () => {
  const queryClient = useQueryClient()
  const { setPlaylists, addPlaylist, updatePlaylist, removePlaylist } = usePlaylistsStore()

  const { data: playlists, isLoading } = useQuery(
    'my-playlists',
    () => playlistsAPI.getMyPlaylists(),
    {
      onSuccess: (data) => {
        setPlaylists(data.data.playlists)
      },
    }
  )

  const createPlaylistMutation = useMutation(
    (playlistData) => playlistsAPI.createPlaylist(playlistData),
    {
      onSuccess: (data) => {
        addPlaylist(data.data.playlist)
        queryClient.invalidateQueries('my-playlists')
      },
    }
  )

  const updatePlaylistMutation = useMutation(
    ({ id, ...updates }) => playlistsAPI.updatePlaylist(id, updates),
    {
      onSuccess: (data, variables) => {
        updatePlaylist(variables.id, data.data.playlist)
        queryClient.invalidateQueries('my-playlists')
        queryClient.invalidateQueries(['playlist', variables.id])
      },
    }
  )

  const deletePlaylistMutation = useMutation(
    (playlistId) => playlistsAPI.deletePlaylist(playlistId),
    {
      onSuccess: (data, playlistId) => {
        removePlaylist(playlistId)
        queryClient.invalidateQueries('my-playlists')
      },
    }
  )

  return {
    playlists: playlists?.data?.playlists || [],
    isLoading,
    createPlaylist: createPlaylistMutation.mutate,
    updatePlaylist: updatePlaylistMutation.mutate,
    deletePlaylist: deletePlaylistMutation.mutate,
    isCreating: createPlaylistMutation.isLoading,
    isUpdating: updatePlaylistMutation.isLoading,
    isDeleting: deletePlaylistMutation.isLoading,
  }
}

// Music player hook
export const useMusicPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    queue,
    shuffle,
    repeat,
    setCurrentTrack,
    setQueue,
    play,
    pause,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    seekToTrack,
  } = useMusicPlayerStore()

  const playTrack = useCallback((track, playlist = null, queueTracks = []) => {
    if (queueTracks.length > 0) {
      const trackIndex = queueTracks.findIndex(t => t.id === track.id)
      setQueue(queueTracks, trackIndex >= 0 ? trackIndex : 0)
    } else {
      setCurrentTrack(track, playlist)
    }
  }, [setCurrentTrack, setQueue])

  const playPlaylist = useCallback((playlist, startIndex = 0) => {
    if (playlist.tracks && playlist.tracks.length > 0) {
      setQueue(playlist.tracks, startIndex)
    }
  }, [setQueue])

  return {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    queue,
    shuffle,
    repeat,
    play,
    pause,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    seekToTrack,
    playTrack,
    playPlaylist,
  }
}

// Window size hook
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  })

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return windowSize
}

// Local storage hook
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setValue]
}

// Intersection observer hook
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState(null)
  const elementRef = useRef(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        setEntry(entry)
      },
      options
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [options])

  return [elementRef, isIntersecting, entry]
}

// Click outside hook
export const useClickOutside = (callback) => {
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [callback])

  return ref
}

// Keyboard shortcut hook
export const useKeyboardShortcut = (keys, callback, options = {}) => {
  const { target = document, event = 'keydown' } = options

  useEffect(() => {
    const handleKeyPress = (e) => {
      const keyArray = Array.isArray(keys) ? keys : [keys]
      const pressedKeys = []

      if (e.ctrlKey) pressedKeys.push('ctrl')
      if (e.metaKey) pressedKeys.push('cmd')
      if (e.shiftKey) pressedKeys.push('shift')
      if (e.altKey) pressedKeys.push('alt')
      pressedKeys.push(e.key.toLowerCase())

      const isMatch = keyArray.every(key => pressedKeys.includes(key.toLowerCase()))

      if (isMatch) {
        e.preventDefault()
        callback(e)
      }
    }

    target.addEventListener(event, handleKeyPress)
    return () => target.removeEventListener(event, handleKeyPress)
  }, [keys, callback, target, event])
}

export default {
  useAudio,
  useSearch,
  useFavorites,
  usePlaylists,
  useMusicPlayer,
  useWindowSize,
  useLocalStorage,
  useIntersectionObserver,
  useClickOutside,
  useKeyboardShortcut,
}