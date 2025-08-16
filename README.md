# Upseller - AI Assistant for Facebook Marketplace Sellers

An AI-powered assistant that helps Facebook Marketplace sellers handle inbound buyer messages, negotiate within seller constraints, propose meeting times/locations, and generate calendar invites. The system uses Mastra for AI agent orchestration and operates in shadow mode (browser automation only drafts replies; humans click Send).

## 🏗️ Architecture

This is a TypeScript-first monorepo using npm workspaces with the following structure:

- **`apps/web`** - Next.js React application for the user interface
- **`services/master`** - Express server that orchestrates the AI agent workflow
- **`services/messenger`** - Express server handling Facebook Marketplace integration with Mastra browser automation
- **`services/calendar`** - Express server for appointment scheduling and calendar invite generation
- **`packages/shared`** - Shared TypeScript types, constants, and utilities

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Copy example env files and customize as needed
   cp services/master/.env.example services/master/.env
   cp services/messenger/.env.example services/messenger/.env
   cp services/calendar/.env.example services/calendar/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Start all services:**
   ```bash
   npm run dev:all
   ```

This will start:
- 🌐 **Web app** on http://localhost:3000
- 🤖 **Master service** on http://localhost:4000  
- 💬 **Messenger service** on http://localhost:4001
- 📅 **Calendar service** on http://localhost:4002

## 🎯 Features

### Core Functionality
- **Message Classification**: Automatically categorizes buyer messages (availability check, offer, scheduling, scam detection)
- **Smart Negotiation**: AI-powered responses within seller-defined constraints
- **Meeting Coordination**: Suggests meeting times and locations based on seller availability
- **Calendar Integration**: Generates .ics calendar invites for confirmed meetups
- **Shadow Mode**: Drafts replies for human review before sending (safety first!)

### AI Agent Workflow
1. **Master Agent** receives buyer message
2. **Messenger Agent** classifies intent and generates response
3. **Calendar Agent** suggests meeting slots when needed
4. **Human Review** required before sending (shadow mode)

### Demo Features
- Thread list with 3 seeded buyer conversations
- Real-time message processing simulation
- Mode toggle (Mock vs Shadow)
- Listing creation form
- Interactive chat interface

## 🛠️ Development

### Available Scripts

```bash
# Start all services concurrently
npm run dev:all

# Start individual services
npm run dev:master      # Master orchestration service
npm run dev:messenger   # Messenger service with FB integration  
npm run dev:calendar    # Calendar service
npm run dev:web         # Next.js web application

# Build and validation
npm run build           # Build all packages
npm run typecheck       # TypeScript compilation check
npm run lint            # ESLint across all packages
```

### Service Architecture

#### Master Service (Port 4000)
- Orchestrates the entire AI workflow
- Routes messages between services  
- Maintains conversation state
- Provides demo data and mode switching

#### Messenger Service (Port 4001)
- Facebook Marketplace integration via Mastra browser automation
- Message classification (availability, offers, scheduling, scam detection)
- Response generation with seller constraints
- **Shadow mode**: Drafts replies without auto-sending

#### Calendar Service (Port 4002)
- Meeting time suggestions based on availability
- Appointment creation and management
- ICS calendar file generation
- Static file serving for calendar downloads

#### Web Application (Port 3000)
- React/Next.js interface
- Thread management and chat UI
- Listing creation form
- Mode switching (Mock/Shadow)
- Real-time AI response preview

## 🔧 Configuration

### Environment Variables

**Master Service** (`.env`):
```
PORT=4000
MESSENGER_BASE_URL=http://localhost:4001
CALENDAR_BASE_URL=http://localhost:4002
```

**Messenger Service** (`.env`):
```
PORT=4001
FACEBOOK_LISTING_URL=https://www.facebook.com/marketplace/you/selling
SHADOW_MODE=true
```

**Calendar Service** (`.env`):
```
PORT=4002
PUBLIC_BASE_URL=http://localhost:4002
```

**Web App** (`.env`):
```
NEXT_PUBLIC_MASTER_BASE_URL=http://localhost:4000
```

## 🤖 Mastra Integration

The messenger service includes placeholder hooks for Mastra browser automation:

- `ensureFacebookSession()` - Verify/establish Facebook login
- `openListingInboxThread()` - Navigate to specific listing conversation
- `readLastMessage()` - Extract buyer message content
- `draftReply()` - Type response in compose box (shadow mode only)

**Shadow Mode**: The system drafts replies in the Facebook compose box but requires human review and manual send click for safety.

## 📋 API Endpoints

### Master Service
- `GET /health` - Health check
- `GET /threads` - Get demo conversation threads
- `POST /ingest/listing` - Store new listing
- `POST /ingest/message` - Process buyer message
- `POST /mode` - Set operation mode (mock/shadow)

### Messenger Service  
- `GET /health` - Health check
- `POST /classify` - Classify message intent
- `POST /negotiate` - Generate response
- `POST /send-draft` - Draft/send reply (shadow mode)

### Calendar Service
- `GET /health` - Health check
- `POST /suggest-slots` - Get available meeting times
- `POST /create-appointment` - Create calendar appointment
- `GET /ics/:filename` - Download calendar invite

## 🎭 Demo Data

The system includes seeded conversations for testing:

1. **Alex Chen**: "Is this still available?" → Availability check
2. **Sarah Johnson**: "$50 cash now?" → Price negotiation  
3. **Mike Rodriguez**: "I'll send you a verification code first..." → Scam detection

## 🔒 Safety Features

- **Shadow Mode**: All AI responses require human approval
- **Scam Detection**: Flags suspicious messages (verification codes, unusual requests)
- **Price Constraints**: Respects seller-defined minimum prices
- **Human Override**: Safety notes and manual review requirements

## 🏃‍♂️ Production Deployment

For production deployment:

1. Build all packages: `npm run build`
2. Configure environment variables for your infrastructure
3. Deploy services to your preferred platform (Docker, Kubernetes, etc.)
4. Set up Mastra browser automation with proper Facebook authentication
5. Configure domain and SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run typecheck && npm run lint`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ for safer, smarter marketplace selling