import LegalShell, { LH2, LP, LStrong, LA } from "@/components/legal/LegalShell";
import { getLocaleFromCookies } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Allgemeine Geschäftsbedingungen / Terms of Service" };

export default async function AGBPage() {
  const locale = await getLocaleFromCookies();
  if (locale === "en") return <EnTerms />;
  return <DeAGB />;
}

function DeAGB() {
  return (
    <LegalShell title="Allgemeine Geschäftsbedingungen" meta={<><LStrong>Stand:</LStrong> 21. Mai 2026</>}>
      <LH2>§ 1 Geltungsbereich</LH2>
      <LP>(1) Diese Allgemeinen Geschäftsbedingungen (im Folgenden „AGB") gelten für alle Verträge zwischen der Worqshop IO UG (haftungsbeschränkt), In den Alboingärten 17, 12103 Berlin (im Folgenden „Anbieter"), und ihren Kund:innen über die Nutzung des Online-Dienstes Syn, erreichbar unter asksyn.com (im Folgenden „Syn" oder „Dienst").</LP>
      <LP>(2) Abweichende Bedingungen der Kund:innen werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich schriftlich zu.</LP>
      <LP>(3) Syn richtet sich an Unternehmer:innen im Sinne von § 14 BGB und an Verbraucher:innen im Sinne von § 13 BGB. Soweit Regelungen ausschließlich für eine dieser Gruppen gelten, ist dies kenntlich gemacht.</LP>

      <LH2>§ 2 Vertragsgegenstand</LH2>
      <LP>(1) Syn ist ein Software-as-a-Service, mit dem Nutzer:innen synthetische Fokusgruppen-Diskussionen erzeugen können. Der Dienst nutzt AI-Modelle zur Generierung von Personas, zur Moderation der Diskussionen und zur Erstellung von Berichten.</LP>
      <LP>(2) Der konkrete Leistungsumfang richtet sich nach dem gewählten Abonnement-Tarif. Eine aktuelle Übersicht der Tarife ist unter asksyn.com/#pricing verfügbar.</LP>
      <LP>(3) Der Anbieter ist berechtigt, den Funktionsumfang weiterzuentwickeln, sofern der vertragliche Kerninhalt erhalten bleibt.</LP>

      <LH2>§ 3 Vertragsschluss</LH2>
      <LP>(1) Die Darstellung von Syn auf der Website stellt kein bindendes Angebot dar, sondern eine Aufforderung zur Abgabe eines Angebots.</LP>
      <LP>(2) Durch Auswahl eines Tarifs und Bestätigung im Checkout gibst du ein verbindliches Angebot zum Abschluss eines Abonnement-Vertrags ab. Der Vertrag kommt mit Bestätigung durch den Anbieter (in der Regel per E-Mail) zustande.</LP>
      <LP>(3) Voraussetzung für den Vertragsschluss ist die Eröffnung eines Nutzer-Accounts.</LP>

      <LH2>§ 4 Preise und Zahlung</LH2>
      <LP>(1) Es gelten die zum Zeitpunkt des Vertragsschlusses auf der Website ausgewiesenen Preise zuzüglich gesetzlicher Umsatzsteuer.</LP>
      <LP>(2) Die Abrechnung erfolgt monatlich im Voraus per automatischer Abbuchung über den Zahlungsdienstleister Chargebee.</LP>
      <LP>(3) Bei Zahlungsverzug ist der Anbieter berechtigt, den Zugang zu Syn vorübergehend zu sperren.</LP>

      <LH2>§ 4a Session-Kontingent und Zubuchungen</LH2>
      <LP>(1) Jedes Abonnement enthaelt ein festes monatliches Kontingent an Sessions, das in der Tarifuebersicht (asksyn.com/#pricing) ausgewiesen ist.</LP>
      <LP>(2) Eine Session gilt als verbraucht, sobald die erste Nachricht im Chat dieser Session gesendet wurde („begonnene Session"). Loeschungen nach Beginn fuehren nicht zur Erstattung des verbrauchten Slots.</LP>
      <LP>(3) Sessions, die angelegt, aber noch nicht begonnen wurden, gelten als reservierter Slot. Werden sie geloescht, bevor die erste Nachricht gesendet wurde, wird der Slot wieder freigegeben.</LP>
      <LP>(4) <LStrong>Monatliches Inklusiv-Kontingent.</LStrong> Das im gewaehlten Tarif enthaltene Monatskontingent ist nicht uebertragbar und verfaellt am Ende der jeweiligen Abrechnungsperiode. Mit Beginn der naechsten Periode wird das volle Inklusiv-Kontingent erneut gutgeschrieben.</LP>
      <LP>(5) <LStrong>Zugekaufte Extra-Sessions.</LStrong> Innerhalb einer Abrechnungsperiode koennen zusaetzliche Sessions zu den in der Tarifuebersicht ausgewiesenen Preisen erworben werden. Zugekaufte Sessions sind ab dem Kaufdatum <LStrong>12 Monate</LStrong> gueltig. Sie verfallen erst nach Ablauf dieser Frist, nicht am Ende der Abrechnungsperiode.</LP>
      <LP>(6) <LStrong>Verbrauchs-Reihenfolge.</LStrong> Wird eine neue Session begonnen, wird zunaechst das monatliche Inklusiv-Kontingent verbraucht. Erst wenn dieses fuer den aktuellen Monat aufgebraucht ist, wird auf zugekaufte Extra-Sessions zugegriffen (jeweils das Guthaben mit dem fruehesten Ablaufdatum zuerst).</LP>
      <LP>(7) <LStrong>Verfuegbarkeit nach Vertragsende.</LStrong> Nach Kuendigung oder Aussetzung des Abonnements bleiben bereits zugekaufte, ungenutzte Extra-Sessions innerhalb der 12-Monats-Frist weiterhin nutzbar. Eine Erstattung in Geld ist ausgeschlossen.</LP>

      <LH2>§ 5 Vertragslaufzeit und Kündigung</LH2>
      <LP>(1) Der Abonnement-Vertrag verlängert sich automatisch um den jeweils gebuchten Zeitraum (in der Regel ein Monat), wenn er nicht zuvor mit einer Frist von 14 Tagen zum Ende der laufenden Abrechnungsperiode gekündigt wird.</LP>
      <LP>(2) Die Kündigung kann unkompliziert über die Account-Einstellungen oder per E-Mail an <LA href="mailto:tech@worqshop.io">tech@worqshop.io</LA> erklärt werden.</LP>
      <LP>(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.</LP>

      <LH2>§ 6 Widerrufsrecht für Verbraucher</LH2>
      <LP>(1) Verbraucher:innen haben grundsätzlich ein vierzehntägiges Widerrufsrecht (§ 355 BGB).</LP>
      <LP>(2) Das Widerrufsrecht erlischt, wenn der Anbieter mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist auf ausdrückliches Verlangen des/der Verbraucher:in begonnen hat und der/die Verbraucher:in seine/ihre Kenntnis davon bestätigt hat, dass das Widerrufsrecht mit Beginn der Vertragsausführung erlischt (§ 356 Abs. 5 BGB).</LP>
      <LP><LStrong>Hinweis:</LStrong> Die konkrete Widerrufsbelehrung muss vom Anwalt formuliert werden — gesetzlich vorgeschriebene Muster sind verbindlich.</LP>

      <LH2>§ 7 Nutzungsrechte</LH2>
      <LP>(1) Der Anbieter räumt dem/der Kund:in für die Vertragslaufzeit ein einfaches, nicht übertragbares, nicht ausschließliches Recht zur Nutzung von Syn im vertraglich vereinbarten Umfang ein.</LP>
      <LP>(2) Inhalte, die der/die Kund:in in Syn hochlädt oder erzeugt (Briefings, Personas, Diskussionen, Berichte), verbleiben im Eigentum des/der Kund:in. Der Anbieter erhält ein einfaches Nutzungsrecht ausschließlich zum Zweck der Bereitstellung des Dienstes.</LP>
      <LP>(3) Der Anbieter verwendet Kund:innen-Inhalte nicht zum Training eigener oder fremder AI-Modelle.</LP>

      <LH2>§ 8 Pflichten des Nutzers</LH2>
      <LP>(1) Du verpflichtest dich, Syn nicht zur Erzeugung rechtswidriger, beleidigender, diskriminierender oder gegen Persönlichkeitsrechte Dritter verstoßender Inhalte zu nutzen.</LP>
      <LP>(2) Du verpflichtest dich, deine Zugangsdaten geheim zu halten und nicht an Dritte weiterzugeben.</LP>
      <LP>(3) Bei Verstößen gegen diese Pflichten ist der Anbieter berechtigt, den Account vorübergehend zu sperren oder den Vertrag außerordentlich zu kündigen.</LP>

      <LH2>§ 9 Verfügbarkeit</LH2>
      <LP>(1) Der Anbieter ist um eine möglichst hohe Verfügbarkeit von Syn bemüht, garantiert jedoch keine ununterbrochene Erreichbarkeit. Kurze Ausfälle aufgrund von Wartungsarbeiten, Updates oder höherer Gewalt sind kein Mangel des Dienstes.</LP>
      <LP>(2) Geplante Wartungsfenster werden, soweit möglich, vorher angekündigt.</LP>

      <LH2>§ 10 Haftung</LH2>
      <LP>(1) Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit.</LP>
      <LP>(2) Bei leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und auch hier nur in Höhe des vertragstypisch vorhersehbaren Schadens.</LP>
      <LP>(3) Die Haftung für den durch AI-Modelle generierten Inhalt ist ausgeschlossen, soweit gesetzlich zulässig. AI-Ergebnisse sind als Hinweise und Anregungen zu verstehen, nicht als verbindliche Empfehlungen.</LP>
      <LP><LStrong>Hinweis:</LStrong> Haftungsausschlüsse sind juristisch heikel — anwaltlich prüfen lassen.</LP>

      <LH2>§ 11 Datenschutz</LH2>
      <LP>Informationen zur Verarbeitung personenbezogener Daten finden sich in der <LA href="/datenschutz">Datenschutzerklärung</LA>.</LP>

      <LH2>§ 12 Schlussbestimmungen</LH2>
      <LP>(1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.</LP>
      <LP>(2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist Berlin, soweit der/die Kund:in Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.</LP>
      <LP>(3) Sollte eine Bestimmung dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</LP>
      <LP>(4) Der Anbieter behält sich vor, diese AGB mit Wirkung für die Zukunft anzupassen. Über Änderungen werden Kund:innen rechtzeitig per E-Mail informiert.</LP>
    </LegalShell>
  );
}

function EnTerms() {
  return (
    <LegalShell title="Terms of Service" meta={<><LStrong>Last updated:</LStrong> May 21, 2026</>}>
      <LP><LStrong>Translation note:</LStrong> This English version is provided for convenience. The binding contract is governed by German law; in case of conflict, the German version (AGB) prevails.</LP>

      <LH2>§ 1 Scope</LH2>
      <LP>(1) These Terms of Service (hereinafter "Terms") govern all contracts between Worqshop IO UG (haftungsbeschränkt), In den Alboingärten 17, 12103 Berlin, Germany (hereinafter "Provider"), and its customers regarding the use of the online service Syn, available at asksyn.com (hereinafter "Syn" or "Service").</LP>
      <LP>(2) Deviating customer terms are not recognised unless the Provider expressly agrees to their validity in writing.</LP>
      <LP>(3) Syn is directed at entrepreneurs within the meaning of § 14 BGB (German Civil Code) and at consumers within the meaning of § 13 BGB. Where provisions apply exclusively to one of these groups, this is indicated.</LP>

      <LH2>§ 2 Subject matter</LH2>
      <LP>(1) Syn is a Software-as-a-Service that lets users generate synthetic focus-group discussions. The Service uses AI models to generate personas, moderate discussions, and produce reports.</LP>
      <LP>(2) The specific scope of services depends on the chosen subscription plan. A current plan overview is available at asksyn.com/#pricing.</LP>
      <LP>(3) The Provider is entitled to further develop the feature set as long as the contractual core remains intact.</LP>

      <LH2>§ 3 Conclusion of contract</LH2>
      <LP>(1) The presentation of Syn on the website is not a binding offer but an invitation to make an offer.</LP>
      <LP>(2) By selecting a plan and confirming at checkout, you submit a binding offer to enter into a subscription contract. The contract is concluded upon confirmation by the Provider (usually by e-mail).</LP>
      <LP>(3) Conclusion of the contract requires the creation of a user account.</LP>

      <LH2>§ 4 Prices and payment</LH2>
      <LP>(1) The prices displayed on the website at the time of contract conclusion apply, plus statutory VAT.</LP>
      <LP>(2) Billing is monthly in advance via automatic direct debit through the payment provider Chargebee.</LP>
      <LP>(3) In case of payment default, the Provider is entitled to temporarily suspend access to Syn.</LP>

      <LH2>§ 4a Session quota and top-ups</LH2>
      <LP>(1) Each subscription includes a fixed monthly quota of sessions, shown in the plan overview at asksyn.com/#pricing.</LP>
      <LP>(2) A session is considered consumed as soon as the first message in that session has been sent ("started session"). Deletion after start does not refund the consumed slot.</LP>
      <LP>(3) Sessions created but not yet started count as a reserved slot. If deleted before the first message is sent, the slot is released.</LP>
      <LP>(4) <LStrong>Monthly included quota.</LStrong> The monthly quota included in the chosen plan is non-transferable and expires at the end of the respective billing period. At the start of the next period the full included quota is credited again.</LP>
      <LP>(5) <LStrong>Purchased extra sessions.</LStrong> Within a billing period, additional sessions can be purchased at the prices stated in the plan overview. Purchased sessions are valid for <LStrong>12 months</LStrong> from the purchase date. They do not expire at the end of the billing period.</LP>
      <LP>(6) <LStrong>Consumption order.</LStrong> When a new session is started, the monthly included quota is consumed first. Only once that quota is exhausted for the current month are purchased extra sessions drawn down (always the credit with the earliest expiry first).</LP>
      <LP>(7) <LStrong>Availability after contract end.</LStrong> After cancellation or pause of the subscription, already purchased and unused extra sessions remain usable within the 12-month period. A cash refund is excluded.</LP>

      <LH2>§ 5 Term and termination</LH2>
      <LP>(1) The subscription contract is automatically renewed for the booked period (usually one month) unless cancelled with 14 days' notice before the end of the current billing period.</LP>
      <LP>(2) Cancellation can be declared via the account settings or by e-mail to <LA href="mailto:tech@worqshop.io">tech@worqshop.io</LA>.</LP>
      <LP>(3) The right to extraordinary termination for cause remains unaffected.</LP>

      <LH2>§ 6 Right of withdrawal for consumers</LH2>
      <LP>(1) Consumers generally have a 14-day right of withdrawal (§ 355 BGB).</LP>
      <LP>(2) The right of withdrawal expires if the Provider has begun executing the contract before the end of the withdrawal period at the consumer's express request, and the consumer has confirmed awareness that the right of withdrawal expires upon commencement of contract execution (§ 356 (5) BGB).</LP>
      <LP><LStrong>Note:</LStrong> The specific withdrawal instruction must be drafted by counsel — the statutory template is binding.</LP>

      <LH2>§ 7 Usage rights</LH2>
      <LP>(1) The Provider grants the customer a simple, non-transferable, non-exclusive right to use Syn within the contractually agreed scope for the term of the contract.</LP>
      <LP>(2) Content uploaded or generated by the customer in Syn (briefings, personas, discussions, reports) remains the customer's property. The Provider receives a simple usage right solely for the purpose of providing the Service.</LP>
      <LP>(3) The Provider does not use customer content to train its own or third-party AI models.</LP>

      <LH2>§ 8 User obligations</LH2>
      <LP>(1) You undertake not to use Syn to generate unlawful, defamatory, discriminatory content or content that violates third-party personality rights.</LP>
      <LP>(2) You undertake to keep your access credentials confidential and not to share them with third parties.</LP>
      <LP>(3) In case of breach of these obligations, the Provider is entitled to temporarily suspend the account or to terminate the contract for cause.</LP>

      <LH2>§ 9 Availability</LH2>
      <LP>(1) The Provider strives for the highest possible availability of Syn but does not guarantee uninterrupted accessibility. Short outages due to maintenance, updates, or force majeure are not a defect of the Service.</LP>
      <LP>(2) Planned maintenance windows will be announced in advance where possible.</LP>

      <LH2>§ 10 Liability</LH2>
      <LP>(1) The Provider is liable without limitation for intent and gross negligence, and for damages from injury to life, body, or health.</LP>
      <LP>(2) For slight negligence, the Provider is liable only for the breach of essential contractual obligations (cardinal duties), and only up to the amount of foreseeable damage typical for this type of contract.</LP>
      <LP>(3) Liability for content generated by AI models is excluded to the extent permitted by law. AI outputs are to be understood as suggestions and prompts, not as binding recommendations.</LP>
      <LP><LStrong>Note:</LStrong> Liability exclusions are legally sensitive — have them reviewed by counsel.</LP>

      <LH2>§ 11 Data protection</LH2>
      <LP>Information on the processing of personal data can be found in the <LA href="/datenschutz">Privacy Policy</LA>.</LP>

      <LH2>§ 12 Final provisions</LH2>
      <LP>(1) The law of the Federal Republic of Germany applies to the exclusion of the UN Convention on Contracts for the International Sale of Goods.</LP>
      <LP>(2) The exclusive place of jurisdiction for all disputes arising from this contract is Berlin, provided the customer is a merchant, a legal entity under public law, or special funds under public law.</LP>
      <LP>(3) Should any provision of these Terms be or become invalid, the validity of the remaining provisions remains unaffected.</LP>
      <LP>(4) The Provider reserves the right to amend these Terms with effect for the future. Customers will be informed of changes in good time by e-mail.</LP>
    </LegalShell>
  );
}
