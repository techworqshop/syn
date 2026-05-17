import LegalShell, { LH2, LH3, LP, LStrong, LA, LUl, LLi, LNotice } from "@/components/legal/LegalShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Datenschutzerklärung" };

export default function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung" meta={<><LStrong>Stand:</LStrong> 17. Mai 2026</>}>
      <LNotice>
        <LStrong>Wichtiger Hinweis (Transparenz):</LStrong> Wir setzen externe Dienstleister zum Betrieb von Syn ein. Die erforderlichen Auftragsverarbeitungsverträge (Art. 28 DSGVO) sind teilweise noch in Vorbereitung. Bis zum Abschluss minimieren wir Daten, beschränken Zugriffe und aktivieren nur notwendige Funktionen.
      </LNotice>

      <LH2>1. Verantwortlicher</LH2>
      <LP>Verantwortlicher im Sinne der DSGVO:</LP>
      <LP>
        <LStrong>Worqshop IO UG (haftungsbeschränkt)</LStrong><br />
        In den Alboingärten 17, 12103 Berlin, Deutschland<br />
        E-Mail: <LA href="mailto:tech@worqshop.io">tech@worqshop.io</LA><br />
        Telefon: +49 160 1517018
      </LP>
      <LP>Datenschutzbeauftragte:r: nicht bestellt. Nach aktueller Einschätzung besteht keine Benennungspflicht (Art. 37 DSGVO). Wir überprüfen dies regelmäßig.</LP>

      <LH2>2. Rechtsgrundlagen</LH2>
      <LP>Rechtsgrundlagen der Datenverarbeitung:</LP>
      <LUl>
        <LLi>Art. 6 Abs. 1 lit. b DSGVO (Vertrag / Anbahnung)</LLi>
        <LLi>Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen: Betrieb, Sicherheit, Kommunikation)</LLi>
        <LLi>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung, falls optional eingesetzt)</LLi>
      </LUl>

      <LH2>3. Hosting & Server-Logfiles</LH2>
      <LP><LStrong>Hosting:</LStrong> Syn wird auf einem Server der Hetzner Online GmbH (Industriestraße 25, 91710 Gunzenhausen, Deutschland) betrieben. Domain und DNS werden über united-domains verwaltet.</LP>
      <LP>Beim Aufruf von Syn werden technisch notwendige Daten verarbeitet: IP-Adresse, Datum und Uhrzeit, URL, Referrer, User-Agent, HTTP-Status.</LP>
      <LP>
        <LStrong>Zweck:</LStrong> Auslieferung, Stabilität, IT-Sicherheit, Missbrauchserkennung.<br />
        <LStrong>Rechtsgrundlage:</LStrong> Art. 6 Abs. 1 lit. f DSGVO.<br />
        <LStrong>Speicherdauer:</LStrong> 7–14 Tage, danach Löschung oder Anonymisierung.<br />
        <LStrong>Drittlandübermittlung:</LStrong> Kein Drittlandtransfer beim Hosting selbst (Hetzner-Rechenzentrum in Deutschland).
      </LP>

      <LH3>Web Fonts (Google Fonts)</LH3>
      <LP>Syn nutzt Google Fonts der Google Ireland Limited zur einheitlichen Darstellung von Schriftarten. Wenn Fonts extern geladen werden, kann dabei deine IP-Adresse an Google-Server in den USA übertragen werden.</LP>
      <LP>
        <LStrong>Rechtsgrundlage:</LStrong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an konsistentem Design).<br />
        <LStrong>Empfänger / Drittland:</LStrong> Google Ireland Ltd. / Google LLC (USA), abgesichert über EU-Standardvertragsklauseln (SCCs).
      </LP>

      <LH2>4. Cookies</LH2>
      <LP>Wir verwenden ausschließlich technisch notwendige Cookies, insbesondere zur Aufrechterhaltung der Login-Session. Optionale Analyse- oder Marketing-Cookies werden derzeit nicht gesetzt.</LP>

      <LH2>5. Account-Daten</LH2>
      <LP>Bei Registrierung verarbeiten wir deine E-Mail-Adresse und ein von dir vergebenes Passwort (in verschlüsselter Form, niemals im Klartext).</LP>
      <LP>
        <LStrong>Zweck:</LStrong> Bereitstellung deines Accounts, Anmeldung, Kommunikation zu deinem Account.<br />
        <LStrong>Rechtsgrundlage:</LStrong> Art. 6 Abs. 1 lit. b DSGVO (Vertrag).<br />
        <LStrong>Speicherdauer:</LStrong> für die Dauer deiner Subscription bzw. bis zur Account-Löschung.
      </LP>

      <LH2>6. Nutzungsdaten (Briefings, Sessions, Berichte)</LH2>
      <LP>Wenn du Syn nutzt, lädst du Inhalte hoch (Briefings, Dokumente, Screenshots) und erzeugst Inhalte (Persona-Diskussionen, Berichte). Diese Inhalte werden in deinem Account gespeichert und sind nur für dich zugänglich.</LP>
      <LP><LStrong>Wichtig:</LStrong> Wir nutzen deine Inhalte ausschließlich für die Bereitstellung des Dienstes. Wir trainieren keine eigenen oder fremden AI-Modelle mit deinen Inhalten und geben sie nicht zu Trainingszwecken an Dritte weiter.</LP>
      <LP>
        <LStrong>Rechtsgrundlage:</LStrong> Art. 6 Abs. 1 lit. b DSGVO.<br />
        <LStrong>Speicherdauer:</LStrong> bis zur Löschung durch dich oder bis zur Account-Löschung.
      </LP>

      <LH2>7. AI-gestützte Verarbeitung</LH2>
      <LP>Zur Erzeugung der Persona-Diskussionen und Berichte werden deine Briefings und weitere Inhalte an externe AI-Anbieter übermittelt:</LP>
      <LUl>
        <LLi><LStrong>Anthropic PBC</LStrong> (San Francisco, USA) — verwendet für die Persona-Generierung, Diskussions-Moderation und Synthese (Claude-Modelle).</LLi>
        <LLi><LStrong>Google LLC</LStrong> (Mountain View, USA) — verwendet für die Vision-Analyse von Screenshots und PDFs (Gemini-Modelle).</LLi>
      </LUl>
      <LP>
        <LStrong>Rechtsgrundlage:</LStrong> Art. 6 Abs. 1 lit. b DSGVO (Erbringung des Dienstes).<br />
        <LStrong>Drittland:</LStrong> USA, abgesichert über EU-Standardvertragsklauseln (SCCs).<br />
        <LStrong>Hinweis zur Datenverarbeitung durch die Anbieter:</LStrong> Beide Anbieter haben in ihren Business-Tarifen vertraglich zugesichert, übermittelte Inhalte nicht für Modelltraining zu verwenden. AVVs werden mit beiden Anbietern abgeschlossen.
      </LP>

      <LH2>8. Zahlungsabwicklung</LH2>
      <LP>Für die Abwicklung von Zahlungen (Subscription-Gebühren) nutzen wir <LStrong>Chargebee Inc.</LStrong> (San Francisco, USA / Walldorf, Deutschland). Beim Checkout wirst du zur Chargebee-Oberfläche weitergeleitet, dort gibst du deine Zahlungsdaten ein. Wir selbst speichern keine Kreditkarten- oder Kontodaten.</LP>
      <LP>
        <LStrong>Rechtsgrundlage:</LStrong> Art. 6 Abs. 1 lit. b DSGVO.<br />
        <LStrong>Drittland:</LStrong> USA, abgesichert über SCCs.<br />
        <LStrong>Speicherdauer:</LStrong> gesetzliche Aufbewahrungspflichten (i.d.R. 10 Jahre für Rechnungsdaten).
      </LP>

      <LH2>9. E-Mail-Versand</LH2>
      <LP>Für den Versand transaktionaler E-Mails (Account-Bestätigung, Passwort-Reset, Zahlungsbestätigungen) nutzen wir den Gmail-Dienst der Google Ireland Limited.</LP>
      <LP>
        <LStrong>Rechtsgrundlage:</LStrong> Art. 6 Abs. 1 lit. b DSGVO.<br />
        <LStrong>Speicherdauer:</LStrong> für die Dauer der Verarbeitung; ältere Logs werden regelmäßig anonymisiert oder gelöscht.
      </LP>

      <LH2>10. Empfänger / Auftragsverarbeiter (Übersicht)</LH2>
      <LP>Zur Bereitstellung von Syn setzen wir folgende Dienstleister ein:</LP>
      <LUl>
        <LLi>Hetzner Online GmbH — Hosting (Deutschland)</LLi>
        <LLi>united-domains AG — Domain und DNS (Deutschland)</LLi>
        <LLi>Anthropic PBC — AI-Reasoning (USA, SCCs)</LLi>
        <LLi>Google LLC — AI-Vision, E-Mail-Versand (USA, SCCs)</LLi>
        <LLi>Chargebee Inc. — Zahlungsabwicklung (USA / EU, SCCs)</LLi>
      </LUl>
      <LP>Mit allen Anbietern werden Auftragsverarbeitungsverträge (Art. 28 DSGVO) abgeschlossen; der Abschluss ist teilweise noch in Bearbeitung.</LP>

      <LH2>11. Speicherdauer</LH2>
      <LP>Personenbezogene Daten werden nur so lange verarbeitet, wie es für den jeweiligen Zweck erforderlich ist. Nach Erfüllung des Zwecks oder Ablauf gesetzlicher Aufbewahrungsfristen (z.B. HGB, AO) werden die Daten gelöscht oder anonymisiert.</LP>
      <LP><LStrong>Rechtsgrundlage:</LStrong> Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Aufbewahrungspflichten) sowie Art. 6 Abs. 1 lit. f DSGVO.</LP>

      <LH2>12. Deine Rechte</LH2>
      <LP>Du hast gemäß Art. 15 bis 22 DSGVO folgende Rechte:</LP>
      <LUl>
        <LLi>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)</LLi>
        <LLi>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</LLi>
        <LLi>Löschung („Recht auf Vergessenwerden", Art. 17 DSGVO)</LLi>
        <LLi>Einschränkung der Verarbeitung (Art. 18 DSGVO)</LLi>
        <LLi>Datenübertragbarkeit (Art. 20 DSGVO)</LLi>
        <LLi>Widerspruch gegen Verarbeitungen nach Art. 6 Abs. 1 lit. e oder f DSGVO</LLi>
      </LUl>
      <LP>Erteilte Einwilligungen kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO). Du hast außerdem das Recht auf Beschwerde bei einer Aufsichtsbehörde, insbesondere bei der Berliner Beauftragten für Datenschutz und Informationsfreiheit.</LP>

      <LH2>13. Sicherheit & Aktualisierung</LH2>
      <LP>Wir treffen geeignete technische und organisatorische Maßnahmen (TOMs) gemäß Art. 32 DSGVO, um deine Daten vor Verlust, Missbrauch und unbefugtem Zugriff zu schützen. Diese Datenschutzerklärung wird regelmäßig überprüft und bei Bedarf aktualisiert. Die jeweils aktuelle Fassung ist hier abrufbar.</LP>
    </LegalShell>
  );
}
