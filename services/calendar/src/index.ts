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
import cors from "cors";
import fs from "fs";
import path from "path";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly"
];



dotenv.config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 4002;

app.use(express.json());

// Google Calendar setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// load tokens at server start
const TOKEN_PATH = path.join(process.cwd(), "token.json");
if (fs.existsSync(TOKEN_PATH)) {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  oauth2Client.setCredentials(tokens);
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const TZ = process.env.TIMEZONE || "America/Denver";

const addMinutes = (iso: string, mins: number) =>
  new Date(new Date(iso).getTime() + mins * 60000).toISOString();

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);

const roundUpToNextHalfHour = (d: Date) =>
  new Date(Math.ceil((d.getTime() + 1) / (30 * 60 * 1000)) * (30 * 60 * 1000));

// 1. Test Google Account Connection
// /auth route: include prompt:'consent'
app.get('/auth', (_req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  });
  res.json({ authUrl });
});

// in callback: save tokens and avoid returning them to client
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens), "utf8");
    res.send('Google Calendar connected. You can close this tab.');
  } catch (error) {
    res.status(400).json({ error: 'Authentication failed' });
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
        timeZone: TZ
      },
      end: {
        dateTime: end,
        timeZone: TZ
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

    // parse seller availability windows: ["startISO/endISO", ...]
    const intervals = (listing.availability || [])
      .map(s => s.split("/"))
      .filter(p => p.length === 2);

    if (intervals.length === 0) return res.json({ suggested: [] });

    // overall span for FreeBusy
    const timeMin = new Date(intervals.map(p => p[0]).sort()[0]).toISOString();
    const timeMax = new Date(intervals.map(p => p[1]).sort().slice(-1)[0]).toISOString();

    // ask Google when you're busy in that span
    const fb = await calendar.freebusy.query({
      requestBody: { timeMin, timeMax, items: [{ id: "primary" }], timeZone: TZ }
    });

    const busy = (fb.data.calendars?.primary?.busy ?? []).map(b => ({
      start: b.start!, end: b.end!
    }));

    // scan availability on a 30-min grid, earliest-first
    const suggested: string[] = [];
    const nowPlus30 = roundUpToNextHalfHour(new Date(Date.now() + 30 * 60 * 1000));

    for (const [startIso, endIso] of intervals) {
      let cur = new Date(Math.max(new Date(startIso).getTime(), nowPlus30.getTime()));
      const end = new Date(endIso);

      while (cur.getTime() + durationMin * 60000 <= end.getTime()) {
        const slotStart = cur.toISOString();
        const slotEnd = addMinutes(slotStart, durationMin);

        // optional “Utah/Sunday” rule — remove if you don’t want it
        const isSunday = cur.getDay() === 0;

        // conflict check vs busy blocks
        const conflict = busy.some(b => overlaps(slotStart, slotEnd, b.start, b.end));

        if (!isSunday && !conflict) {
          suggested.push(slotStart);
          if (suggested.length >= windowCount) {
            return res.json({ suggested });
          }
        }
        // step forward 30 minutes
        cur = new Date(cur.getTime() + 30 * 60000);
      }
    }

    return res.json({ suggested });
  }
);

// POST /create-appointment  (real Google insert)
app.post<{}, CreateAppointmentResponse | { needsAuth: true; authUrl: string }, CreateAppointmentRequest>(
  "/create-appointment",
  async (req, res) => {
    try {
      const { listing, buyerId, startIso, spot, durationMin = 45, buyerEmail } = req.body;

      // OAuth guard
      const creds: any = (oauth2Client as any).credentials || {};
      if (!creds.access_token && !creds.refresh_token) {
        return res.status(401).json({ needsAuth: true, authUrl: "/auth" });
      }

      // Compute end time
      const endIso = new Date(new Date(startIso).getTime() + durationMin * 60_000).toISOString();
      const TZ = process.env.TIMEZONE || "America/Denver";

      // Create the event on primary calendar
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

      // Normalize possibly-null fields from googleapis
      const eventId = resp.data.id ?? undefined;
      const htmlLink = resp.data.htmlLink ?? undefined;

      // Return your standardized response
      return res.json({
        id: randomUUID(),
        listingId: listing.id,
        buyerId,
        startIso,
        endIso,
        spot,
        status: "confirmed",
        eventId,
        htmlLink
        // icsPath: undefined // add later if you generate ICS files
      });
    } catch (err: any) {
      console.error("create-appointment error:", err?.message || err);
      return res.status(500).json({ error: "create_appointment_failed" } as any);
    }
  }
);
