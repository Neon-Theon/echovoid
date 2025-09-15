# Echo Void

## Overview

Echo Void is a revolutionary AI-powered music discovery application with a cyberpunk aesthetic. The app analyzes users' song lists to extract audio features and generates personalized music recommendations using advanced AI pattern recognition. Users can paste their music collections, receive AI-generated recommendations based on sonic patterns, and build curated playlists with YouTube integration for playback.

## Recent Changes (September 2025)

### **🎵 Major Audio-Only Player Transformation**
- **Complete Interface Overhaul**: Transformed from video-heavy to clean, audio-focused music discovery experience
- **YouTube Audio Streaming**: Implemented advanced hidden iframe technique for audio-only playback without video distractions
- **Comprehensive Player Controls**: Added real-time progress tracking, volume control, precise seek functionality, and full Previous/Next navigation
- **Enhanced Technical Implementation**: Robust YouTube IFrame API integration with proper handshake, event subscription, and cross-browser compatibility
- **Minimalistic Cyberpunk Design**: Maintained distinctive aesthetic while eliminating video clutter for pure music focus
- **Advanced State Management**: Fixed React DOM errors, improved lifecycle handling, and enhanced user experience reliability
- **Seamless Track Transitions**: Auto-advance to next recommendations with smooth navigation between tracks

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom cyberpunk theme (neon colors, dark backgrounds)
- **State Management**: TanStack Query for server state, local React state for UI
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful endpoints with JSON responses
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Session-based architecture without user authentication
- **File Structure**: Shared schema between client/server for type consistency

### Core Features
- **Audio Analysis**: Extracts musical features from song lists using MusicBrainz and AcousticBrainz APIs
- **AI Recommendations**: Google Gemini AI generates personalized music suggestions based on sonic patterns
- **Music Playback**: YouTube integration for streaming recommended tracks
- **Playlist Management**: Users can save liked tracks and export playlists

### Data Storage Strategy
- **Sessions**: Temporary user sessions without permanent accounts
- **Song Lists**: JSON storage of user-submitted tracks with extracted audio features
- **Recommendations**: Cached AI-generated suggestions with YouTube video IDs
- **Feedback**: User preference data (likes/dislikes) for recommendation refinement

### Audio Feature Extraction Pipeline
- **Step 1**: Parse user input for artist/title pairs using regex patterns
- **Step 2**: Query MusicBrainz API for music metadata and recording IDs
- **Step 3**: Fetch audio features from AcousticBrainz (tempo, spectral data, harmony)
- **Step 4**: Aggregate features into sonic profiles for AI analysis
- **Rate Limiting**: 1 request per second to respect API limits

### AI Recommendation Engine
- **Model**: Google Gemini 1.5 Pro for creative pattern recognition
- **Approach**: Sonic-only analysis ignoring metadata, genres, and lyrics
- **Features Used**: MFCC coefficients, chroma vectors, tempo, spectral characteristics
- **Output**: 7-10 personalized recommendations with detailed sonic match explanations

## External Dependencies

### AI and Machine Learning
- **Google Gemini AI**: Core recommendation engine using @google/genai package
- **MusicBrainz API**: Free music metadata database for song identification
- **AcousticBrainz API**: Audio feature extraction (no API key required)

### Media and Playback
- **YouTube Integration**: Video search and embedding for music playback
- **YouTube IFrame API**: Embedded player controls and state management

### Database and Storage
- **PostgreSQL**: Primary database using Neon serverless hosting
- **Drizzle ORM**: Type-safe database queries and migrations
- **Connection**: @neondatabase/serverless for database connectivity

### Development and Build Tools
- **Vite**: Frontend build tool with HMR and optimization
- **TypeScript**: Full-stack type safety with shared schemas
- **Replit Integration**: Development environment plugins and runtime error handling

### UI and Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first styling with custom theme variables
- **Lucide Icons**: Consistent icon library throughout the application