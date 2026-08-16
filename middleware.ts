import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    /*
     * Exclui do middleware tudo que não é rota de app:
     * - Internals do Next.js (_next/static, _next/image, _next/webpack-hmr)
     * - Assets estáticos por extensão (imagens, fontes, áudio, pdf, etc.)
     * - Arquivos PWA (sw.js, manifest.webmanifest)
     * - Rotas de metadata geradas pelo Next.js (apple-icon, icon, opengraph-image, sitemap, robots)
     * - Ícones PWA customizados (/pwa-icons/...)
     */
    matcher: [
        '/((?!_next/static|_next/image|_next/webpack-hmr|favicon\\.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|pwa-icons|apple-icon|icon|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|woff2?|ttf|otf|eot|mp4|mp3|pdf|css|map)$).*)',
    ],
}
