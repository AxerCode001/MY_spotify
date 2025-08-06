const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tracks: [{
    trackId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    artist: {
      type: String,
      required: true
    },
    duration: Number, // in seconds
    audioUrl: String,
    imageUrl: String,
    addedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  collaborative: {
    type: Boolean,
    default: false
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permissions: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [String],
  mood: {
    type: String,
    enum: ['happy', 'sad', 'relaxed', 'energetic', 'focus', 'party', 'chill', 'mixed'],
    default: 'mixed'
  },
  genre: String,
  coverImage: {
    type: String,
    default: ''
  },
  totalDuration: {
    type: Number,
    default: 0 // in seconds
  },
  playCount: {
    type: Number,
    default: 0
  },
  lastPlayed: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
playlistSchema.index({ owner: 1 });
playlistSchema.index({ isPublic: 1 });
playlistSchema.index({ mood: 1 });
playlistSchema.index({ genre: 1 });
playlistSchema.index({ tags: 1 });

// Virtual for track count
playlistSchema.virtual('trackCount').get(function() {
  return this.tracks.length;
});

// Update total duration when tracks change
playlistSchema.methods.updateTotalDuration = function() {
  this.totalDuration = this.tracks.reduce((total, track) => {
    return total + (track.duration || 0);
  }, 0);
};

// Add track to playlist
playlistSchema.methods.addTrack = function(track, userId) {
  // Check if track already exists
  const exists = this.tracks.some(t => t.trackId === track.trackId);
  if (exists) {
    throw new Error('Track already exists in playlist');
  }

  this.tracks.push({
    trackId: track.trackId,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    audioUrl: track.audioUrl,
    imageUrl: track.imageUrl,
    addedBy: userId
  });

  this.updateTotalDuration();
};

// Remove track from playlist
playlistSchema.methods.removeTrack = function(trackId) {
  this.tracks = this.tracks.filter(track => track.trackId !== trackId);
  this.updateTotalDuration();
};

// Reorder tracks
playlistSchema.methods.reorderTracks = function(trackIds) {
  const reorderedTracks = [];
  trackIds.forEach(id => {
    const track = this.tracks.find(t => t.trackId === id);
    if (track) {
      reorderedTracks.push(track);
    }
  });
  this.tracks = reorderedTracks;
};

// Check if user can edit playlist
playlistSchema.methods.canEdit = function(userId) {
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  if (this.collaborative) {
    return this.collaborators.some(collab => 
      collab.user.toString() === userId.toString() && 
      collab.permissions === 'edit'
    );
  }
  
  return false;
};

// Check if user can view playlist
playlistSchema.methods.canView = function(userId) {
  if (this.isPublic) return true;
  if (this.owner.toString() === userId.toString()) return true;
  
  return this.collaborators.some(collab => 
    collab.user.toString() === userId.toString()
  );
};

// Increment play count
playlistSchema.methods.incrementPlayCount = function() {
  this.playCount += 1;
  this.lastPlayed = new Date();
};

// Pre-save middleware to update total duration
playlistSchema.pre('save', function(next) {
  if (this.isModified('tracks')) {
    this.updateTotalDuration();
  }
  next();
});

module.exports = mongoose.model('Playlist', playlistSchema);