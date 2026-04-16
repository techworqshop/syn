export default function DashboardPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold mb-4">Willkommen bei SynWeb</h1>
      <p className="text-neutral-400">
        Phase 1 deployed. Login funktioniert, Session-Management steht.
        Nächste Phase: Panel-Erstellung, Personas, Runden — ueber die n8n Webhooks.
      </p>
      <div className="mt-8 p-4 rounded border border-neutral-800 bg-neutral-900/50 text-sm text-neutral-400">
        <div className="font-mono text-neutral-200 mb-2">Status</div>
        <ul className="space-y-1">
          <li>✓ Auth (Credentials)</li>
          <li>✓ Postgres + Redis isoliert</li>
          <li>… n8n Web-Workflows (geplant)</li>
          <li>… Chat-UI mit Persona-Sidebars (geplant)</li>
        </ul>
      </div>
    </div>
  );
}
