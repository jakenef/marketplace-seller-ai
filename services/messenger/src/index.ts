import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BuyerMessage, Classified, DraftReply, MEET_SPOTS_PROVO } from '@upseller/shared';
import { draftReply } from './mastra/browserHooks';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'messenger' });
});

// Classify buyer message intent
app.post('/classify', (req, res) => {
  const message: BuyerMessage = req.body;
  
  // Simple classification logic for demo
  let intent: Classified['intent'] = 'availability_check';
  let offerPrice: number | undefined;
  let flags: string[] = [];
  
  const text = message.text.toLowerCase();
  
  if (text.includes('$') || text.includes('offer') || text.includes('pay')) {
    intent = 'offer';
    // Extract potential price
    const priceMatch = text.match(/\$(\d+)/);
    if (priceMatch) {
      offerPrice = parseInt(priceMatch[1]);
    }
  } else if (text.includes('when') || text.includes('meet') || text.includes('time')) {
    intent = 'schedule_proposal';
  } else if (text.includes('verification') || text.includes('code') || text.includes('scam')) {
    intent = 'scam_risk';
    flags.push('potential_scam');
  } else if (text.includes('available') || text.includes('still') || text.includes('sold')) {
    intent = 'availability_check';
  } else {
    intent = 'question';
  }
  
  const classification: Classified = {
    intent,
    offerPrice,
    flags: flags.length > 0 ? flags : undefined,
  };
  
  res.json(classification);
});

// Generate negotiation response
app.post('/negotiate', (req, res) => {
  const { message, classification } = req.body;
  
  let draft: DraftReply;
  
  switch (classification.intent) {
    case 'availability_check':
      draft = {
        text: 'Yes, this is still available! Are you interested in meeting up to take a look?',
        action: 'schedule_proposal',
        proposedTimes: ['2025-08-16T22:30:00Z', '2025-08-16T23:15:00Z'],
        meetSpot: MEET_SPOTS_PROVO[0],
      };
      break;
      
    case 'offer':
      if (classification.offerPrice && classification.offerPrice < 60) {
        draft = {
          text: `Thanks for the offer! I'm looking for something closer to $75. Would you be interested in meeting at $70?`,
          action: 'counter',
          counterPrice: 70,
          meetSpot: MEET_SPOTS_PROVO[0],
        };
      } else {
        draft = {
          text: 'That sounds reasonable! When would be a good time to meet up?',
          action: 'accept',
          proposedTimes: ['2025-08-16T22:30:00Z', '2025-08-16T23:15:00Z'],
          meetSpot: MEET_SPOTS_PROVO[0],
        };
      }
      break;
      
    case 'scam_risk':
      draft = {
        text: 'Thanks for your interest, but I prefer to keep transactions simple with cash payment at meetup. Let me know if you\'d like to arrange a time to meet!',
        action: 'decline',
        requireHumanClick: true,
        safetyNote: 'Potential scam detected - verification code request',
      };
      break;
      
    case 'schedule_proposal':
      draft = {
        text: 'Great! I have availability this evening or tomorrow. Would 6:30 PM or 7:15 PM work for you?',
        action: 'schedule_proposal',
        proposedTimes: ['2025-08-16T22:30:00Z', '2025-08-16T23:15:00Z'],
        meetSpot: MEET_SPOTS_PROVO[0],
      };
      break;
      
    default:
      draft = {
        text: 'Thanks for your message! Let me know if you have any other questions or if you\'d like to schedule a time to meet.',
        requireHumanClick: true,
      };
  }
  
  res.json(draft);
});

// Send draft (shadow mode)
app.post('/send-draft', async (req, res) => {
  try {
    const { messageId, draft, mode } = req.body;
    
    if (mode === 'mock') {
      res.json({ sent: true });
    } else if (mode === 'shadow') {
      // In shadow mode, draft the reply but don't send
      await draftReply(draft.text);
      res.json({ sent: false, drafted: true });
    } else {
      res.status(400).json({ error: 'Invalid mode' });
    }
  } catch (error) {
    console.error('Error sending draft:', error);
    res.status(500).json({ error: 'Failed to send draft' });
  }
});

app.listen(port, () => {
  console.log(`Messenger service running on port ${port}`);
});
