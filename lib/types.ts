export interface Court {
  id: string;
  name: string;
  hourlyRate: number;
  status: "active" | "maintenance" | "disabled";
}

export interface TimeRange {
  startsAt: string; // ISO
  endsAt: string; // ISO
}

export interface AvailabilityBlock extends TimeRange {
  courtId: string;
  kind: "reservation" | "blocked";
}

export interface PriceBreakdown {
  hourlyRate: number;
  hours: number;
  total: number;
}
