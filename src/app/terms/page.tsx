import { LegalPage } from "@/components/legal";

export const metadata = { title: "Terms of service" };

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="18 October 2026">
      <h3>1. Who we are</h3>
      <p>Mentora is a marketplace that connects organizations and individuals with independent trainers, facilitators, coaches, consultants and speakers (&ldquo;experts&rdquo;). Mentora arranges bookings and payments; experts deliver the services.</p>
      <h3>2. Accounts</h3>
      <p>You must give accurate information and keep your password private. You are responsible for activity on your account. We may suspend accounts that break these terms.</p>
      <h3>3. Experts</h3>
      <p>Experts appear publicly only after Mentora approves the profile and the expert agrees to be listed. Experts confirm their qualifications are true, deliver what they quote, and may withdraw their listing at any time from their dashboard.</p>
      <h3>4. Bookings and payments</h3>
      <p>Prices are shown in Bangladeshi taka and paid through our payment partner. Mentora collects the payment and pays the expert after deducting the published commission or platform fee. Fees are listed on the pricing page.</p>
      <h3>5. Certificates</h3>
      <p>Certificates issued through Mentora carry a unique code that anyone can check. Mentora may revoke a certificate issued in error or obtained dishonestly.</p>
      <h3>6. Cancellations and refunds</h3>
      <p>Refunds follow the refund policy.</p>
      <h3>7. Acceptable use</h3>
      <p>Do not misuse the platform, impersonate others, list services you cannot deliver, or try to arrange payment outside Mentora for clients introduced through Mentora.</p>
      <h3>8. Liability</h3>
      <p>Experts are independent and responsible for their services. To the extent the law allows, Mentora&rsquo;s liability for any claim is limited to the fees Mentora received for the booking concerned.</p>
      <h3>9. Governing law</h3>
      <p>These terms are governed by the laws of Bangladesh, and disputes are subject to the courts of Dhaka.</p>
    </LegalPage>
  );
}
