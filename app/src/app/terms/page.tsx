import LegalShell, { LH2, LP, LStrong, LA } from "@/components/legal/LegalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Terms of Service" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" meta={<><LStrong>As of:</LStrong> 21 May 2026</>}>
      <LH2>§ 1 Scope</LH2>
      <LP>(1) These Terms of Service apply to all contracts between Worqshop IO UG (haftungsbeschraenkt), In den Alboingaerten 17, 12103 Berlin (the "Provider") and its customers regarding the use of the online service Syn, accessible at asksyn.com.</LP>
      <LP>(2) Conflicting terms of customers are not recognised unless the Provider expressly agrees to them in writing.</LP>

      <LH2>§ 2 Object of the Contract</LH2>
      <LP>Syn is a Software-as-a-Service that lets users run synthetic focus group discussions. The service uses AI models for persona generation, moderation and report creation. Scope of service depends on the chosen subscription tier (asksyn.com/#pricing).</LP>

      <LH2>§ 3 Pricing and Payment</LH2>
      <LP>Prices listed on the website apply, plus statutory VAT. Billing is monthly in advance via the payment processor Chargebee. In case of payment default the Provider may temporarily suspend access.</LP>

      <LH2>§ 4 Session Quota and Top-ups</LH2>
      <LP>(1) Each subscription includes a fixed monthly session quota as listed in the pricing table.</LP>
      <LP>(2) A session counts as used once the first message has been sent in its chat ("started session"). Deletion after start does NOT refund the slot.</LP>
      <LP>(3) Sessions that were created but never started count as reserved slots; deletion before the first message frees the slot.</LP>
      <LP>(4) The monthly quota expires at the end of each billing period; unused sessions cannot be carried over.</LP>
      <LP>(5) Additional sessions can be purchased at the prices listed in the pricing table within a billing period. Purchased extras likewise expire at period end and are non-transferable.</LP>

      <LH2>§ 5 Term and Cancellation</LH2>
      <LP>Subscriptions renew automatically. Cancellation is possible via account settings or by email to <LA href="mailto:tech@worqshop.io">tech@worqshop.io</LA> with 14 days notice before period end.</LP>

      <LH2>§ 6 Liability</LH2>
      <LP>Syn relies on AI models that may produce inaccurate output. The Provider is not liable for decisions made on the basis of Syn's results.</LP>

      <LH2>§ 7 Data Protection</LH2>
      <LP>See our privacy notice at asksyn.com/privacy.</LP>

      <LH2>§ 8 Final Provisions</LH2>
      <LP>German law applies. Place of jurisdiction is Berlin to the extent legally permissible.</LP>
    </LegalShell>
  );
}
