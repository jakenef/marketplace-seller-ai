export type UUID = string;

export interface Listing {
  id: UUID;
  title: string;
  listPrice: number;
  minPrice: number;
  locationCity: string;
  meetSpots: string[];
  availability: string[];
  paymentMethods: ('venmo' | 'cash')[];
  deadlineTs?: string;
}

export interface BuyerMessage {
  id: UUID;
  listingId: UUID;
  buyerId: UUID;
  text: string;
  ts: string;
  source: 'mock' | 'facebook';
}

export interface Classified {
  intent:
    | 'availability_check'
    | 'offer'
    | 'question'
    | 'schedule_proposal'
    | 'scam_risk'
    | 'lowball'
    | 'bundle_interest'
    | 'confirm_meet';
  offerPrice?: number;
  proposedTimeIso?: string;
  questions?: string[];
  flags?: string[];
}

export interface PolicyContext {
  listPrice: number;
  minPrice: number;
  hoursToDeadline?: number;
  recentInquiriesPerHour: number;
}

export interface DraftReply {
  text: string;
  action?: 'counter' | 'accept' | 'decline' | 'schedule_proposal' | 'confirm';
  counterPrice?: number;
  proposedTimes?: string[];
  meetSpot?: string;
  requireHumanClick?: boolean;
  safetyNote?: string;
  icsPath?: string;
}

export interface Appointment {
  id: UUID;
  listingId: UUID;
  buyerId: UUID;
  startIso: string;
  endIso: string;
  spot: string;
  status: 'proposed' | 'confirmed' | 'cancelled';
  icsPath?: string;
}

// --- Calendar endpoint contracts ---
export interface SuggestSlotsRequest {
  listing: Listing;
  windowCount?: number;   // default: 2
  durationMin?: number;   // default: 45
}

export interface SuggestSlotsResponse {
  suggested: string[];    // ISO start times
}

export interface CreateAppointmentRequest {
  listing: Pick<Listing, "id" | "title" | "paymentMethods">;
  buyerId: UUID;
  startIso: string;
  spot: string;
  durationMin?: number;   // default: 45
  buyerEmail?: string;    // optional: invite buyer
}

// Keep your existing Appointment as-is, but for the API response
// it's handy to include Google event info (non-breaking: new optional fields)
export interface CreateAppointmentResponse extends Appointment {
  eventId?: string;       // Google Calendar event id
  htmlLink?: string;      // Google Calendar UI link
}

// --- Optional: surface auth status (used when calendar needs connect) ---
export interface CalendarAuthStatus {
  needsAuth: boolean;
  authUrl?: string;       // e.g., "/auth/google"
  reason?: string;        // optional message for UI
}