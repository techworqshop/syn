import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { getSub } from "@/lib/redis";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type P = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const slot = new URL(req.url).searchParams.get("slot");
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return new Response("not found", { status: 404 });
  const channel = slot ? `session:${id}:audience:${slot}` : `session:${id}`;
  const sub = getSub();
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(enc.encode(`: hi\n\n`));
      await sub.subscribe(channel);
      sub.on("message", (_ch, payload) => {
        controller.enqueue(enc.encode(`data: ${payload}\n\n`));
      });
      const keep = setInterval(() => {
        try { controller.enqueue(enc.encode(`: ping\n\n`)); }
        catch { clearInterval(keep); }
      }, 25000);
      (controller as any)._keep = keep;
    },
    async cancel() {
      try { await sub.unsubscribe(channel); } catch {}
      try { await sub.quit(); } catch {}
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
