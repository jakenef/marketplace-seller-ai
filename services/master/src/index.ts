import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Listing } from '@upseller/shared';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Calendar service base URL
const CALENDAR_BASE_URL = process.env.CALENDAR_BASE_URL || 'http://localhost:4002';

// In-memory storage for demo
let currentListing: Listing | null = null;
let chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'master' });
});

// Store listing
app.post('/ingest/listing', (req, res) => {
  const listing: Listing = req.body;
  currentListing = listing;
  // Reset chat history when new listing is set
  chatHistory = [];
  res.json({ ok: true });
});

// Get current listing
app.get('/listing', (req, res) => {
  res.json(currentListing);
});

// Chat with AI about the item
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!currentListing) {
      return res.status(400).json({ error: 'No listing set. Please create a listing first.' });
    }

    // Add user message to history
    chatHistory.push({ 
      role: 'user', 
      content: message, 
      timestamp: new Date().toISOString() 
    });

    // Generate AI response
    const aiResponse = await generateAIResponse(message, currentListing);
    
    // Add AI response to history
    chatHistory.push({ 
      role: 'assistant', 
      content: aiResponse, 
      timestamp: new Date().toISOString() 
    });

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Get chat history
app.get('/chat/history', (req, res) => {
  res.json(chatHistory);
});

// Clear chat history
app.delete('/chat/history', (req, res) => {
  chatHistory = [];
  res.json({ ok: true });
});

// Generate AI response using OpenAI
async function generateAIResponse(userMessage: string, listing: Listing): Promise<string> {
  const systemPrompt = `You are a helpful marketplace seller AI assistant. You are selling the following item:

Title: ${listing.title}
Listed Price: $${listing.listPrice}
Minimum Price: $${listing.minPrice}
Location: ${listing.locationCity}
Meeting Spots: ${listing.meetSpots.join(', ')}
Payment Methods: ${listing.paymentMethods.join(', ')}

Your role:
1. Answer questions about the item professionally and helpfully
2. Handle price negotiations - you can accept offers at or above the minimum price
3. If someone wants to meet up, suggest meeting spots and ask when works for them
4. Be friendly but firm on your minimum price
5. Watch out for potential scams or lowball offers
6. Keep responses concise and natural
7. Have normal conversations - don't mention calendar integration unless someone gives you a specific time

Only mention scheduling logistics when buyers are actually ready to meet or give you specific times.`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...chatHistory.slice(-10).map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
    { role: 'user' as const, content: userMessage }
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 200,
    temperature: 0.7,
  });

  const response = completion.choices[0].message.content || 'I apologize, but I\'m having trouble responding right now. Please try again.';
  
  // Check if user specified a specific time for direct appointment creation
  const specificTime = extractSpecificTime(userMessage);
  if (specificTime) {
    return await createDirectAppointment(response, listing, specificTime);
  }
  
  return response;
}

// Check if we should integrate with calendar
function shouldTriggerCalendar(userMessage: string, aiResponse: string): boolean {
  const userLower = userMessage.toLowerCase();
  const responseLower = aiResponse.toLowerCase();
  
  // Don't trigger on basic availability questions
  if (userLower.includes('is this available') || userLower.includes('still available')) {
    return false;
  }
  
  const scheduleKeywords = ['meet', 'pickup', 'schedule', 'when can', 'what time'];
  const acceptKeywords = ['deal', 'accept', 'take it', 'buy', 'purchase', "i'll take"];
  const timeSpecific = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'tomorrow', 'today', 'at ', 'pm', 'am'];
  
  const messageText = userLower + ' ' + responseLower;
  
  return scheduleKeywords.some(keyword => messageText.includes(keyword)) ||
         acceptKeywords.some(keyword => messageText.includes(keyword)) ||
         (timeSpecific.some(keyword => userLower.includes(keyword)) && userLower.includes('meet'));
}

