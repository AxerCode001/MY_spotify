const express = require('express');
const { query, param } = require('express-validator');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get user profile by ID
router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .select('-password -email')
      .populate('playlists', 'name description trackCount isPublic mood coverImage playCount');

    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only show public playlists unless it's the user themselves
    const isOwnProfile = req.user && req.user._id.toString() === id;
    const playlists = user.playlists.filter(p => isOwnProfile || p.isPublic);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        profile: {
          displayName: user.profile.displayName,
          avatar: user.profile.avatar,
          bio: user.profile.bio
        },
        joinedAt: user.createdAt,
        playlists: playlists.map(p => ({
          id: p._id,
          name: p.name,
          description: p.description,
          trackCount: p.trackCount,
          mood: p.mood,
          coverImage: p.coverImage,
          playCount: p.playCount
        })),
        playlistCount: playlists.length,
        // Only show email and preferences if it's the user's own profile
        ...(isOwnProfile && {
          email: user.email,
          preferences: user.preferences,
          favorites: user.favorites,
          recentlyPlayed: user.recentlyPlayed.slice(0, 10)
        })
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Search users
router.get('/', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
], async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;

    const searchRegex = new RegExp(q, 'i');
    
    const users = await User.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { username: searchRegex },
            { 'profile.displayName': searchRegex }
          ]
        }
      ]
    })
    .select('username profile.displayName profile.avatar createdAt')
    .limit(parseInt(limit))
    .skip(parseInt(offset))
    .sort({ createdAt: -1 });

    const total = await User.countDocuments({
      $and: [
        { isActive: true },
        {
          $or: [
            { username: searchRegex },
            { 'profile.displayName': searchRegex }
          ]
        }
      ]
    });

    res.json({
      query: q,
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        displayName: user.profile.displayName,
        avatar: user.profile.avatar,
        joinedAt: user.createdAt
      })),
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Error searching users' });
  }
});

// Get user's public playlists
router.get('/:id/playlists', [
  param('id').isMongoId().withMessage('Invalid user ID'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('mood').optional().isIn(['happy', 'sad', 'relaxed', 'energetic', 'focus', 'party', 'chill', 'mixed']).withMessage('Invalid mood')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0, mood } = req.query;

    // Check if user exists
    const user = await User.findById(id).select('username profile.displayName profile.avatar');
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    const filter = {
      owner: id,
      isPublic: true,
      isActive: true,
      'tracks.0': { $exists: true } // Only playlists with tracks
    };

    if (mood && mood !== 'mixed') {
      filter.mood = mood;
    }

    const playlists = await Playlist.find(filter)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .select('-tracks'); // Don't include full track list

    const total = await Playlist.countDocuments(filter);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.profile.displayName,
        avatar: user.profile.avatar
      },
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
        updatedAt: p.updatedAt
      })),
      total,
      hasMore: parseInt(offset) + parseInt(limit) < total
    });
  } catch (error) {
    console.error('Get user playlists error:', error);
    res.status(500).json({ message: 'Error fetching user playlists' });
  }
});

// Get user stats
router.get('/:id/stats', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('username profile.displayName createdAt');
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get playlist stats
    const playlistStats = await Playlist.aggregate([
      {
        $match: {
          owner: user._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalPlaylists: { $sum: 1 },
          publicPlaylists: {
            $sum: { $cond: ['$isPublic', 1, 0] }
          },
          totalTracks: { $sum: { $size: '$tracks' } },
          totalPlayCount: { $sum: '$playCount' },
          totalDuration: { $sum: '$totalDuration' }
        }
      }
    ]);

    const stats = playlistStats.length > 0 ? playlistStats[0] : {
      totalPlaylists: 0,
      publicPlaylists: 0,
      totalTracks: 0,
      totalPlayCount: 0,
      totalDuration: 0
    };

    // Calculate days since joined
    const daysSinceJoined = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.profile.displayName
      },
      stats: {
        totalPlaylists: stats.totalPlaylists,
        publicPlaylists: stats.publicPlaylists,
        totalTracks: stats.totalTracks,
        totalPlayCount: stats.totalPlayCount,
        totalDuration: stats.totalDuration,
        daysSinceJoined,
        joinedAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Error fetching user stats' });
  }
});

// Get top users (by playlist count or play count)
router.get('/top/creators', [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('sortBy').optional().isIn(['playlists', 'plays']).withMessage('Sort by must be playlists or plays')
], async (req, res) => {
  try {
    const { limit = 10, sortBy = 'playlists' } = req.query;

    let sortField, groupField;
    if (sortBy === 'plays') {
      sortField = 'totalPlayCount';
      groupField = { totalPlayCount: { $sum: '$playCount' } };
    } else {
      sortField = 'totalPlaylists';
      groupField = { totalPlaylists: { $sum: 1 } };
    }

    const topUsers = await Playlist.aggregate([
      {
        $match: {
          isPublic: true,
          isActive: true,
          'tracks.0': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$owner',
          ...groupField,
          totalTracks: { $sum: { $size: '$tracks' } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $match: {
          'user.isActive': true
        }
      },
      {
        $project: {
          _id: 1,
          [sortField]: 1,
          totalTracks: 1,
          user: {
            _id: '$user._id',
            username: '$user.username',
            displayName: '$user.profile.displayName',
            avatar: '$user.profile.avatar',
            createdAt: '$user.createdAt'
          }
        }
      },
      {
        $sort: { [sortField]: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({
      sortBy,
      users: topUsers.map(item => ({
        user: {
          id: item.user._id,
          username: item.user.username,
          displayName: item.user.displayName || item.user.username,
          avatar: item.user.avatar || '',
          joinedAt: item.user.createdAt
        },
        stats: {
          totalPlaylists: item.totalPlaylists || 0,
          totalPlayCount: item.totalPlayCount || 0,
          totalTracks: item.totalTracks || 0
        }
      }))
    });
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({ message: 'Error fetching top users' });
  }
});

module.exports = router;