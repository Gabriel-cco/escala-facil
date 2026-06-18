import { createClient } from '@/lib/supabase/server'
import NovoMembroForm from './NovoMembroForm'
import MembroItem from './MembroItem'

export default async function MembrosPage() {
    const supabase = await createClient()

    const { data: membros, error } = await supabase
        .from('members')
        .select('*, groups(nome)')
        .order('nome', { ascending: true })

    const { data: grupos } = await supabase
        .from('groups')
        .select('id, nome')
        .order('nome', { ascending: true })

    return (
        <main className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Membros</h1>

            <NovoMembroForm grupos={grupos ?? []} />

            {error && <p className="text-red-600">Erro: {error.message}</p>}

            {membros && membros.length === 0 && (
                <p className="text-gray-500">Nenhum membro cadastrado ainda.</p>
            )}

            <ul className="space-y-3">
                {membros?.map((membro) => (
                    <MembroItem key={membro.id} membro={membro} />
                ))}
            </ul>
        </main>
    )
}