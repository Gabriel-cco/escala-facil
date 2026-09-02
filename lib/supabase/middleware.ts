import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Lê o usuário atual a partir dos cookies
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Rotas públicas (não exigem login)
    const rotasPublicas = ['/login', '/auth', '/escala', '/frequencia/avulsa', '/api/frequencia/avulsa', '/api/cron']
    const ehRotaPublica = rotasPublicas.some((rota) =>
        request.nextUrl.pathname.startsWith(rota)
    )

    // Se não está logado e a rota não é pública → manda para o login
    if (!user && !ehRotaPublica) {
        // Código OAuth pode cair na raiz (/?code=...) dependendo da config do Supabase.
        // Redireciona para o callback handler que troca o código pela sessão.
        const code = request.nextUrl.searchParams.get('code')
        if (code) {
            const url = request.nextUrl.clone()
            url.pathname = '/auth/callback'
            return NextResponse.redirect(url)
        }
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Proteção de rotas por perfil (lê cookie ef_profile — gravado no callback)
    if (user) {
        const perfil = request.cookies.get('ef_profile')?.value
        const pathname = request.nextUrl.pathname

        // member: só pode acessar /minha-escala e rotas de sistema
        if (perfil === 'member') {
            const rotasMember = ['/minha-escala', '/notificacoes', '/trocas', '/perfil', '/api/swap-requests', '/auth', '/acesso-pendente', '/login', '/selecionar-grupo', '/escala']
            const ehRotaMember = rotasMember.some(r => pathname === r || pathname.startsWith(r + '/'))
            if (!ehRotaMember) {
                const url = request.nextUrl.clone()
                url.pathname = '/minha-escala'
                return comCookies(NextResponse.redirect(url), supabaseResponse)
            }
        }
    }

    return supabaseResponse
}

/**
 * Copia os cookies de `origem` para `destino` (redirect). Necessário para
 * preservar tokens de sessão recém-renovados quando o middleware precisa
 * redirecionar: sem isso, o Supabase renova o access token em `supabaseResponse`
 * mas a resposta devolvida é outro NextResponse, e o browser nunca recebe os
 * cookies atualizados — a próxima requisição usa o refresh token já "queimado"
 * (rotating refresh tokens) e perde a sessão.
 */
function comCookies(destino: NextResponse, origem: NextResponse): NextResponse {
    origem.cookies.getAll().forEach(({ name, value, ...opts }) =>
        destino.cookies.set(name, value, opts)
    )
    return destino
}