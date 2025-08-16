import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BuyerMessage, Classified, DraftReply, MEET_SPOTS_PROVO, SellerContext } from '@upseller/shared';
import { draftReply } from './mastra/browserHooks';
import { AIService } from './services/aiService';

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;
const aiService = new AIService();

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

// Generate negotiation response using AI
app.post('/negotiate', async (req, res) => {
  try {
    const { message, classification, sellerContext, conversationHistory } = req.body;
    
    // Validate required parameters
    if (!message || !classification || !sellerContext) {
      return res.status(400).json({ 
        error: 'Missing required parameters: message, classification, and sellerContext are required' 
      });
    }
    
    // Generate AI response using system prompt
    const draft = await aiService.generateResponse(
      message, 
      classification, 
      sellerContext, 
      conversationHistory || []
    );
    
    res.json(draft);
  } catch (error) {
    console.error('Error generating negotiation response:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      fallback: {
        text: 'Thanks for your message! Let me check and get back to you shortly.',
        requireHumanClick: true,
      }
    });
  }
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
