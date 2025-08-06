const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const Playlist = require('../models/Playlist');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const musicAPI = require('../services/musicAPI');

const router = express.Router();

// Create playlist
router.post('/', auth, [
  body('name').notEmpty().isLength({ max: 100 }).withMessage('Playlist name is required and must be under 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('collaborative').optional().isBoolean().withMessage('collaborative must be a boolean'),
  body('mood').optional().isIn(['happy', 'sad', 'relaxed', 'energetic', 'focus', 'party', 'chill', 'mixed']).withMessage('Invalid mood'),
  body('genre').optional().isString().withMessage('Genre must be a string'),
  body('coverImage').optional().isURL().withMessage('Cover image must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, description, isPublic, collaborative, mood, genre, coverImage } = req.body;

    const playlist = new Playlist({
      name,
      description: description || '',
      owner: req.user._id,
      isPublic: isPublic || false,
      collaborative: collaborative || false,
      mood: mood || 'mixed',
      genre: genre || '',
      coverImage: coverImage || ''
    });

    await playlist.save();

    // Add playlist to user's playlists
    req.user.playlists.push(playlist._id);
    await req.user.save();

    res.status(201).json({
      message: 'Playlist created successfully',
      playlist: {
        id: playlist._id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.isPublic,
        collaborative: playlist.collaborative,
        trackCount: playlist.tracks.length,
        totalDuration: playlist.totalDuration,
        mood: playlist.mood,
        genre: playlist.genre,
        coverImage: playlist.coverImage,
        createdAt: playlist.createdAt
      }
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ message: 'Error creating playlist' });
  }
});

// Get user's playlists
router.get('/my', auth, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const playlists = await Playlist.find({ 
      owner: req.user._id, 
      isActive: true 
    })
    .sort({ updatedAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .populate('owner', 'username profile.displayName')
    .select('-tracks');

    const total = await Playlist.countDocuments({ 
      owner: req.user._id, 
      isActive: true 
    });

    res.json({
      playlists: playlists.map(p => ({
        id: p._id,
        name: p.name,
        description: p.description,
        trackCount: p.tracks.length,
        totalDuration: p.totalDuration,
        isPublic: p.isPublic,
        collaborative: p.collaborative,
        mood: p.mood,
        genre: p.genre,
        coverImage: p.coverImage,
        playCount: p.playCount,
        lastPlayed: p.lastPlayed,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        owner: p.owner
      })),
      total,
      hasMore: offset + limit < total
    });
  } catch (error) {
    console.error('Get user playlists error:', error);
    res.status(500).json({ message: 'Error fetching playlists' });
  }
});

// Get public playlists
router.get('/public', [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('mood').optional().isIn(['happy', 'sad', 'relaxed', 'energetic', 'focus', 'party', 'chill', 'mixed']).withMessage('Invalid mood'),
  query('genre').optional().isString().withMessage('Genre must be a string')
], async (req, res) => {
  try {
    const { limit = 20, offset = 0, mood, genre } = req.query;

    const filter = { 
      isPublic: true, 
      isActive: true,
      'tracks.0': { $exists: true } // Only playlists with at least one track
    };

    if (mood && mood !== 'mixed') filter.mood = mood;
    if (genre) filter.genre = new RegExp(genre, 'i');

    const playlists = await Playlist.find(filter)
    .sort({ playCount: -1, updatedAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .populate('owner', 'username profile.displayName profile.avatar')
    .select('-tracks');

    const total = await Playlist.countDocuments(filter);

    res.json({
      playlists: playlists.map(p => ({
        id: p._id,
        name: p.name,
        description: p.description,
        trackCount: p.tracks.length,
        totalDuration: p.totalDuration,
        mood: p.mood,
        genre: p.genre,
        coverImage: p.coverImage,
        playCount: p.playCount,
        lastPlayed: p.lastPlayed,
        createdAt: p.createdAt,
        owner: {
          id: p.owner._id,
          username: p.owner.username,
          displayName: p.owner.profile?.displayName || p.owner.username,
          avatar: p.owner.profile?.avatar || ''
        }
      })),
      total,
      hasMore: offset + limit < total
    });
  } catch (error) {
    console.error('Get public playlists error:', error);
    res.status(500).json({ message: 'Error fetching public playlists' });
  }
});

// Get playlist by ID
router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid playlist ID')
], async (req, res) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findById(id)
      .populate('owner', 'username profile.displayName profile.avatar')
      .populate('collaborators.user', 'username profile.displayName profile.avatar');

    if (!playlist || !playlist.isActive) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check if user can view this playlist
    if (!playlist.canView(req.user?._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      playlist: {
        id: playlist._id,
        name: playlist.name,
        description: playlist.description,
        tracks: playlist.tracks,
        trackCount: playlist.tracks.length,
        totalDuration: playlist.totalDuration,
        isPublic: playlist.isPublic,
        collaborative: playlist.collaborative,
        mood: playlist.mood,
        genre: playlist.genre,
        coverImage: playlist.coverImage,
        playCount: playlist.playCount,
        lastPlayed: playlist.lastPlayed,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        owner: {
          id: playlist.owner._id,
          username: playlist.owner.username,
          displayName: playlist.owner.profile?.displayName || playlist.owner.username,
          avatar: playlist.owner.profile?.avatar || ''
        },
        collaborators: playlist.collaborators.map(c => ({
          user: {
            id: c.user._id,
            username: c.user.username,
            displayName: c.user.profile?.displayName || c.user.username,
            avatar: c.user.profile?.avatar || ''
          },
          permissions: c.permissions,
          addedAt: c.addedAt
        })),
        canEdit: playlist.canEdit(req.user?._id)
      }
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ message: 'Error fetching playlist' });
  }
});

