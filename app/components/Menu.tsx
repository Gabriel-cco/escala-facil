import Link from 'next/link'

const itens = [
    { href: '/', label: 'Início' },
    { href: '/eventos', label: 'Eventos' },
    { href: '/membros', label: 'Membros' },
    { href: '/grupos', label: 'Grupos' },
    { href: '/funcoes', label: 'Funções' },
]

export default function Menu() {
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
            </nav>
        </header>
    )
}