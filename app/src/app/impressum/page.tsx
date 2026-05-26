import LegalShell, { LH2, LP, LStrong, LA } from "@/components/legal/LegalShell";
import { getLocaleFromCookies } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Impressum / Imprint" };

export default async function ImpressumPage() {
  const locale = await getLocaleFromCookies();
  if (locale === "en") return <EnImpressum />;
  return <DeImpressum />;
}

function DeImpressum() {
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

function EnImpressum() {
  return (
    <LegalShell title="Imprint" meta="Information pursuant to § 5 TMG (German Telemedia Act)">
      <div className="mb-6">
        <LP><LStrong>Worqshop IO UG (haftungsbeschränkt)</LStrong></LP>
        <LP>In den Alboingärten 17</LP>
        <LP>12103 Berlin</LP>
        <LP>Germany</LP>
      </div>

      <LP><LStrong>Commercial register:</LStrong> HRB 272700 B, Amtsgericht Charlottenburg (Charlottenburg District Court)</LP>
      <LP><LStrong>Represented by the managing directors:</LStrong> Simon Bölts, Lorenz Käsermann, Lukasz Zyrek</LP>
      <LP><LStrong>E-mail:</LStrong> <LA href="mailto:tech@worqshop.io">tech@worqshop.io</LA></LP>
      <LP><LStrong>Phone:</LStrong> +49 160 1517018</LP>

      <LP><LStrong>VAT identification number pursuant to § 27a UStG (German VAT Act):</LStrong> DE453210797</LP>
      <LP><LStrong>Note under the German Media State Treaty:</LStrong> No journalistic-editorial content within the meaning of § 18 (2) MStV is held available.</LP>

      <LH2>Liability for content</LH2>
      <LP>Pursuant to § 7 (1) TMG, we are responsible for our own content on these pages in accordance with general laws. Under §§ 8–10 TMG, we are not obligated to monitor transmitted or stored third-party information or to investigate circumstances that suggest illegal activity. Obligations to remove or block the use of information under general laws remain unaffected. Liability is only possible from the moment we become aware of a specific legal violation. Upon notification of corresponding infringements, we will remove the content in question without delay.</LP>

      <LH2>Liability for links</LH2>
      <LP>Our website contains links to external third-party websites whose content we have no influence over. The respective provider is always responsible for that content. Illegal content was not identifiable at the time of linking. Permanent monitoring of linked pages without concrete evidence is not reasonable. If we become aware of any legal violations, we will remove such links immediately.</LP>

      <LH2>Copyright</LH2>
      <LP>Content and works created by Worqshop IO UG (haftungsbeschränkt) on these pages are subject to German copyright law. Any use beyond the statutory exceptions (in particular reproduction, adaptation, distribution) requires the prior written consent of the respective rights holders. Downloads and copies of these pages are permitted only for private, non-commercial use. Third-party content is identified as such. Upon notification of infringements, we will remove the relevant content without delay.</LP>

      <LH2>Image and trademark notice</LH2>
      <LP>Downloading and use of images, graphics, logos, and other media from these pages without the prior written consent of Worqshop IO UG (haftungsbeschränkt) is not permitted. Trademark and product names mentioned are the property of their respective owners.</LP>
    </LegalShell>
  );
}
