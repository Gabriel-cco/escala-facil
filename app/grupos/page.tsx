import { createClient } from '@/lib/supabase/server'
import NovoGrupoForm from './NovoGrupoForm'

export default async function GruposPage() {
    const supabase = await createClient()

    const { data: grupos, error } = await supabase
        .from('groups')
        .select('*')
        .order('nome', { ascending: true })

    return (
        <main className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Grupos</h1>

            <NovoGrupoForm />

            {error && <p className="text-red-600">Erro: {error.message}</p>}

            {grupos && grupos.length === 0 && (
                <p className="text-gray-500">Nenhum grupo cadastrado ainda.</p>
            )}

            <ul className="space-y-3">
                {grupos?.map((grupo) => (
                    <li key={grupo.id} className="border border-gray-200 rounded-lg p-4">
                        <p className="font-medium">{grupo.nome}</p>
                        {grupo.descricao && (
                            <p className="text-sm text-gray-500">{grupo.descricao}</p>
                        )}
                    </li>
                ))}
            </ul>
        </main>
    )
}