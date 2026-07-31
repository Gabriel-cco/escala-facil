import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?erro=auth`);
  }

  // O registro em `users` é criado/vinculado automaticamente pelo trigger
  // `on_auth_user_created` no primeiro login. Aqui apenas decidimos o destino.
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.redirect(`${origin}/login?erro=auth`);
  }

  // Usa RPC SECURITY DEFINER para contornar o RLS e buscar o account do usuário.
  const { data: rows } = await supabase.rpc("get_account_by_auth_id", {
    p_auth_id: authUser.id,
  });

  const account = rows?.[0] ?? null;

  if (!account) {
    return NextResponse.redirect(`${origin}/acesso-pendente`);
  }

  if (account.profile === "admin") {
    return NextResponse.redirect(`${origin}/selecionar-grupo`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
