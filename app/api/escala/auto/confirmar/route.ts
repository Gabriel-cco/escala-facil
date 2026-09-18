import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import type { PropostaSlot } from "@/lib/auto-escala";

export async function POST(request: Request) {
  const conta = await getCurrentAccount();
  if (!conta || conta.profile === "member") {
    return Response.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const { propostas } = await request.json() as { propostas: PropostaSlot[] };
    const validas = (propostas ?? []).filter((p) => p.accountId);

    if (validas.length === 0) {
      return Response.json({ ok: true, inserted: 0 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("assignments").insert(
      validas.map((p) => ({
        event_id: p.eventId,
        role_id: p.roleId,
        account_id: p.accountId,
      }))
    );

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, inserted: validas.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
