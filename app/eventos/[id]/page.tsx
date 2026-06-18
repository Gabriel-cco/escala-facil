import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AtribuicoesManager from './AtribuicoesManager'

export default async function EventoDetalhePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    const supabase = await createClient()

    const { data: evento, error } = await supabase
        .from('events')
        .select('id, titulo, data_hora, group_id')
        .eq('id', id)
        .single()

    if (error || !evento) {
        return (
            <main className="p-8 max-w-2xl mx-auto">
                <Link href="/eventos" className="text-sm text-blue-600">
                    ← Voltar para eventos
                </Link>
                <p className="text-red-600 mt-4">
                    Evento não encontrado{error ? `: ${error.message}` : '.'}
                </p>
            </main>
        )
    }

    // Data do evento (só a parte da data) para avaliar suspensão dos membros
    const dataEvento = new Date(evento.data_hora).toISOString().split('T')[0]

    // Funções do grupo do evento
    const { data: funcoes } = await supabase
        .from('roles')
        .select('id, nome')
        .eq('group_id', evento.group_id)
        .order('nome', { ascending: true })

    // Membros elegíveis: mesmo grupo, ativos e não suspensos na data do evento
    const { data: membros } = await supabase
        .from('members')
        .select('id, nome')
        .eq('group_id', evento.group_id)
        .eq('ativo', true)
        .or(`suspenso_ate.is.null,suspenso_ate.lt.${dataEvento}`)
        .order('nome', { ascending: true })

    // Atribuições já feitas para o evento, com nomes de função e membro
    const { data: atribuicoes } = await supabase
        .from('assignments')
        .select('id, role_id, member_id, roles(nome), members(nome)')
        .eq('event_id', id)

    return (
        <main className="p-8 max-w-2xl mx-auto">
            <Link href="/eventos" className="text-sm text-blue-600">
                ← Voltar para eventos
            </Link>

            <h1 className="text-2xl font-bold mt-4 mb-1">{evento.titulo}</h1>
            <p className="text-sm text-gray-500 mb-6">
                {new Date(evento.data_hora).toLocaleString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </p>

            <AtribuicoesManager
                eventId={evento.id}
                funcoes={funcoes ?? []}
                membros={membros ?? []}
                atribuicoes={atribuicoes ?? []}
            />
        </main>
    )
}
