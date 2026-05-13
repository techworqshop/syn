export default function AdminError({ where, error }: { where: string; error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <div className="relative rounded-2xl bg-[#F3EFE2] border border-red-700/40 overflow-hidden shadow-sm pl-4 p-5">
        <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: "linear-gradient(180deg, #BE123C, #7F1D1D)" }} />
        <div className="text-xs uppercase tracking-wide text-red-800 font-bold mb-1">Fehler beim Laden — {where}</div>
        <div className="text-sm text-stone-900 font-medium mb-3">{msg}</div>
        {stack && (
          <details className="text-xs">
            <summary className="cursor-pointer text-stone-700 hover:text-stone-900">Stack-Trace</summary>
            <pre className="mt-2 p-3 rounded-lg bg-stone-900 text-stone-100 overflow-auto whitespace-pre-wrap text-[11px]">{stack}</pre>
          </details>
        )}
        <div className="text-xs text-stone-600 mt-3">
          Der Stack wurde auch in die Server-Logs geschrieben (<code>docker logs synweb-app</code>).
        </div>
      </div>
    </div>
  );
}
