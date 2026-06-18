import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BotaoSair from './BotaoSair'

const itens = [
    { href: '/', label: 'Início' },
    { href: '/eventos', label: 'Eventos' },
    { href: '/membros', label: 'Membros' },
    { href: '/grupos', label: 'Grupos' },
    { href: '/funcoes', label: 'Funções' },
]

export default async function Menu() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Sem usuário (ex: na tela de login), não mostra o menu
    if (!user) return null

    return (
        <header className="bg-paroquia-marrom text-white border-b-4 border-paroquia-dourado">
            <nav className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-6">
                <span className="font-semibold text-paroquia-dourado">
                    Escala Fácil
                </span>
                <div className="flex gap-4 text-sm">
                    {itens.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="text-white/90 hover:text-paroquia-dourado transition-colors"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
                <div className="ml-auto flex items-center gap-4 text-sm">
                    <span className="text-white/70 hidden sm:inline">{user.email}</span>
                    <BotaoSair />
                </div>
            </nav>
        </header>
    )
}