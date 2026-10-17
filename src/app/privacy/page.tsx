import { LegalPage } from "@/components/legal";

export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="18 October 2026">
      <h3>What we collect</h3>
      <p>Account details (name, email, organization), expert profile information you choose to publish, booking and payment records, and the details you enter in forms such as workshop registrations and speaker enquiries. We do not store card or mobile-wallet numbers; our payment partner processes them.</p>
      <h3>How we use it</h3>
      <p>To run bookings and payments, send receipts and tickets, verify certificates, prevent fraud and abuse, and improve the service. We send transactional emails only; we do not send marketing without your consent.</p>
      <h3>What is public</h3>
      <p>Approved expert and speaker profiles that the person has agreed to list, and certificate details (holder name, program, date, issuer) when someone enters a valid certificate code.</p>
      <h3>Sharing</h3>
      <p>We share data with the expert you book, our payment partner, and our hosting and email providers, only as needed to provide the service. We do not sell personal data.</p>
      <h3>Retention</h3>
      <p>We keep financial records as long as the law requires. You can ask us to delete your account; we will remove what we are not required to keep.</p>
      <h3>Your choices</h3>
      <p>Experts can hide their profile at any time from the dashboard. You can ask for a copy or correction of your data by contacting us.</p>
    </LegalPage>
  );
}
