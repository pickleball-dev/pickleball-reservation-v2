export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ReservationStatus = "pending_payment" | "confirmed" | "cancelled" | "expired";
export type PaymentStatus = "pending" | "verified" | "rejected";
export type CourtStatus = "active" | "maintenance" | "disabled";
export type PaymentMethodType = "gcash" | "bank_transfer" | "online";
export type UserRole = "customer" | "staff" | "admin";
export type BlockReason = "maintenance" | "private_event" | "other";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      courts: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          hourly_rate: number;
          status: CourtStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["courts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["courts"]["Row"]>;
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          booking_number: string;
          court_id: string;
          customer_id: string | null;
          guest_name: string | null;
          guest_phone: string | null;
          starts_at: string;
          ends_at: string;
          total_amount: number;
          status: ReservationStatus;
          hold_expires_at: string | null;
          checkout_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reservations"]["Row"]> & {
          court_id: string;
          starts_at: string;
          ends_at: string;
          total_amount: number;
          booking_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["reservations"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "reservations_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          reservation_id: string;
          method: PaymentMethodType;
          reference_number: string | null;
          proof_url: string | null;
          amount: number;
          status: PaymentStatus;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & {
          reservation_id: string;
          method: PaymentMethodType;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          }
        ];
      };
      blocked_slots: {
        Row: {
          id: string;
          court_id: string;
          starts_at: string;
          ends_at: string;
          reason: BlockReason;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["blocked_slots"]["Row"]> & {
          court_id: string;
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["blocked_slots"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "blocked_slots_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "courts";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_methods: {
        Row: {
          id: string;
          type: PaymentMethodType;
          label: string;
          details: Json;
          is_active: boolean;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_methods"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["payment_methods"]["Row"]>;
        Relationships: [];
      };
      settings: {
        Row: { key: string; value: Json };
        Insert: { key: string; value: Json };
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      court_availability: {
        Row: {
          court_id: string;
          starts_at: string;
          ends_at: string;
          kind: "reservation" | "blocked";
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_booking_number: { Args: Record<string, never>; Returns: string };
      expire_stale_holds: { Args: Record<string, never>; Returns: void };
      review_payment: { Args: { p_payment_id: string; p_verifier_id: string; p_approve: boolean }; Returns: void };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
