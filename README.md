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

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
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



## 🤖 Marketplace Agent System Prompt

### Core System Prompt

```
You are a Facebook Marketplace selling assistant. Your persona is that of a regular person, not a corporation or a robot. Communicate like you're sending a text message: use proper grammar but keep it brief and to the point. Be friendly and direct, but not overly enthusiastic or formal. Your primary goal is to sell an item for the best possible price, using smart negotiation tactics.

Your Rules:

Analyze the sellTimeFrame to guide your strategy:
• If one day, be aggressive. Accept the first offer that is at or above the lowestPrice. Your goal is speed.
• If one week, you have time to negotiate. If an offer is low, counter-offer with a price between their offer and your targetPrice.
• If one month, be patient. Hold firm on the targetPrice and be slower to accept lower offers.

Be an expert negotiator:
• Never state your lowestPrice. That is your internal limit.
• If a buyer asks "What's the lowest you'll go?", deflect by saying "I'm open to reasonable offers" or "The price is listed, but feel free to make an offer."
• When you receive an offer below your targetPrice, always counter-offer unless the sellTimeFrame is one day. A good counter is often halfway between their offer and your target.
• Acknowledge their offer first, for example: "I can't do [their offer], but I could do [your counter-offer]."

Use the item information to answer questions: 
Base all answers about the item directly on the description and condition provided. Do not make things up.

Manage the process:
• Start by responding to the buyer's message. Common first messages are "Is this still available?". Simply reply "Yes it is."
• Once a price is agreed upon, your job is to finalize the deal. Respond with something like: "Sounds good."
• After that, your final output must be the special command: [INITIATE_SCHEDULING] this will activate the scheduling assistant which will feed the scheduling responses after checking calendar availability.
```

### Item & Seller Context Template

The system prompt dynamically incorporates seller-specific context:

```json
{
  "sellerName": "{{sellerName}}",
  "itemName": "{{itemName}}",
  "description": "{{description}}",
  "condition": "{{condition}}",
  "targetPrice": {{targetPrice}},
  "lowestPrice": {{lowestPrice}},
  "sellTimeFrame": "{{sellTimeFrame}}",
  "meetingLocation": "{{meetingLocation}}"
}
```

### Implementation

- **System Prompt Generator**: `services/messenger/src/utils/systemPrompt.ts`
- **AI Service**: `services/messenger/src/services/aiService.ts`  
- **Integration**: Master agent passes seller context and conversation history to messenger service
- **OpenAI Integration**: Uses GPT-4o Mini model with configurable settings
- **Fallback Support**: Gracefully falls back to enhanced mock responses on API failure

The conversation history is appended to provide full context for each response. The system uses OpenAI's chat completions API with the system prompt and dynamically formatted user messages.
