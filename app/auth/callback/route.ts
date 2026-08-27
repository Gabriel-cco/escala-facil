import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLiturgicalMonth } from "@/lib/liturgical";

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

  const destino =
    account.profile === "admin"
      ? `${origin}/selecionar-grupo`
      : account.profile === "member"
      ? `${origin}/minha-escala`
      : `${origin}${next}`;

  // Aquece o cache do calendário litúrgico (Romcal calcula o ano inteiro e
  // guarda em memória — ver lib/liturgical.ts) pra quando o coordenador abrir
  // "Gerar mês" ou criar um evento, o cálculo já estar pronto. `after()` roda
  // isso depois da resposta ser enviada — não atrasa o login — mas ainda
  // mantém a function viva até terminar (void + fire-and-forget comum não
  // teria essa garantia em runtime serverless). Falha aqui é só uma
  // otimização perdida, nunca um erro de autenticação.
  after(async () => {
    const anoAtual = new Date().getFullYear();
    try {
      await getLiturgicalMonth(anoAtual, 1);
      // Dezembro: "gerar mês" já sugere o próximo mês por padrão, que cai no
      // ano seguinte — aquece esse ano também.
      if (new Date().getMonth() === 11) {
        await getLiturgicalMonth(anoAtual + 1, 1);
      }
    } catch {
      // Só otimização — sem impacto no login se falhar.
    }
  });

  // Log de login (fire-and-forget após a sessão já estar estabelecida).
  supabase.from("access_logs").insert({
    account_id: account.account_id,
    action: "login",
    path: "/auth/callback",
  }).then(({ error }) => {
    if (error) console.warn("Falha ao registrar log de login:", error);
  });

  const response = NextResponse.redirect(destino);
  response.cookies.set("ef_profile", account.profile, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
