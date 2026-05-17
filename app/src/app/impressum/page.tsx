import LegalShell, { LH2, LP, LStrong, LA } from "@/components/legal/LegalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Impressum" };

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum" meta="Angaben gemäß § 5 TMG">
      <div className="mb-6">
        <LP><LStrong>Worqshop IO UG (haftungsbeschränkt)</LStrong></LP>
        <LP>In den Alboingärten 17</LP>
        <LP>12103 Berlin</LP>
        <LP>Deutschland</LP>
      </div>

      <LP><LStrong>Handelsregister:</LStrong> HRB 272700 B, Amtsgericht Charlottenburg</LP>
      <LP><LStrong>Vertreten durch die Geschäftsführer:</LStrong> Simon Bölts, Lorenz Käsermann, Lukasz Zyrek</LP>
      <LP><LStrong>E-Mail:</LStrong> <LA href="mailto:tech@worqshop.io">tech@worqshop.io</LA></LP>
      <LP><LStrong>Telefon:</LStrong> +49 160 1517018</LP>

      <LP><LStrong>Umsatzsteuer-ID gemäß § 27a UStG:</LStrong> DE453210797</LP>
      <LP><LStrong>Hinweis nach Medienstaatsvertrag:</LStrong> Es werden keine journalistisch-redaktionellen Inhalte im Sinne von § 18 Abs. 2 MStV bereitgehalten.</LP>

      <LH2>Haftung für Inhalte</LH2>
      <LP>Wir sind gemäß § 7 Abs. 1 TMG für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8–10 TMG sind wir nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben unberührt. Eine Haftung ist erst ab Kenntnis einer konkreten Rechtsverletzung möglich. Bei entsprechenden Hinweisen entfernen oder sperren wir betroffene Inhalte unverzüglich.</LP>

      <LH2>Haftung für Links</LH2>
      <LP>Unsere Website enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für diese Inhalte ist stets der jeweilige Anbieter verantwortlich. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte unzumutbar. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links umgehend.</LP>

      <LH2>Urheberrecht</LH2>
      <LP>Die durch Worqshop IO UG (haftungsbeschränkt) erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Jede Verwertung außerhalb der gesetzlichen Schranken (insbesondere Vervielfältigung, Bearbeitung, Verbreitung) bedarf der vorherigen schriftlichen Zustimmung der Rechteinhaber. Downloads und Kopien der Seiten sind nur für den privaten, nicht-kommerziellen Gebrauch gestattet. Inhalte Dritter sind als solche gekennzeichnet. Bei Bekanntwerden von Rechtsverletzungen entfernen wir entsprechende Inhalte unverzüglich.</LP>

      <LH2>Bild- und Markenhinweis</LH2>
      <LP>Das Herunterladen und die Nutzung von Bildern, Grafiken, Logos und sonstigen Medien dieser Seiten sind ohne vorherige schriftliche Zustimmung der Worqshop IO UG (haftungsbeschränkt) nicht gestattet. Genannte Marken- und Produktnamen sind Eigentum der jeweiligen Inhaber.</LP>
    </LegalShell>
  );
}
