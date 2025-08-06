# Free Music Streaming Platform

A modern, free music streaming website similar to Spotify but without premium restrictions. Stream unlimited royalty-free music, create playlists, discover new artists, and enjoy music without limits.

## Features

### 🎵 Core Features
- **Unlimited Free Streaming** - No subscriptions, no premium restrictions
- **Royalty-Free Music** - Legal music from Jamendo and other open-license sources
- **Advanced Search** - Find tracks, artists, and albums instantly
- **Smart Playlists** - Create, edit, and share custom playlists
- **Mood-Based Discovery** - Browse music by mood (Happy, Sad, Energetic, etc.)
- **Artist Pages** - Explore artist profiles and discographies

### 🎨 User Experience
- **Modern UI/UX** - Clean, responsive design with smooth animations
- **Dark/Light Mode** - Toggle between themes
- **Mobile-Friendly** - Fully responsive across all devices
- **Persistent Player** - Music player stays active across pages
- **Keyboard Shortcuts** - Control playback with keyboard

### 🔐 User Features
- **Simple Account System** - Register and login to save preferences
- **Favorites** - Save your favorite tracks and artists
- **Recently Played** - Track your listening history
- **User Preferences** - Customize your music discovery experience
- **Public Playlists** - Share and discover community playlists

### 🎛️ Player Features
- **Full Playback Control** - Play, pause, skip, volume control
- **Shuffle & Repeat** - Multiple playback modes
- **Progress Seeking** - Click to seek to any position
- **Queue Management** - Add, remove, and reorder tracks
- **Crossfade** - Smooth transitions between tracks

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication and authorization
- **Axios** - HTTP client for external APIs
- **Express Validator** - Input validation
- **Helmet** - Security middleware

### Frontend
- **React 18** - UI library with hooks
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **Zustand** - Lightweight state management
- **React Query** - Server state management
- **Howler.js** - Web audio library
- **React Hot Toast** - Beautiful notifications

### APIs & Services
- **Jamendo API** - Royalty-free music catalog
- **Free Music Archive** - Open-license music
- **Custom REST API** - Backend services

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud)
- Jamendo API credentials (optional but recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd free-music-streaming
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   Copy the backend environment template:
   ```bash
   cp backend/.env.example backend/.env
   ```
   
   Configure your environment variables in `backend/.env`:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/music-streaming
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   
   # Server
   PORT=5000
   NODE_ENV=development
   
   # External APIs (optional)
   JAMENDO_CLIENT_ID=your-jamendo-client-id
   
   # CORS
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # macOS with Homebrew
   brew services start mongodb/brew/mongodb-community
   
   # Ubuntu/Debian
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```
   
   This will start both the backend server (port 5000) and frontend dev server (port 3000).

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

### Alternative: Start services separately

```bash
# Terminal 1 - Backend
npm run server:dev

# Terminal 2 - Frontend  
npm run client:dev
```

## API Configuration

### Jamendo API (Recommended)
1. Sign up at [Jamendo Developer Portal](https://developer.jamendo.com/)
2. Create a new application
3. Copy your Client ID to the `JAMENDO_CLIENT_ID` environment variable

Without API credentials, the app will still work but with limited music catalog.

## Project Structure

```
free-music-streaming/
├── backend/                 # Node.js/Express backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── services/           # External API services
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   ├── utils/          # Utility functions
│   │   └── App.jsx         # Main app component
│   ├── public/             # Static assets
│   └── index.html          # HTML template
└── package.json            # Root package.json
```

## Available Scripts

### Root Level
- `npm run dev` - Start both backend and frontend in development mode
- `npm run install-all` - Install dependencies for both backend and frontend
- `npm run build` - Build frontend for production
- `npm start` - Start backend in production mode

### Backend Scripts
- `npm run server:dev` - Start backend in development mode with nodemon
- `npm run server:install` - Install backend dependencies

### Frontend Scripts
- `npm run client:dev` - Start frontend development server
- `npm run client:install` - Install frontend dependencies

## Features in Detail

### Music Discovery
- **Search**: Real-time search across tracks, artists, and albums
- **Genres**: Browse by mood and genre categories
- **Popular**: Trending and most-played tracks
- **Recommendations**: Personalized suggestions based on listening history

### Playlist Management
- **Create**: Build custom playlists with drag-and-drop
- **Edit**: Rename, reorder, and modify playlists
- **Share**: Make playlists public for others to discover
- **Collaborate**: Allow others to add tracks to your playlists

### User Experience
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Offline Support**: Basic offline functionality with service workers
- **Keyboard Shortcuts**: Space to play/pause, arrow keys for navigation
- **Accessibility**: Screen reader support and keyboard navigation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Jamendo** - For providing a vast catalog of royalty-free music
- **Free Music Archive** - For open-license music collections
- **React Community** - For the amazing ecosystem of tools and libraries
- **Tailwind CSS** - For the utility-first CSS framework
- **All Contributors** - For making this project possible

## Support

If you have any questions or need help setting up the project:

1. Check the [Issues](../../issues) page for common problems
2. Create a new issue if you encounter a bug
3. Join our community discussions

---

**Enjoy unlimited free music streaming! 🎵**