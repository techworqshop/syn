import LegalShell, { LH2, LP, LStrong, LA } from "@/components/legal/LegalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Allgemeine Geschäftsbedingungen" };

export default function AGBPage() {
  return (
    <LegalShell title="Allgemeine Geschäftsbedingungen" meta={<><LStrong>Stand:</LStrong> 17. Mai 2026</>}>
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
