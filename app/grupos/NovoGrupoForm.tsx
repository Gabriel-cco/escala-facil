'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NovoGrupoForm() {
    const [nome, setNome] = useState('')
    const [descricao, setDescricao] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')
    const router = useRouter()

    async function criarGrupo() {
        setErro('')

        if (!nome) {
            setErro('Preencha o nome do grupo.')
            return
        }

        setSalvando(true)

        const supabase = createClient()

        const { error } = await supabase.from('groups').insert({
            nome: nome,
            descricao: descricao || null,
        })

        setSalvando(false)

        if (error) {
            setErro('Erro ao salvar: ' + error.message)
            return
        }

        setNome('')
        setDescricao('')
        router.refresh()
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="font-medium mb-3">Novo grupo</h2>

            <div className="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder="Nome (ex: Coroinhas, Música, Ministros)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                />

                <input
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                />

                {erro && <p className="text-red-600 text-sm">{erro}</p>}

                <button
                    onClick={criarGrupo}
                    disabled={salvando}
                    className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                    {salvando ? 'Salvando...' : 'Criar grupo'}
                </button>
            </div>
        </div>
    )
}