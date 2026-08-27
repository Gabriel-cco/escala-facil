import { createClient } from "@/lib/supabase/server";
import EscalaPublica from "./EscalaPublica";

export const metadata = {
  title: "Escala — Escala Fácil",
};

type Assignment = { role_name: string; member_name: string };
type EventoPublico = {
  event_id: string;
  event_name: string;
  date: string;
  time: string;
  liturgical_name: string | null;
  liturgical_color: string | null;
  assignments: Assignment[] | null;
};
type Schedule = {
  group_name: string | null;
  events: EventoPublico[];
};

function LinkInvalido() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <div className="font-serif text-[22px] font-semibold text-ink">
        Link inválido ou expirado
      </div>
      <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-muted">
        Não encontramos uma escala para este link. Verifique se ele foi copiado
        por completo ou peça um novo ao coordenador do grupo.
      </p>
    </main>
  );
}

export default async function EscalaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { token } = await params;
  const { mes } = await searchParams;

  // Mês selecionado (default: mês atual).
  let ano: number, mesNum: number;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    [ano, mesNum] = mes.split("-").map(Number);
  } else {
    const now = new Date();
    ano = now.getFullYear();
    mesNum = now.getMonth() + 1;
  }

  const supabase = await createClient();
  const [{ data, error }, { data: linkRow }] = await Promise.all([
    supabase.rpc("get_public_schedule", { p_token: token, p_year: ano, p_month: mesNum }),
    supabase.from("group_public_links").select("group_id").eq("token", token).maybeSingle(),
  ]);

  if (error) return <LinkInvalido />;

  const schedule = data as Schedule | null;

  // Token inválido / grupo inativo → group_name vem nulo.
  if (!schedule || !schedule.group_name) return <LinkInvalido />;

  return (
    <EscalaPublica
      token={token}
      groupName={schedule.group_name}
      groupId={(linkRow as { group_id: string } | null)?.group_id ?? null}
      eventos={schedule.events ?? []}
      ano={ano}
      mesNum={mesNum}
    />
  );
}
