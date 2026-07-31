import LegalShell, { LH2, LH3, LP, LStrong, LA, LUl, LLi, LNotice } from "@/components/legal/LegalShell";
import { getLocaleFromCookies } from "@/lib/i18n";
import ConsentLink from "@/components/ConsentLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Datenschutzerklärung / Privacy Policy" };

export default async function DatenschutzPage() {
  const locale = await getLocaleFromCookies();
  if (locale === "en") return <EnPrivacy />;
  return <DeDatenschutz />;
}

function DeDatenschutz() {
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

      <LH2>4. Cookies &amp; Web-Analyse</LH2>
      <LP>Technisch notwendige Cookies setzen wir zur Aufrechterhaltung der Login-Session. Optionale Cookies (Analyse, Marketing) werden nur nach deiner Einwilligung gesetzt. Du kannst deine Einwilligung jederzeit über den Link &bdquo;Datenschutz-Einstellungen&ldquo; im Footer widerrufen.</LP>
      <LP><ConsentLink label="Datenschutz-Einstellungen öffnen" className="underline hover:text-rose-700 transition-colors" /></LP>

      <LH3>etracker</LH3>
      <LP>Wir nutzen den Dienst JustRelate etracker (<LA href="https://www.etracker.com">www.etracker.com</LA>) zur Analyse von Nutzungsdaten. Das Modul etracker consent manager dient dem Einwilligungs-Management. Über das Modul etracker tag manager können Scriptcodes anderer Tools eingebunden werden. In Kombination ermöglichen der etracker tag manager und consent manager bei entsprechender Einwilligung das Aussteuern bestimmter Cookies und Dienste. Auch bei Ablehnung von statistischen Cookies werden in Übereinstimmung mit den rechtlichen Anforderungen der EU-Datenschutzgrundverordnung (EU-DSGVO) und dem Telekommunikation-Digitale-Dienste-Datenschutzgesetz (TDDDG) Nutzungsdaten erfasst.</LP>
      <LP>Die Datenverarbeitung erfolgt auf Basis der gesetzlichen Bestimmungen des Art. 6 Abs. 1 lit. f (berechtigtes Interesse) der EU-DSGVO. Unser Anliegen im Sinne der EU-DSGVO (berechtigtes Interesse) ist die Optimierung unseres Online-Angebotes sowie einer rechtskonformen Einbindung und Verwaltung weiterer Dienste auf unserer Website. Sofern eine entsprechende Einwilligung gegeben wurde, erfolgt die Ausspielung anderer Technologien auf Grundlage von Art. 6 Abs. 1 lit. a der EU-DSGVO. Die Einwilligung ist jederzeit widerrufbar.</LP>
      <LP>Die mit etracker erzeugten Web-Analyse-Daten werden im Auftrag des Anbieters dieser Website von JustRelate ausschließlich in Deutschland verarbeitet und gespeichert und unterliegen damit den strengen deutschen und europäischen Datenschutzgesetzen und -standards. etracker wurde diesbezüglich unabhängig geprüft, zertifiziert und mit dem Datenschutz-Gütesiegel <LA href="https://etracker.com/eprivacy">ePrivacyseal</LA> ausgezeichnet. Da uns die Privatsphäre unserer Besucher wichtig ist, werden die Daten, die möglicherweise einen Bezug zu einer einzelnen Person zulassen, wie die IP-Adresse, Anmelde- oder Gerätekennungen, frühestmöglich anonymisiert oder pseudonymisiert. Eine andere Verwendung, Zusammenführung mit anderen Daten oder eine Weitergabe an Dritte erfolgt nicht.</LP>
      <LP>Du kannst der vorbeschriebenen Datenverarbeitung jederzeit durch Klick auf den Schieberegler widersprechen. Der Widerspruch hat keine nachteiligen Folgen. Wird kein Schieberegler angezeigt, ist die Datenerfassung bereits durch andere Blockier-Maßnahmen unterbunden.</LP>
      <LP><a href="#" data-tld="asksyn.com" id="et-opt-out"></a></LP>
      <LP>Weitere Informationen zum Datenschutz bei JustRelate etracker findest du <LA href="https://www.etracker.com/datenschutz/">hier</LA>.</LP>

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
        <LLi>JustRelate Group GmbH (etracker) — Web-Analyse und Consent-Management (Deutschland)</LLi>
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

function EnPrivacy() {
  return (
    <LegalShell title="Privacy Policy" meta={<><LStrong>Last updated:</LStrong> May 17, 2026</>}>
      <LNotice>
        <LStrong>Important transparency note:</LStrong> We use external service providers to operate Syn. The required Data Processing Agreements (Art. 28 GDPR) are still partly in preparation. Until they are concluded, we minimise data, restrict access, and enable only necessary features.
      </LNotice>

      <LH2>1. Controller</LH2>
      <LP>Controller under the GDPR:</LP>
      <LP>
        <LStrong>Worqshop IO UG (haftungsbeschränkt)</LStrong><br />
        In den Alboingärten 17, 12103 Berlin, Germany<br />
        E-mail: <LA href="mailto:tech@worqshop.io">tech@worqshop.io</LA><br />
        Phone: +49 160 1517018
      </LP>
      <LP>Data Protection Officer: not appointed. Based on current assessment, there is no statutory obligation to appoint one (Art. 37 GDPR). We review this regularly.</LP>

      <LH2>2. Legal bases</LH2>
      <LP>Legal bases for processing:</LP>
      <LUl>
        <LLi>Art. 6 (1)(b) GDPR (contract / pre-contract)</LLi>
        <LLi>Art. 6 (1)(f) GDPR (legitimate interests: operation, security, communication)</LLi>
        <LLi>Art. 6 (1)(a) GDPR (consent, where used optionally)</LLi>
      </LUl>

      <LH2>3. Hosting & server log files</LH2>
      <LP><LStrong>Hosting:</LStrong> Syn runs on a server of Hetzner Online GmbH (Industriestraße 25, 91710 Gunzenhausen, Germany). Domain and DNS are managed via united-domains.</LP>
      <LP>When accessing Syn, technically necessary data is processed: IP address, date and time, URL, referrer, user agent, HTTP status.</LP>
      <LP>
        <LStrong>Purpose:</LStrong> delivery, stability, IT security, abuse detection.<br />
        <LStrong>Legal basis:</LStrong> Art. 6 (1)(f) GDPR.<br />
        <LStrong>Retention:</LStrong> 7–14 days, then deletion or anonymisation.<br />
        <LStrong>Third-country transfer:</LStrong> no third-country transfer for hosting itself (Hetzner data centre in Germany).
      </LP>

      <LH3>Web fonts (Google Fonts)</LH3>
      <LP>Syn uses Google Fonts by Google Ireland Limited for consistent typography. When fonts are loaded externally, your IP address may be transmitted to Google servers in the USA.</LP>
      <LP>
        <LStrong>Legal basis:</LStrong> Art. 6 (1)(f) GDPR (legitimate interest in consistent design).<br />
        <LStrong>Recipient / third country:</LStrong> Google Ireland Ltd. / Google LLC (USA), safeguarded via EU Standard Contractual Clauses (SCCs).
      </LP>

      <LH2>4. Cookies &amp; web analytics</LH2>
      <LP>We use technically necessary cookies to maintain the login session. Optional cookies (analytics, marketing) are only set after your consent. You can withdraw your consent at any time via the &bdquo;Privacy settings&ldquo; link in the footer.</LP>
      <LP><ConsentLink label="Open privacy settings" className="underline hover:text-rose-700 transition-colors" /></LP>

      <LH3>etracker</LH3>
      <LP>We use the service JustRelate etracker (<LA href="https://www.etracker.com">www.etracker.com</LA>) to analyse usage data. The etracker consent manager module handles consent management. The etracker tag manager module allows script codes of other tools to be embedded. Combined, the etracker tag manager and consent manager allow certain cookies and services to be controlled based on the corresponding consent. Even if statistical cookies are declined, usage data is collected in accordance with the legal requirements of the EU General Data Protection Regulation (GDPR) and the German Telecommunications Digital Services Data Protection Act (TDDDG).</LP>
      <LP>Data processing is based on Art. 6 (1) (f) GDPR (legitimate interest). Our legitimate interest is the optimisation of our online offering as well as the legally compliant integration and management of further services on our website. Where corresponding consent has been given, other technologies are delivered on the basis of Art. 6 (1) (a) GDPR. Consent can be withdrawn at any time.</LP>
      <LP>The web analytics data generated with etracker is processed and stored on behalf of the provider of this website by JustRelate exclusively in Germany and is therefore subject to strict German and European data protection laws and standards. etracker has been independently audited and certified in this respect and awarded the <LA href="https://etracker.com/eprivacy">ePrivacyseal</LA> data protection seal of approval. Because the privacy of our visitors matters to us, data that could potentially allow a reference to an individual person — such as the IP address, login or device identifiers — is anonymised or pseudonymised at the earliest possible stage. No other use, combination with other data or transfer to third parties takes place.</LP>
      <LP>You can object to the data processing described above at any time by clicking the slider. There are no adverse consequences to objecting. If no slider is displayed, data collection is already prevented by other blocking measures.</LP>
      <LP><a href="#" data-tld="asksyn.com" id="et-opt-out"></a></LP>
      <LP>You can find further information on data protection at JustRelate etracker <LA href="https://www.etracker.com/datenschutz/">here</LA>.</LP>

      <LH2>5. Account data</LH2>
      <LP>Upon registration we process your e-mail address and a password you choose (in hashed form, never in plain text).</LP>
      <LP>
        <LStrong>Purpose:</LStrong> providing your account, sign-in, communication about your account.<br />
        <LStrong>Legal basis:</LStrong> Art. 6 (1)(b) GDPR (contract).<br />
        <LStrong>Retention:</LStrong> for the duration of your subscription or until account deletion.
      </LP>

      <LH2>6. Usage data (briefings, sessions, reports)</LH2>
      <LP>When you use Syn, you upload content (briefings, documents, screenshots) and generate content (persona discussions, reports). This content is stored in your account and accessible only to you.</LP>
      <LP><LStrong>Important:</LStrong> We use your content solely for providing the Service. We do not train our own or third-party AI models with your content and do not pass it on to third parties for training purposes.</LP>
      <LP>
        <LStrong>Legal basis:</LStrong> Art. 6 (1)(b) GDPR.<br />
        <LStrong>Retention:</LStrong> until deleted by you or until account deletion.
      </LP>

      <LH2>7. AI-assisted processing</LH2>
      <LP>To generate persona discussions and reports, your briefings and other content are transmitted to external AI providers:</LP>
      <LUl>
        <LLi><LStrong>Anthropic PBC</LStrong> (San Francisco, USA) — used for persona generation, discussion moderation, and synthesis (Claude models).</LLi>
        <LLi><LStrong>Google LLC</LStrong> (Mountain View, USA) — used for vision analysis of screenshots and PDFs (Gemini models).</LLi>
      </LUl>
      <LP>
        <LStrong>Legal basis:</LStrong> Art. 6 (1)(b) GDPR (provision of the Service).<br />
        <LStrong>Third country:</LStrong> USA, safeguarded via EU Standard Contractual Clauses (SCCs).<br />
        <LStrong>Note on data processing by these providers:</LStrong> Both providers contractually commit, in their commercial terms, not to use transmitted content for model training. DPAs are being concluded with both providers.
      </LP>

      <LH2>8. Payment processing</LH2>
      <LP>For processing payments (subscription fees) we use <LStrong>Chargebee Inc.</LStrong> (San Francisco, USA / Walldorf, Germany). At checkout you are redirected to the Chargebee interface where you enter your payment details. We do not store credit-card or bank-account data ourselves.</LP>
      <LP>
        <LStrong>Legal basis:</LStrong> Art. 6 (1)(b) GDPR.<br />
        <LStrong>Third country:</LStrong> USA, safeguarded via SCCs.<br />
        <LStrong>Retention:</LStrong> statutory retention obligations (typically 10 years for invoice data).
      </LP>

      <LH2>9. E-mail delivery</LH2>
      <LP>For sending transactional e-mails (account confirmation, password reset, payment confirmations) we use the Gmail service of Google Ireland Limited.</LP>
      <LP>
        <LStrong>Legal basis:</LStrong> Art. 6 (1)(b) GDPR.<br />
        <LStrong>Retention:</LStrong> for the duration of processing; older logs are regularly anonymised or deleted.
      </LP>

      <LH2>10. Recipients / processors (overview)</LH2>
      <LP>To provide Syn, we use the following service providers:</LP>
      <LUl>
        <LLi>Hetzner Online GmbH — hosting (Germany)</LLi>
        <LLi>united-domains AG — domain and DNS (Germany)</LLi>
        <LLi>Anthropic PBC — AI reasoning (USA, SCCs)</LLi>
        <LLi>Google LLC — AI vision, e-mail delivery (USA, SCCs)</LLi>
        <LLi>Chargebee Inc. — payment processing (USA / EU, SCCs)</LLi>
        <LLi>JustRelate Group GmbH (etracker) — web analytics and consent management (Germany)</LLi>
      </LUl>
      <LP>Data Processing Agreements (Art. 28 GDPR) are being concluded with all providers; the process is in some cases still in progress.</LP>

      <LH2>11. Retention</LH2>
      <LP>Personal data is processed only as long as necessary for the respective purpose. Once the purpose is fulfilled or statutory retention periods (e.g. HGB, AO) expire, the data is deleted or anonymised.</LP>
      <LP><LStrong>Legal basis:</LStrong> Art. 6 (1)(c) GDPR (statutory retention) and Art. 6 (1)(f) GDPR.</LP>

      <LH2>12. Your rights</LH2>
      <LP>Under Art. 15 to 22 GDPR you have the following rights:</LP>
      <LUl>
        <LLi>Access to your stored data (Art. 15 GDPR)</LLi>
        <LLi>Rectification of inaccurate data (Art. 16 GDPR)</LLi>
        <LLi>Erasure ("right to be forgotten", Art. 17 GDPR)</LLi>
        <LLi>Restriction of processing (Art. 18 GDPR)</LLi>
        <LLi>Data portability (Art. 20 GDPR)</LLi>
        <LLi>Objection to processing under Art. 6 (1)(e) or (f) GDPR</LLi>
      </LUl>
      <LP>You may withdraw consent at any time with effect for the future (Art. 7 (3) GDPR). You also have the right to lodge a complaint with a supervisory authority, in particular the Berlin Commissioner for Data Protection and Freedom of Information.</LP>

      <LH2>13. Security & updates</LH2>
      <LP>We take appropriate technical and organisational measures (TOMs) under Art. 32 GDPR to protect your data against loss, misuse, and unauthorised access. This policy is reviewed regularly and updated where needed. The current version is always available here.</LP>
    </LegalShell>
  );
}
