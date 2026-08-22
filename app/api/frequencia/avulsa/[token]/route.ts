import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let nome: string;
  try {
    const body = await req.json();
    nome = (body.nome ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!nome) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: lista, error } = await admin
    .from("attendance_lists")
    .select("id, qr_closed_at")
    .eq("qr_token", token)
    .maybeSingle();

  if (error || !lista) {
    return NextResponse.json({ error: "QR inválido." }, { status: 404 });
  }

  if (lista.qr_closed_at) {
    return NextResponse.json({ error: "Esta lista foi encerrada." }, { status: 410 });
  }

  const { error: insErr } = await admin.from("attendance_records").insert({
    list_id: lista.id,
    account_id: null,
    external_name: nome,
    present: true,
  });

  if (insErr) {
    return NextResponse.json({ error: "Erro ao registrar presença." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
