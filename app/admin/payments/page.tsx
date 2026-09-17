import { createClient } from "@/lib/supabase/server";
import { PaymentReview } from "@/components/PaymentReview";

export default async function PaymentsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("payments").select("id, reference_number, amount, method, status, created_at, reservations(booking_number, courts(name))").eq("status", "pending").order("created_at");
  return <div><h1 className="mb-1 font-display text-2xl font-bold">Payment verification</h1><p className="mb-6 text-sm text-ash">Review submitted payment references before confirming a booking.</p><PaymentReview payments={(data ?? []) as any} /></div>;
}
