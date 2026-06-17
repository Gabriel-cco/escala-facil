import { supabase } from '@/lib/supabase'
import NovaFuncaoForm from './NovaFuncaoForm'

export default async function FuncoesPage() {
    // Busca as funções já com o nome do grupo associado
    const { data: funcoes, error } = await supabase
        .from('roles')
        .select('*, groups(nome)')
        .order('nome', { ascending: true })

    // Busca os grupos para o seletor do formulário
    const { data: grupos } = await supabase
        .from('groups')
        .select('id, nome')
        .order('nome', { ascending: true })

    return (
        <main className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Funções</h1>

            <NovaFuncaoForm grupos={grupos ?? []} />

            {error && <p className="text-red-600">Erro: {error.message}</p>}

            {funcoes && funcoes.length === 0 && (
                <p className="text-gray-500">Nenhuma função cadastrada ainda.</p>
            )}

            <ul className="space-y-3">
                {funcoes?.map((funcao) => (
                    <li key={funcao.id} className="border border-gray-200 rounded-lg p-4">
                        <p className="font-medium">{funcao.nome}</p>
                        <p className="text-sm text-gray-500">
                            {funcao.groups?.nome ?? 'Sem grupo'}
                        </p>
                    </li>
                ))}
            </ul>
        </main>
    )
}