import { randomUUID } from "crypto";
import type {
  SuggestSlotsRequest,
  SuggestSlotsResponse,
  CreateAppointmentRequest,
  CreateAppointmentResponse
} from "@upseller/shared";

const isoIn = (mins: number) =>
  new Date(Date.now() + mins * 60_000).toISOString();

export function makeSuggestSlotsSample(_req: SuggestSlotsRequest): SuggestSlotsResponse {
  // two start times ~45–90 mins in the future
  return { suggested: [isoIn(60), isoIn(105)] };
}

export function makeCreateAppointmentSample(req: CreateAppointmentRequest): CreateAppointmentResponse {
  const startIso = req.startIso || isoIn(60);
  const endIso = new Date(new Date(startIso).getTime() + (req.durationMin ?? 45) * 60_000).toISOString();
  return {
    id: randomUUID(),
    listingId: req.listing.id,
    buyerId: req.buyerId,
    startIso,
    endIso,
    spot: req.spot,
    status: "confirmed",
    eventId: "stub-event-id",
    htmlLink: "https://calendar.google.com/calendar/u/0/r",
    icsPath: "/ics/stub.ics",
  };
}
