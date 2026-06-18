'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Funcao = { id: string; nome: string }
type Membro = { id: string; nome: string }

// O join do Supabase pode vir como objeto ou array dependendo da inferência;
// normalizamos na hora de exibir.
type Atribuicao = {
    id: string
    role_id: string
    member_id: string
    roles: { nome: string } | { nome: string }[] | null
    members: { nome: string } | { nome: string }[] | null
}

function nomeDe(rel: { nome: string } | { nome: string }[] | null): string {
    if (!rel) return '—'
    return Array.isArray(rel) ? (rel[0]?.nome ?? '—') : rel.nome
}

export default function AtribuicoesManager({
    eventId,
    funcoes,
    membros,
    atribuicoes,
}: {
    eventId: string
    funcoes: Funcao[]
    membros: Membro[]
    atribuicoes: Atribuicao[]
}) {
    const [funcaoId, setFuncaoId] = useState('')
    const [membroId, setMembroId] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')
    const [removendoId, setRemovendoId] = useState<string | null>(null)
    const router = useRouter()

    async function criarAtribuicao() {
        setErro('')

        if (!funcaoId || !membroId) {
            setErro('Selecione uma função e um membro.')
            return
        }

        // Impede atribuir o mesmo membro à mesma função duas vezes no evento
        const jaExiste = atribuicoes.some(
            (a) => a.role_id === funcaoId && a.member_id === membroId
        )
        if (jaExiste) {
            setErro('Esse membro já está atribuído a essa função neste evento.')
            return
        }

        setSalvando(true)

        const supabase = createClient()

        const { error } = await supabase.from('assignments').insert({
            event_id: eventId,
            role_id: funcaoId,
            member_id: membroId,
        })

        setSalvando(false)

        if (error) {
            // 23505 = violação de UNIQUE (fallback à checagem acima)
            if (error.code === '23505') {
                setErro('Esse membro já está atribuído a essa função neste evento.')
            } else {
                setErro('Erro ao salvar: ' + error.message)
            }
            return
        }

        setFuncaoId('')
        setMembroId('')
        router.refresh()
    }

    async function removerAtribuicao(id: string) {
        setRemovendoId(id)
        const supabase = createClient()
        await supabase.from('assignments').delete().eq('id', id)
        setRemovendoId(null)
        router.refresh()
    }

    return (
        <div>
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
                <h2 className="font-medium mb-3">Escalar membro</h2>

                {funcoes.length === 0 ? (
                    <p className="text-sm text-gray-500">
                        Nenhuma função cadastrada para o grupo deste evento.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        <select
                            value={funcaoId}
                            onChange={(e) => setFuncaoId(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="">Selecione uma função...</option>
                            {funcoes.map((funcao) => (
                                <option key={funcao.id} value={funcao.id}>
                                    {funcao.nome}
                                </option>
                            ))}
                        </select>

                        <select
                            value={membroId}
                            onChange={(e) => setMembroId(e.target.value)}
                            className="border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="">Selecione um membro...</option>
                            {membros.map((membro) => (
                                <option key={membro.id} value={membro.id}>
                                    {membro.nome}
                                </option>
                            ))}
                        </select>

                        {membros.length === 0 && (
                            <p className="text-sm text-gray-500">
                                Nenhum membro elegível (ativo e não suspenso) neste grupo.
                            </p>
                        )}

                        {erro && <p className="text-red-600 text-sm">{erro}</p>}

                        <button
                            onClick={criarAtribuicao}
                            disabled={salvando}
                            className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                        >
                            {salvando ? 'Salvando...' : 'Escalar'}
                        </button>
                    </div>
                )}
            </div>

            <h2 className="font-medium mb-3">Atribuições</h2>

            {atribuicoes.length === 0 ? (
                <p className="text-gray-500">Nenhum membro escalado ainda.</p>
            ) : (
                <ul className="space-y-3">
                    {atribuicoes.map((atribuicao) => (
                        <li
                            key={atribuicao.id}
                            className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                        >
                            <div>
                                <p className="font-medium">{nomeDe(atribuicao.roles)}</p>
                                <p className="text-sm text-gray-500">
                                    {nomeDe(atribuicao.members)}
                                </p>
                            </div>
                            <button
                                onClick={() => removerAtribuicao(atribuicao.id)}
                                disabled={removendoId === atribuicao.id}
                                className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                            >
                                {removendoId === atribuicao.id ? 'Removendo...' : 'Remover'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
