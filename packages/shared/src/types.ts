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
