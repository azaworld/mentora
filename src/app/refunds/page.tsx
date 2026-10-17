import { LegalPage } from "@/components/legal";

export const metadata = { title: "Refund policy" };

export default function Refunds() {
  return (
    <LegalPage title="Refund policy" updated="18 October 2026">
      <h3>Workshops</h3>
      <p>Cancel at least 7 days before the start for a full refund. Within 7 days, you can transfer your seat to a colleague at no cost. If a workshop is cancelled or moved by the organizer, you get a full refund.</p>
      <h3>Program bookings</h3>
      <p>Refunds for booked programs follow the terms agreed in the proposal. If the expert cannot deliver, Mentora refunds you in full or arranges an agreed replacement.</p>
      <h3>Plans, featured listings and certificates</h3>
      <p>Subscription plans and featured listings can be cancelled at any time and stop at the end of the paid period; they are not refunded part-way. Certificate fees are not refundable once the certificate is issued.</p>
      <h3>Payments we couldn&rsquo;t complete</h3>
      <p>If you were charged but we could not complete your order (for example, the last seat sold seconds earlier), we refund the full amount within 7 working days to the original payment method.</p>
    </LegalPage>
  );
}
