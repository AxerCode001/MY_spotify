const express = require('express');
const { query, param } = require('express-validator');
const musicAPI = require('../services/musicAPI');
const { optionalAuth, auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Search tracks
router.get('/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('tags').optional().isString(),
  query('mood').optional().isIn(['happy', 'sad', 'relaxed', 'energetic', 'focus', 'party', 'chill']),
  query('speed').optional().isIn(['veryslow', 'slow', 'medium', 'fast', 'veryfast']),
  query('vocalinstrumental').optional().isIn(['vocal', 'instrumental']),
  query('gender').optional().isIn(['male', 'female']),
  query('lang').optional().isString()
], optionalAuth, async (req, res) => {
  try {
    const { q, limit = 20, offset = 0, tags, mood, speed, vocalinstrumental, gender, lang } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (tags) options.tags = tags;
    if (mood) options.tags = (options.tags ? `${options.tags} ` : '') + mood;
    if (speed) options.speed = speed;
    if (vocalinstrumental) options.vocalinstrumental = vocalinstrumental;
    if (gender) options.gender = gender;
    if (lang) options.lang = lang;

    const result = await musicAPI.searchTracks(q, options);

    res.json({
      query: q,
      ...result
    });
  } catch (error) {
    console.error('Search tracks error:', error);
    res.status(500).json({ message: 'Error searching tracks' });
  }
});

// Get track by ID
router.get('/tracks/:id', [
  param('id').notEmpty().withMessage('Track ID is required')
], optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const track = await musicAPI.getTrackById(id);

    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    // If user is authenticated, add to recently played
    if (req.user) {
      req.user.addToRecentlyPlayed({
        trackId: track.id,
        title: track.title,
        artist: track.artist
      });
      await req.user.save();
    }

    res.json({ track });
  } catch (error) {
    console.error('Get track error:', error);
    res.status(500).json({ message: 'Error fetching track' });
  }
});

// Get popular tracks
router.get('/popular', [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const result = await musicAPI.getPopularTracks({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(result);
  } catch (error) {
    console.error('Get popular tracks error:', error);
    res.status(500).json({ message: 'Error fetching popular tracks' });
  }
});

// Get tracks by mood
router.get('/mood/:mood', [
  param('mood').isIn(['happy', 'sad', 'relaxed', 'energetic', 'focus', 'party', 'chill']).withMessage('Invalid mood'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { mood } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await musicAPI.getTracksByMood(mood, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      mood,
      ...result
    });
  } catch (error) {
    console.error('Get mood tracks error:', error);
    res.status(500).json({ message: 'Error fetching mood tracks' });
  }
});

// Get recommendations for user
router.get('/recommendations', auth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await musicAPI.getRecommendations(req.user.preferences, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      ...result,
      basedOn: {
        preferredMood: req.user.preferences.preferredMood,
        favoriteGenres: req.user.preferences.favoriteGenres
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: 'Error fetching recommendations' });
  }
});

// Search artists
router.get('/artists/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    
    const result = await musicAPI.searchArtists(q, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      query: q,
      ...result
    });
  } catch (error) {
    console.error('Search artists error:', error);
    res.status(500).json({ message: 'Error searching artists' });
  }
});

// Get artist by ID
router.get('/artists/:id', [
  param('id').notEmpty().withMessage('Artist ID is required')
], async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await musicAPI.getArtistById(id);

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    res.json({ artist });
  } catch (error) {
    console.error('Get artist error:', error);
    res.status(500).json({ message: 'Error fetching artist' });
  }
});

// Get tracks by artist
router.get('/artists/:id/tracks', [
  param('id').notEmpty().withMessage('Artist ID is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await musicAPI.getTracksByArtist(id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      artistId: id,
      ...result
    });
  } catch (error) {
    console.error('Get artist tracks error:', error);
    res.status(500).json({ message: 'Error fetching artist tracks' });
  }
});

// Add track to favorites
router.post('/favorites/:trackId', auth, [
  param('trackId').notEmpty().withMessage('Track ID is required')
], async (req, res) => {
  try {
    const { trackId } = req.params;
    
    // Get track details first
    const track = await musicAPI.getTrackById(trackId);
    if (!track) {
      return res.status(404).json({ message: 'Track not found' });
    }

    // Add to user favorites
    req.user.addToFavorites({
      trackId: track.id,
      title: track.title,
      artist: track.artist
    });
    await req.user.save();

    res.json({ 
      message: 'Track added to favorites',
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist
      }
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: 'Error adding track to favorites' });
  }
});

// Remove track from favorites
router.delete('/favorites/:trackId', auth, [
  param('trackId').notEmpty().withMessage('Track ID is required')
], async (req, res) => {
  try {
    const { trackId } = req.params;
    
    req.user.removeFromFavorites(trackId);
    await req.user.save();

    res.json({ message: 'Track removed from favorites' });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: 'Error removing track from favorites' });
  }
});

// Get user's favorite tracks
router.get('/favorites', auth, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const favorites = req.user.favorites.tracks
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      tracks: favorites,
      total: req.user.favorites.tracks.length,
      hasMore: parseInt(offset) + parseInt(limit) < req.user.favorites.tracks.length
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Error fetching favorites' });
  }
});

// Get user's recently played tracks
router.get('/recently-played', auth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const recentlyPlayed = req.user.recentlyPlayed.slice(0, parseInt(limit));

    res.json({
      tracks: recentlyPlayed,
      total: req.user.recentlyPlayed.length
    });
  } catch (error) {
    console.error('Get recently played error:', error);
    res.status(500).json({ message: 'Error fetching recently played tracks' });
  }
});

// Get genres/categories
router.get('/genres', async (req, res) => {
  try {
    // Static list of available genres/moods for the frontend
    const genres = [
      {
        id: 'popular',
        name: 'Popular',
        description: 'Most popular tracks right now',
        mood: null
      },
      {
        id: 'happy',
        name: 'Happy',
        description: 'Upbeat and joyful music',
        mood: 'happy'
      },
      {
        id: 'relaxed',
        name: 'Chill & Relaxed',
        description: 'Perfect for unwinding',
        mood: 'relaxed'
      },
      {
        id: 'energetic',
        name: 'Energetic',
        description: 'High energy tracks to pump you up',
        mood: 'energetic'
      },
      {
        id: 'focus',
        name: 'Focus',
        description: 'Instrumental music for concentration',
        mood: 'focus'
      },
      {
        id: 'party',
        name: 'Party',
        description: 'Dance and party music',
        mood: 'party'
      },
      {
        id: 'sad',
        name: 'Melancholy',
        description: 'Emotional and contemplative',
        mood: 'sad'
      },
      {
        id: 'chill',
        name: 'Chill',
        description: 'Laid-back ambient vibes',
        mood: 'chill'
      }
    ];

    res.json({ genres });
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ message: 'Error fetching genres' });
  }
});

module.exports = router;