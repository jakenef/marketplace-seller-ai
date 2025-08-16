import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import type {
  SuggestSlotsRequest,
  SuggestSlotsResponse,
  CreateAppointmentRequest,
  CreateAppointmentResponse
} from "@upseller/shared";
import { randomUUID } from "crypto";

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
const TZ = process.env.TIMEZONE || "America/Denver";

const addMinutes = (iso: string, mins: number) =>
  new Date(new Date(iso).getTime() + mins * 60000).toISOString();

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);

const roundUpToNextHalfHour = (d: Date) =>
  new Date(Math.ceil((d.getTime() + 1) / (30 * 60 * 1000)) * (30 * 60 * 1000));

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

app.post<{}, SuggestSlotsResponse | { needsAuth: true; authUrl: string }, SuggestSlotsRequest>(
  "/suggest-slots",
  async (req, res) => {
    const { listing, windowCount = 2, durationMin = 45 } = req.body;

    // require OAuth first
    const creds: any = (oauth2Client as any).credentials || {};
    if (!creds.access_token && !creds.refresh_token) {
      return res.status(401).json({ needsAuth: true, authUrl: "/auth" });
    }

    // parse seller availability windows
    const intervals = (listing.availability || [])
      .map(iv => iv.split("/"))
      .filter(p => p.length === 2);

    if (intervals.length === 0) return res.json({ suggested: [] });

    // compute overall span for FreeBusy
    const timeMin = new Date(intervals.map(p => p[0]).sort()[0]).toISOString();
    const timeMax = new Date(intervals.map(p => p[1]).sort().slice(-1)[0]).toISOString();

    // ask Google when you're busy
    const fb = await calendar.freebusy.query({
      requestBody: { timeMin, timeMax, items: [{ id: "primary" }], timeZone: TZ }
    });
    const busy = (fb.data.calendars?.primary?.busy ?? []).map(b => ({
      start: b.start!, end: b.end!
    }));

    // scan for the first N open slots on a 30-min grid
    const suggested: string[] = [];
    const nowPlus30 = roundUpToNextHalfHour(new Date(Date.now() + 30 * 60 * 1000));

    for (const [startIso, endIso] of intervals) {
      let cur = new Date(Math.max(new Date(startIso).getTime(), nowPlus30.getTime()));
      const end = new Date(endIso);

      while (cur.getTime() + durationMin * 60000 <= end.getTime()) {
        const slotStart = cur.toISOString();
        const slotEnd = addMinutes(slotStart, durationMin);
        const conflict = busy.some(b => overlaps(slotStart, slotEnd, b.start, b.end));
        if (!conflict) suggested.push(slotStart);
        if (suggested.length >= windowCount) return res.json({ suggested });
        cur = new Date(cur.getTime() + 30 * 60000); // advance 30 min
      }
    }

    return res.json({ suggested });
  }
);

app.post<{}, CreateAppointmentResponse | { needsAuth: true; authUrl: string }, CreateAppointmentRequest>(
  "/create-appointment",
  async (req, res) => {
    const { listing, buyerId, startIso, spot, durationMin = 45, buyerEmail } = req.body;

    const creds: any = (oauth2Client as any).credentials || {};
    if (!creds.access_token && !creds.refresh_token) {
      return res.status(401).json({ needsAuth: true, authUrl: "/auth" });
    }

    const endIso = addMinutes(startIso, durationMin);

    const resp = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Marketplace Pickup - ${listing.title}`,
        location: spot,
        description: `Payment: ${(listing.paymentMethods || []).join(", ")}`,
        start: { dateTime: startIso, timeZone: TZ },
        end:   { dateTime: endIso,   timeZone: TZ },
        attendees: buyerEmail ? [{ email: buyerEmail }] : []
      },
      sendUpdates: "all"
    });

    return res.json({
      id: randomUUID(),
      listingId: listing.id,
      buyerId,
      startIso,
      endIso,
      spot,
      status: "confirmed",
      eventId: resp.data.id ?? undefined,
      htmlLink: resp.data.htmlLink ?? undefined,
    });
  }
);
