'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Membro = {
    id: string
    nome: string
    telefone: string | null
    ativo: boolean
    suspenso_ate: string | null
    groups: { nome: string } | null
}

export default function MembroItem({ membro }: { membro: Membro }) {
    const [mostrarSuspensao, setMostrarSuspensao] = useState(false)
    const [dataSuspensao, setDataSuspensao] = useState('')
    const [processando, setProcessando] = useState(false)
    const [erroData, setErroData] = useState('')
    const router = useRouter()

    // Verifica se o membro está suspenso AGORA (suspenso_ate é hoje ou futuro)
    const hoje = new Date().toISOString().split('T')[0]
    const estaSuspenso = membro.suspenso_ate != null && membro.suspenso_ate >= hoje

    async function suspender() {
        if (!dataSuspensao) return

        // Validação: a data precisa ser futura — evita salvar lixo e poupa transação
        if (dataSuspensao <= hoje) {
            setErroData('A data de suspensão precisa ser futura.')
            return
        }

        setErroData('')
        setProcessando(true)
        await supabase
            .from('members')
            .update({ suspenso_ate: dataSuspensao })
            .eq('id', membro.id)
        setProcessando(false)
        setMostrarSuspensao(false)
        setDataSuspensao('')
        router.refresh()
    }

    async function reativar() {
        setProcessando(true)
        await supabase
            .from('members')
            .update({ suspenso_ate: null })
            .eq('id', membro.id)
        setProcessando(false)
        router.refresh()
    }

    function toggleFormulario() {
        setMostrarSuspensao(!mostrarSuspensao)
        setErroData('')
        setDataSuspensao('')
    }

    return (
        <li className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-medium">{membro.nome}</p>
                    <p className="text-sm text-gray-500">
                        {membro.groups?.nome ?? 'Sem grupo'}
                        {membro.telefone && ` · ${membro.telefone}`}
                    </p>
                    {estaSuspenso && (
                        <p className="text-sm text-amber-600 mt-1">
                            Suspenso até{' '}
                            {new Date(membro.suspenso_ate + 'T00:00').toLocaleDateString('pt-BR')}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2 items-end">
                    {estaSuspenso ? (
                        <button
                            onClick={reativar}
                            disabled={processando}
                            className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Reativar
                        </button>
                    ) : (
                        <button
                            onClick={toggleFormulario}
                            className="text-sm border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
                        >
                            Suspender
                        </button>
                    )}
                </div>
            </div>

            {mostrarSuspensao && !estaSuspenso && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex gap-2 items-end">
                        <label className="text-sm text-gray-600 flex-1">
                            Suspenso até:
                            <input
                                type="date"
                                value={dataSuspensao}
                                min={hoje}
                                onChange={(e) => setDataSuspensao(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2 mt-1 block w-full"
                            />
                        </label>
                        <button
                            onClick={suspender}
                            disabled={processando || !dataSuspensao}
                            className="bg-amber-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
                        >
                            Confirmar
                        </button>
                    </div>
                    {erroData && <p className="text-red-600 text-sm mt-2">{erroData}</p>}
                </div>
            )}
        </li>
    )
}