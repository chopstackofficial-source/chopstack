import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({
    meta: [
      { title: "Terms & Conditions · ChopStack" },
      { name: "description", content: "ChopStack vendor, transporter and buyer terms of use, packaging standards, escrow, commission, delivery, disputes and privacy policy." },
    ],
  }),
});

function Terms() {
  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto pb-16">
      <div className="p-4 flex items-center gap-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <button onClick={() => history.back()} aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold">Terms & Conditions</h1>
      </div>
      <article className="p-5 space-y-5 text-sm leading-relaxed">
        <p className="text-xs text-muted-foreground">Last updated June 2026</p>

        <Section title="1. Acceptance">
          By creating a ChopStack account you agree to these Terms. Vendors and Transporters must explicitly accept these Terms before their account becomes active.
        </Section>

        <Section title="2. Packaging standards (Vendors)">
          All produce must be packaged in clean, food-safe containers. Perishables must be fresh on the day of dispatch. Mislabelled quantity, spoiled goods or unsanitary packaging are grounds for refund and suspension.
        </Section>

        <Section title="3. Vendor responsibilities">
          Vendors must respond to orders within 2 hours, fulfil accepted orders accurately and on time, keep listings up to date, and provide a working phone number for handoff coordination.
        </Section>

        <Section title="4. Transporter responsibilities">
          Transporters must verify identity (NIN), maintain a roadworthy vehicle, accept assignments within 15 minutes, deliver within the agreed window, and confirm handoff on the platform. 3 failed deliveries triggers automatic suspension pending review.
        </Section>

        <Section title="5. Order flow">
          Buyers place orders; vendors accept or reject with a reason. Phone numbers are only shared after acceptance. Pending orders auto-cancel after 2 hours of no response. Buyers have 6 hours after delivery to confirm receipt; otherwise funds auto-release. Orders auto-complete 48 hours after acceptance if no dispute is raised.
        </Section>

        <Section title="6. Escrow & payment">
          Online payments are held in escrow by ChopStack until the buyer confirms receipt or the auto-release window elapses. Cash on delivery / cash at meetup is settled directly between buyer and vendor.
        </Section>

        <Section title="7. Commission">
          ChopStack retains a 4% commission on the order subtotal of all paid orders. The remaining 96% is transferred to the vendor's verified bank account on release.
        </Section>

        <Section title="8. Delivery fees">
          Delivery fees are calculated by distance and vehicle type (Bike ₦350/km, Keke ₦450/km, Taxi ₦650/km, Minivan ₦800/km). Of the delivery fee collected, 80% goes to the transporter and 20% to ChopStack.
        </Section>

        <Section title="9. Dispute resolution">
          Buyers may open a dispute before confirming receipt. Funds are frozen pending review by the ChopStack team, who may release, partially refund, or fully refund based on evidence.
        </Section>

        <Section title="10. Prohibited conduct">
          No sale of restricted, hazardous, expired, illegal, or stolen goods. No harassment, abusive language, or off-platform payment circumvention. Violations result in immediate suspension and may be reported to authorities.
        </Section>

        <Section title="11. Suspension policy">
          ChopStack may suspend or terminate any account that breaches these Terms, accumulates excessive failed deliveries, or generates repeated buyer complaints.
        </Section>

        <Section title="12. Liability">
          ChopStack provides the marketplace and payment rails; it is not a party to the underlying sale. ChopStack is not liable for indirect, incidental, or consequential damages arising from any transaction beyond the funds held in escrow.
        </Section>

        <Section title="13. Privacy">
          We collect the minimum data needed to operate the marketplace (name, contact, location, bank, NIN for transporters). Data is encrypted in transit and never sold. You may request deletion of your account at any time.
        </Section>

        <Section title="14. Updates">
          These Terms may be updated. Continued use of the platform after a material change constitutes acceptance of the revised Terms.
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="font-bold text-base">{title}</h2>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}