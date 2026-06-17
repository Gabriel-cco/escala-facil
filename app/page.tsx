import Link from 'next/link'

const atalhos = [
  { href: '/eventos', titulo: 'Eventos', descricao: 'Criar eventos e montar as escalas' },
  { href: '/membros', titulo: 'Membros', descricao: 'Cadastrar e gerir os participantes' },
  { href: '/grupos', titulo: 'Grupos', descricao: 'Coroinhas, música, ministros, leitores' },
  { href: '/funcoes', titulo: 'Funções', descricao: 'Os papéis dentro de cada grupo' },
]

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-paroquia-marrom mb-2">
          Escala Fácil
        </h1>
        <p className="text-gray-600">
          Gestão de escalas — Paróquia Santa Terezinha
        </p>
      </div>

      <div className="bg-paroquia-creme rounded-xl p-6 mb-10 text-center">
        <p className="text-paroquia-marrom">
          Organize as escalas de serviço dos grupos da paróquia em um só lugar.
          Comece criando um evento e atribuindo os membros às funções.
        </p>
        <Link
          href="/eventos"
          className="inline-block mt-4 bg-paroquia-vinho text-white rounded-lg px-6 py-2 hover:opacity-90 transition-opacity"
        >
          Ir para os eventos
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {atalhos.map((atalho) => (
          <Link
            key={atalho.href}
            href={atalho.href}
            className="border border-gray-200 rounded-lg p-5 hover:border-paroquia-marrom transition-colors"
          >
            <p className="font-medium text-paroquia-marrom">{atalho.titulo}</p>
            <p className="text-sm text-gray-500 mt-1">{atalho.descricao}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}