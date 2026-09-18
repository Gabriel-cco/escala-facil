import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/current-user";
import { gerarRascunho } from "@/lib/auto-escala";

export async function POST(request: Request) {
  const conta = await getCurrentAccount();
  if (!conta || conta.profile === "member") {
    return Response.json({ error: "Sem permissão." }, { status: 403 });
  }

  try {
    const { groupId, eventIds } = await request.json();
    if (!groupId || !Array.isArray(eventIds) || eventIds.length === 0) {
      return Response.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const supabase = await createClient();
    const propostas = await gerarRascunho(supabase, groupId, eventIds);
    return Response.json({ propostas });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
