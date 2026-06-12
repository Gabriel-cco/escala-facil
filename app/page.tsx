import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: members, error } = await supabase
    .from('members')
    .select('*')

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste de Conexão Supabase</h1>

      {error && (
        <p className="text-red-600">Erro: {error.message}</p>
      )}

      {members && members.length === 0 && (
        <p className="text-gray-500">Conectou, mas não há membros ainda.</p>
      )}

      <ul className="list-disc pl-6">
        {members?.map((m) => (
          <li key={m.id}>{m.nome} — {m.telefone}</li>
        ))}
      </ul>
    </main>
  )
}