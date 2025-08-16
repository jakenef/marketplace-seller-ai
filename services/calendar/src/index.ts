import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

app.use(express.json());

// Google Calendar setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// 1. Test Google Account Connection
app.get('/auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar']
  });
  res.json({ authUrl });
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    res.json({ message: 'Authentication successful', tokens });
  } catch (error) {
    res.status(400).json({ error: 'Authentication failed', details: error });
  }
});

// 2. Get Events from Google Calendar
app.get('/events', async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });
    res.json({ events: response.data.items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get events', details: error });
  }
});

// 3. Create New Event in Google Calendar
app.post('/events', async (req, res) => {
  const { summary, start, end, description } = req.body;
  
  try {
    const event = {
      summary,
      description,
      start: {
        dateTime: start,
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: end,
        timeZone: 'America/New_York'
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });

    res.json({ message: 'Event created', event: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event', details: error });
  }
});

app.listen(PORT, () => {
  console.log(`Calendar server running on port ${PORT}`);
});
