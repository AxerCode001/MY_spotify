const axios = require('axios');

class MusicAPIService {
  constructor() {
    this.jamendoClientId = process.env.JAMENDO_CLIENT_ID;
    this.jamendoBaseUrl = 'https://api.jamendo.com/v3.0';
    
    // Cache for API responses (simple in-memory cache)
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Generic cache helper
  getCacheKey(endpoint, params) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  async getCachedOrFetch(cacheKey, fetchFunction) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await fetchFunction();
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  // Jamendo API methods
  async searchTracks(query, options = {}) {
    const {
      limit = 20,
      offset = 0,
      order = 'popularity_total',
      tags = '',
      speed = '',
      vocalinstrumental = '',
      gender = '',
      lang = ''
    } = options;

    const cacheKey = this.getCacheKey('search_tracks', { query, ...options });

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const params = {
          client_id: this.jamendoClientId,
          format: 'json',
          limit,
          offset,
          order,
          search: query,
          include: 'musicinfo',
          audioformat: 'mp32'
        };

        if (tags) params.tags = tags;
        if (speed) params.speed = speed;
        if (vocalinstrumental) params.vocalinstrumental = vocalinstrumental;
        if (gender) params.gender = gender;
        if (lang) params.lang = lang;

        const response = await axios.get(`${this.jamendoBaseUrl}/tracks`, { params });
        
        return {
          tracks: response.data.results.map(track => this.formatTrack(track)),
          total: response.data.headers?.results_count || response.data.results.length,
          hasMore: response.data.results.length === limit
        };
      } catch (error) {
        console.error('Jamendo search error:', error.response?.data || error.message);
        return { tracks: [], total: 0, hasMore: false };
      }
    });
  }

  async getTrackById(trackId) {
    const cacheKey = this.getCacheKey('track_detail', { trackId });

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${this.jamendoBaseUrl}/tracks`, {
          params: {
            client_id: this.jamendoClientId,
            format: 'json',
            id: trackId,
            include: 'musicinfo',
            audioformat: 'mp32'
          }
        });

        return response.data.results.length > 0 
          ? this.formatTrack(response.data.results[0])
          : null;
      } catch (error) {
        console.error('Jamendo track detail error:', error.response?.data || error.message);
        return null;
      }
    });
  }

  async getTracksByArtist(artistId, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const cacheKey = this.getCacheKey('artist_tracks', { artistId, limit, offset });

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${this.jamendoBaseUrl}/tracks`, {
          params: {
            client_id: this.jamendoClientId,
            format: 'json',
            artist_id: artistId,
            limit,
            offset,
            include: 'musicinfo',
            audioformat: 'mp32',
            order: 'popularity_total'
          }
        });

        return {
          tracks: response.data.results.map(track => this.formatTrack(track)),
          total: response.data.headers?.results_count || response.data.results.length,
          hasMore: response.data.results.length === limit
        };
      } catch (error) {
        console.error('Jamendo artist tracks error:', error.response?.data || error.message);
        return { tracks: [], total: 0, hasMore: false };
      }
    });
  }

  async getTracksByMood(mood, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    // Map our mood categories to Jamendo tags
    const moodToTags = {
      'happy': 'happy energetic upbeat',
      'sad': 'sad melancholy emotional',
      'relaxed': 'chill ambient peaceful calm',
      'energetic': 'energetic upbeat dance electronic',
      'focus': 'instrumental ambient study focus',
      'party': 'dance party upbeat electronic',
      'chill': 'chill lounge ambient downtempo'
    };

    const tags = moodToTags[mood] || '';
    const cacheKey = this.getCacheKey('mood_tracks', { mood, limit, offset });

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${this.jamendoBaseUrl}/tracks`, {
          params: {
            client_id: this.jamendoClientId,
            format: 'json',
            tags,
            limit,
            offset,
            include: 'musicinfo',
            audioformat: 'mp32',
            order: 'popularity_total',
            tagsmode: 'any'
          }
        });

        return {
          tracks: response.data.results.map(track => this.formatTrack(track)),
          total: response.data.headers?.results_count || response.data.results.length,
          hasMore: response.data.results.length === limit
        };
      } catch (error) {
        console.error('Jamendo mood tracks error:', error.response?.data || error.message);
        return { tracks: [], total: 0, hasMore: false };
      }
    });
  }

  async getPopularTracks(options = {}) {
    const { limit = 20, offset = 0 } = options;
    const cacheKey = this.getCacheKey('popular_tracks', { limit, offset });

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${this.jamendoBaseUrl}/tracks`, {
          params: {
            client_id: this.jamendoClientId,
            format: 'json',
            limit,
            offset,
            include: 'musicinfo',
            audioformat: 'mp32',
            order: 'popularity_total'
          }
        });

        return {
          tracks: response.data.results.map(track => this.formatTrack(track)),
          total: response.data.headers?.results_count || response.data.results.length,
          hasMore: response.data.results.length === limit
        };
      } catch (error) {
        console.error('Jamendo popular tracks error:', error.response?.data || error.message);
        return { tracks: [], total: 0, hasMore: false };
      }
    });
  }

  async searchArtists(query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const cacheKey = this.getCacheKey('search_artists', { query, limit, offset });

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${this.jamendoBaseUrl}/artists`, {
          params: {
            client_id: this.jamendoClientId,
            format: 'json',
            search: query,
            limit,
            offset,
            order: 'popularity_total'
          }
        });

        return {
          artists: response.data.results.map(artist => this.formatArtist(artist)),
          total: response.data.headers?.results_count || response.data.results.length,
          hasMore: response.data.results.length === limit
        };
      } catch (error) {
        console.error('Jamendo artist search error:', error.response?.data || error.message);
        return { artists: [], total: 0, hasMore: false };
      }
    });
  }

  async getArtistById(artistId) {
    const cacheKey = this.getCacheKey('artist_detail', { artistId });

    return this.getCachedOrFetch(cacheKey, async () => {
      try {
        const response = await axios.get(`${this.jamendoBaseUrl}/artists`, {
          params: {
            client_id: this.jamendoClientId,
            format: 'json',
            id: artistId
          }
        });

        return response.data.results.length > 0 
          ? this.formatArtist(response.data.results[0])
          : null;
      } catch (error) {
        console.error('Jamendo artist detail error:', error.response?.data || error.message);
        return null;
      }
    });
  }

  // Format track data to our standard format
  formatTrack(track) {
    return {
      id: track.id.toString(),
      title: track.name,
      artist: track.artist_name,
      artistId: track.artist_id.toString(),
      duration: track.duration ? parseInt(track.duration) : 0,
      audioUrl: track.audio || '',
      imageUrl: track.image || track.album_image || '',
      albumName: track.album_name || '',
      albumId: track.album_id ? track.album_id.toString() : '',
      genre: track.musicinfo?.tags?.genres?.[0]?.name || '',
      tags: track.musicinfo?.tags?.genres?.map(g => g.name) || [],
      releaseDate: track.releasedate || '',
      license: track.license_ccurl || 'Creative Commons',
      downloadUrl: track.audiodownload || '',
      shareUrl: track.shareurl || '',
      waveform: track.waveform || '',
      bpm: track.musicinfo?.bpm || null,
      vocalInstrumental: track.musicinfo?.vocalinstrumental || 'unknown',
      lang: track.musicinfo?.lang || 'en',
      speed: track.musicinfo?.speed || 'medium',
      acoustic: track.musicinfo?.acousticelectric || 'unknown'
    };
  }

  // Format artist data to our standard format
  formatArtist(artist) {
    return {
      id: artist.id.toString(),
      name: artist.name,
      image: artist.image || '',
      website: artist.website || '',
      joindate: artist.joindate || '',
      country: artist.country || '',
      bio: artist.bio || '',
      shareurl: artist.shareurl || '',
      shorturl: artist.shorturl || ''
    };
  }

  // Get recommendations based on user preferences
  async getRecommendations(userPreferences = {}, options = {}) {
    const { limit = 20, offset = 0 } = options;
    const { favoriteGenres = [], preferredMood = 'happy' } = userPreferences;

    try {
      // Get tracks based on preferred mood
      const moodTracks = await this.getTracksByMood(preferredMood, { limit: Math.ceil(limit / 2), offset });
      
      // Get popular tracks if we need more
      let additionalTracks = [];
      if (moodTracks.tracks.length < limit) {
        const needed = limit - moodTracks.tracks.length;
        const popularTracks = await this.getPopularTracks({ limit: needed, offset });
        additionalTracks = popularTracks.tracks;
      }

      return {
        tracks: [...moodTracks.tracks, ...additionalTracks].slice(0, limit),
        total: moodTracks.total + additionalTracks.length,
        hasMore: moodTracks.hasMore || additionalTracks.length > 0
      };
    } catch (error) {
      console.error('Recommendations error:', error);
      return { tracks: [], total: 0, hasMore: false };
    }
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new MusicAPIService();