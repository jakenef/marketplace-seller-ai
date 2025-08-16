import { Appointment } from '@upseller/shared';
import * as fs from 'fs';
import * as path from 'path';

export class ICSGenerator {
  private static readonly ICS_DIR = path.join(__dirname, '../ics');

  static async createAppointmentICS(appointment: Appointment): Promise<string> {
    // Ensure ICS directory exists
    if (!fs.existsSync(this.ICS_DIR)) {
      fs.mkdirSync(this.ICS_DIR, { recursive: true });
    }

    const icsContent = this.generateICSContent(appointment);
    const fileName = `${appointment.id}.ics`;
    const filePath = path.join(this.ICS_DIR, fileName);

    fs.writeFileSync(filePath, icsContent, 'utf8');

    return `/ics/${fileName}`;
  }

  private static generateICSContent(appointment: Appointment): string {
    const now = new Date();
    const formatDate = (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const summary = `Marketplace Item Pickup`;
    const description = `Meeting to pickup/view marketplace item\\nLocation: ${appointment.spot}`;
    const location = appointment.spot;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Upseller//Marketplace Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${appointment.id}@upseller.local`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART:${formatDate(appointment.startIso)}`,
      `DTEND:${formatDate(appointment.endIso)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `STATUS:${appointment.status.toUpperCase()}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Marketplace meetup in 15 minutes',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}