// Check if user specified a specific time
function extractSpecificTime(message: string): string | null {
  const message_lower = message.toLowerCase();
  
  // Look for patterns like "monday at 6 pm", "tomorrow at 2", "friday 3pm", etc.
  const timePatterns = [
    /(\w+day)\s+at\s+(\d{1,2})\s*(pm|am)/i,
    /(\w+day)\s+(\d{1,2})\s*(pm|am)/i,
    /(tomorrow|today)\s+at\s+(\d{1,2})\s*(pm|am)/i
  ];
  
  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match) {
      // For demo, just return a future ISO date
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      futureDate.setHours(18, 0, 0, 0); // 6 PM
      return futureDate.toISOString();
    }
  }
  
  return null;
}

// Create appointment directly when user specifies time
async function createDirectAppointment(baseResponse: string, listing: Listing, timeSlot: string): Promise<string> {
  try {
    const response = await fetch(`${CALENDAR_BASE_URL}/create-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing: {
          id: listing.id,
          title: listing.title,
          paymentMethods: listing.paymentMethods
        },
        buyerId: 'chat-buyer',
        startIso: timeSlot,
        spot: listing.meetSpots[0],
        buyerEmail: undefined
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return baseResponse + '\n\n📅 To schedule this meeting, I need to connect to Google Calendar first. Please visit http://localhost:4002/auth to authenticate.';
      }
      throw new Error('Failed to create appointment');
    }

    const appointment = await response.json();
    const meetingTime = new Date(timeSlot).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    return baseResponse + `\n\n✅ Perfect! I've scheduled our meeting for ${meetingTime} at ${listing.meetSpots[0]}. The appointment has been added to your Google Calendar. Looking forward to meeting you!`;
  } catch (error) {
    console.error('Direct appointment creation error:', error);
    return baseResponse + '\n\n📅 I\'d love to schedule that time with you! Let me know if that works and I\'ll get it on the calendar.';
  }
}

// Handle calendar integration
async function handleCalendarIntegration(baseResponse: string, listing: Listing): Promise<string> {
  try {
    // Get suggested time slots from calendar service
    const response = await fetch(`${CALENDAR_BASE_URL}/suggest-slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing, windowCount: 3 }),
    });

    const responseData = await response.json();
    
    if (!response.ok || responseData.needsAuth) {
      return baseResponse + '\n\n📅 To schedule a meeting, I need to connect to Google Calendar first. Please visit http://localhost:4002/auth to authenticate.';
    }

    const { suggested } = responseData;
    
    if (suggested.length === 0) {
      return baseResponse + '\n\n📅 I don\'t have any available time slots right now. Let me know your preferred times and I\'ll see what I can do!';
    }

    const timeOptions = suggested.map((slot: string, index: number) => {
      const date = new Date(slot);
      return `${index + 1}. ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }).join('\n');

    return baseResponse + `\n\n📅 Great! I have these available time slots for pickup:\n${timeOptions}\n\nJust let me know which time works for you and I\'ll add it to the calendar!`;
  } catch (error) {
    console.error('Calendar integration error:', error);
    return baseResponse + '\n\n📅 I\'d love to schedule a meeting with you! Let me know your preferred time and location.';
  }
}

// Create calendar appointment
app.post('/schedule', async (req, res) => {
  try {
    const { timeSlot, spot, buyerEmail } = req.body;
    
    if (!currentListing) {
      return res.status(400).json({ error: 'No listing available' });
    }

    const response = await fetch(`${CALENDAR_BASE_URL}/create-appointment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listing: {
          id: currentListing.id,
          title: currentListing.title,
          paymentMethods: currentListing.paymentMethods
        },
        buyerId: 'chat-buyer',
        startIso: timeSlot,
        spot: spot || currentListing.meetSpots[0],
        buyerEmail
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({ error: 'Calendar authentication required' });
      }
      throw new Error('Failed to create appointment');
    }

    const appointment = await response.json();
    res.json({ appointment, message: '✅ Meeting scheduled successfully!' });
  } catch (error) {
    console.error('Scheduling error:', error);
    res.status(500).json({ error: 'Failed to schedule meeting' });
  }
});

app.listen(port, () => {
  console.log(`Master AI service running on port ${port}`);
  console.log('OpenAI integration:', process.env.OPENAI_API_KEY ? '✅ Connected' : '❌ No API key');
});
