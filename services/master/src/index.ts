import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BuyerMessage, DraftReply, Listing } from '@upseller/shared';
import { MasterAgent } from './mastra/masterAgent';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory storage for demo
let listings: Listing[] = [];
let mode: 'mock' | 'shadow' = 'mock';

// Initialize Mastra master agent
const masterAgent = new MasterAgent({
  messengerBaseUrl: process.env.MESSENGER_BASE_URL || 'http://localhost:4001',
  calendarBaseUrl: process.env.CALENDAR_BASE_URL || 'http://localhost:4002',
});

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'master' });
});

// Store listing
app.post('/ingest/listing', (req, res) => {
  const listing: Listing = req.body;
  listings.push(listing);
  res.json({ ok: true });
});

// Process buyer message
app.post('/ingest/message', async (req, res) => {
  try {
    const message: BuyerMessage = req.body;
    const draft = await masterAgent.processMessage(message, mode);
    res.json(draft);
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get demo threads
app.get('/threads', (req, res) => {
  const demoThreads = [
    {
      id: 'buyer-1',
      name: 'Alex Chen',
      lastMessage: 'Is this still available?',
      timestamp: '2025-08-16T20:30:00Z',
      messages: [
        {
          id: 'msg-1',
          listingId: 'listing-1',
          buyerId: 'buyer-1',
          text: 'Is this still available?',
          ts: '2025-08-16T20:30:00Z',
          source: 'mock' as const,
        },
      ],
    },
    {
      id: 'buyer-2',
      name: 'Sarah Johnson',
      lastMessage: '$50 cash now?',
      timestamp: '2025-08-16T19:45:00Z',
      messages: [
        {
          id: 'msg-2',
          listingId: 'listing-1',
          buyerId: 'buyer-2',
          text: '$50 cash now?',
          ts: '2025-08-16T19:45:00Z',
          source: 'mock' as const,
        },
      ],
    },
    {
      id: 'buyer-3',
      name: 'Mike Rodriguez',
      lastMessage: "I'll send you a verification code first…",
      timestamp: '2025-08-16T18:15:00Z',
      messages: [
        {
          id: 'msg-3',
          listingId: 'listing-1',
          buyerId: 'buyer-3',
          text: "I'll send you a verification code first…",
          ts: '2025-08-16T18:15:00Z',
          source: 'mock' as const,
        },
      ],
    },
  ];
  res.json(demoThreads);
});

// Set mode
app.post('/mode', (req, res) => {
  const { mode: newMode } = req.body;
  if (newMode === 'mock' || newMode === 'shadow') {
    mode = newMode;
    res.json({ mode });
  } else {
    res.status(400).json({ error: 'Invalid mode' });
  }
});

app.listen(port, () => {
  console.log(`Master service running on port ${port}`);
});
