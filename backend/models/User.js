const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    displayName: {
      type: String,
      default: function() { return this.username; }
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    }
  },
  preferences: {
    favoriteGenres: [String],
    preferredMood: {
      type: String,
      enum: ['happy', 'sad', 'relaxed', 'energetic', 'focus', 'party', 'chill'],
      default: 'happy'
    },
    volume: {
      type: Number,
      default: 0.8,
      min: 0,
      max: 1
    }
  },
  favorites: {
    tracks: [{
      trackId: String,
      title: String,
      artist: String,
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    artists: [{
      artistId: String,
      name: String,
      addedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  playlists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  recentlyPlayed: [{
    trackId: String,
    title: String,
    artist: String,
    playedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'favorites.tracks.trackId': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Add track to recently played (limit to 50 most recent)
userSchema.methods.addToRecentlyPlayed = function(track) {
  // Remove if already exists
  this.recentlyPlayed = this.recentlyPlayed.filter(
    item => item.trackId !== track.trackId
  );
  
  // Add to beginning
  this.recentlyPlayed.unshift({
    trackId: track.trackId,
    title: track.title,
    artist: track.artist,
    playedAt: new Date()
  });
  
  // Keep only 50 most recent
  if (this.recentlyPlayed.length > 50) {
    this.recentlyPlayed = this.recentlyPlayed.slice(0, 50);
  }
};

// Add track to favorites
userSchema.methods.addToFavorites = function(track) {
  const exists = this.favorites.tracks.some(fav => fav.trackId === track.trackId);
  if (!exists) {
    this.favorites.tracks.push({
      trackId: track.trackId,
      title: track.title,
      artist: track.artist
    });
  }
};

// Remove track from favorites
userSchema.methods.removeFromFavorites = function(trackId) {
  this.favorites.tracks = this.favorites.tracks.filter(
    fav => fav.trackId !== trackId
  );
};

module.exports = mongoose.model('User', userSchema);