// Update playlist
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Playlist name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be under 500 characters'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
  body('collaborative').optional().isBoolean().withMessage('collaborative must be a boolean'),
  body('mood').optional().isIn(['happy', 'sad', 'relaxed', 'energetic', 'focus', 'party', 'chill', 'mixed']).withMessage('Invalid mood'),
  body('genre').optional().isString().withMessage('Genre must be a string'),
  body('coverImage').optional().isURL().withMessage('Cover image must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const playlist = await Playlist.findById(id);

    if (!playlist || !playlist.isActive) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!playlist.canEdit(req.user._id)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { name, description, isPublic, collaborative, mood, genre, coverImage } = req.body;

    if (name !== undefined) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    if (collaborative !== undefined) playlist.collaborative = collaborative;
    if (mood !== undefined) playlist.mood = mood;
    if (genre !== undefined) playlist.genre = genre;
    if (coverImage !== undefined) playlist.coverImage = coverImage;

    await playlist.save();

    res.json({
      message: 'Playlist updated successfully',
      playlist: {
        id: playlist._id,
        name: playlist.name,
        description: playlist.description,
        isPublic: playlist.isPublic,
        collaborative: playlist.collaborative,
        mood: playlist.mood,
        genre: playlist.genre,
        coverImage: playlist.coverImage
      }
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ message: 'Error updating playlist' });
  }
});

// Add track to playlist
router.post('/:id/tracks', auth, [
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  body('trackId').notEmpty().withMessage('Track ID is required'),
  body('title').notEmpty().withMessage('Track title is required'),
  body('artist').notEmpty().withMessage('Track artist is required'),
  body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
  body('audioUrl').optional().isURL().withMessage('Audio URL must be valid'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be valid')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { trackId, title, artist, duration, audioUrl, imageUrl } = req.body;

    const playlist = await Playlist.findById(id);

    if (!playlist || !playlist.isActive) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!playlist.canEdit(req.user._id)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Get full track details from music API
    const trackDetails = await musicAPI.getTrackById(trackId);
    const trackData = trackDetails || {
      id: trackId,
      title,
      artist,
      duration: duration || 0,
      audioUrl: audioUrl || '',
      imageUrl: imageUrl || ''
    };

    try {
      playlist.addTrack(trackData, req.user._id);
      await playlist.save();

      res.json({
        message: 'Track added to playlist',
        track: {
          trackId: trackData.id,
          title: trackData.title,
          artist: trackData.artist,
          duration: trackData.duration,
          audioUrl: trackData.audioUrl,
          imageUrl: trackData.imageUrl
        },
        totalTracks: playlist.tracks.length,
        totalDuration: playlist.totalDuration
      });
    } catch (addError) {
      if (addError.message === 'Track already exists in playlist') {
        return res.status(400).json({ message: 'Track already exists in playlist' });
      }
      throw addError;
    }
  } catch (error) {
    console.error('Add track to playlist error:', error);
    res.status(500).json({ message: 'Error adding track to playlist' });
  }
});

// Remove track from playlist
router.delete('/:id/tracks/:trackId', auth, [
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  param('trackId').notEmpty().withMessage('Track ID is required')
], async (req, res) => {
  try {
    const { id, trackId } = req.params;

    const playlist = await Playlist.findById(id);

    if (!playlist || !playlist.isActive) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!playlist.canEdit(req.user._id)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    playlist.removeTrack(trackId);
    await playlist.save();

    res.json({
      message: 'Track removed from playlist',
      totalTracks: playlist.tracks.length,
      totalDuration: playlist.totalDuration
    });
  } catch (error) {
    console.error('Remove track from playlist error:', error);
    res.status(500).json({ message: 'Error removing track from playlist' });
  }
});

// Reorder tracks in playlist
router.put('/:id/tracks/reorder', auth, [
  param('id').isMongoId().withMessage('Invalid playlist ID'),
  body('trackIds').isArray().withMessage('Track IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { trackIds } = req.body;

    const playlist = await Playlist.findById(id);

    if (!playlist || !playlist.isActive) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!playlist.canEdit(req.user._id)) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    playlist.reorderTracks(trackIds);
    await playlist.save();

    res.json({
      message: 'Tracks reordered successfully',
      tracks: playlist.tracks
    });
  } catch (error) {
    console.error('Reorder tracks error:', error);
    res.status(500).json({ message: 'Error reordering tracks' });
  }
});

// Delete playlist
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('Invalid playlist ID')
], async (req, res) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findById(id);

    if (!playlist || !playlist.isActive) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete this playlist' });
    }

    // Soft delete
    playlist.isActive = false;
    await playlist.save();

    // Remove from user's playlists
    req.user.playlists = req.user.playlists.filter(
      p => p.toString() !== id
    );
    await req.user.save();

    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ message: 'Error deleting playlist' });
  }
});

// Play playlist (increment play count)
router.post('/:id/play', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid playlist ID')
], async (req, res) => {
  try {
    const { id } = req.params;

    const playlist = await Playlist.findById(id);

    if (!playlist || !playlist.isActive) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    if (!playlist.canView(req.user?._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    playlist.incrementPlayCount();
    await playlist.save();

    res.json({
      message: 'Play count updated',
      playCount: playlist.playCount
    });
  } catch (error) {
    console.error('Play playlist error:', error);
    res.status(500).json({ message: 'Error updating play count' });
  }
});

module.exports = router;