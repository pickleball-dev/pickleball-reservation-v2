import { Checkout } from "@/components/Checkout";

export default function CheckoutPage({ params, searchParams }: { params: { id: string }; searchParams: { token?: string } }) {
  return <Checkout reservationId={params.id} token={searchParams.token ?? ""} />;
}
