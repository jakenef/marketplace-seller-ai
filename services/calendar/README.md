# Calendar Service

Google Calendar integration service for marketplace scheduling.

## Features

- Google Calendar OAuth2 integration
- Suggest available time slots based on seller availability
- Create appointments directly in Google Calendar
- Real-time conflict detection with existing events

## Setup

1. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

2. **Google Calendar API Setup**
   - Go to [Google Cloud Console](https://console.developers.google.com/)
   - Create a new project or select existing one
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials (Web application)
   - Add `http://localhost:4002/auth/google/callback` to authorized redirect URIs
   - Copy the client ID and secret to your `.env` file

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Build & Run**
   ```bash
   # Development with hot reload
   npm run dev

   # Production build
   npm run build
   npm start
   ```

## Authentication Flow

1. Visit `/auth` to get Google OAuth URL
2. Complete OAuth flow via `/auth/google/callback`
3. Service will automatically use stored tokens for API calls

## API Endpoints

- `GET /health` - Health check
- `GET /auth` - Start Google OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `POST /suggest-slots` - Get available time slots
- `POST /create-appointment` - Create calendar event
- `GET /events` - List upcoming events
- `POST /events` - Create calendar event (direct)

## Development

The service uses TypeScript and includes shared types from `@upseller/shared` package.

Tokens are automatically saved to `token.json` and persisted across server restarts.
