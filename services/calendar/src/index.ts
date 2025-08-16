import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import { Listing, Appointment, UUID, TIMEZONE } from '@upseller/shared';
import { ICSGenerator } from './utils/icsGenerator';

dotenv.config();

const app = express();
const port = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// Serve static ICS files
app.use('/ics', express.static(path.join(__dirname, '../ics')));

// In-memory storage for demo
const appointments: Appointment[] = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'calendar' });
});

// Suggest time slots
app.post('/suggest-slots', (req, res) => {
  const { listing, windowCount = 2 } = req.body;
  
  // Generate suggested time slots based on current time
  const now = new Date();
  const suggested: string[] = [];
  
  // Suggest slots starting 2 hours from now, spaced 45 minutes apart
  for (let i = 0; i < windowCount; i++) {
    const slotTime = new Date(now.getTime() + (2 * 60 + i * 45) * 60 * 1000);
    suggested.push(slotTime.toISOString());
  }
  
  res.json({ suggested });
});

// Create appointment
app.post('/create-appointment', async (req, res) => {
  try {
    const { listing, buyerId, startIso, spot } = req.body;
    
    // Calculate end time (45 minutes later)
    const startTime = new Date(startIso);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    
    const appointment: Appointment = {
      id: `appt-${Date.now()}` as UUID,
      listingId: listing.id,
      buyerId,
      startIso: startTime.toISOString(),
      endIso: endTime.toISOString(),
      spot,
      status: 'proposed',
    };
    
    // Generate ICS file
    const icsPath = await ICSGenerator.createAppointmentICS(appointment);
    appointment.icsPath = icsPath;
    
    appointments.push(appointment);
    
    res.json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Get appointments
app.get('/appointments', (req, res) => {
  res.json(appointments);
});

// Update appointment status
app.patch('/appointments/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const appointment = appointments.find(a => a.id === id);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  appointment.status = status;
  res.json(appointment);
});

app.listen(port, () => {
  console.log(`Calendar service running on port ${port}`);
});
