'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Grupo = { id: string; nome: string }

export default function NovaFuncaoForm({ grupos }: { grupos: Grupo[] }) {
    const [nome, setNome] = useState('')
    const [grupoId, setGrupoId] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')
    const router = useRouter()

    async function criarFuncao() {
        setErro('')

        if (!nome || !grupoId) {
            setErro('Preencha o nome e selecione um grupo.')
            return
        }

        setSalvando(true)

        const { error } = await supabase.from('roles').insert({
            nome: nome,
            group_id: grupoId,
        })

        setSalvando(false)

        if (error) {
            setErro('Erro ao salvar: ' + error.message)
            return
        }

        setNome('')
        setGrupoId('')
        router.refresh()
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="font-medium mb-3">Nova função</h2>

            <div className="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder="Nome (ex: Cruz, Vela, Teclado, Vocal)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                />

                <select
                    value={grupoId}
                    onChange={(e) => setGrupoId(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                >
                    <option value="">Selecione um grupo...</option>
                    {grupos.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                            {grupo.nome}
                        </option>
                    ))}
                </select>

                {erro && <p className="text-red-600 text-sm">{erro}</p>}

                <button
                    onClick={criarFuncao}
                    disabled={salvando}
                    className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                    {salvando ? 'Salvando...' : 'Criar função'}
                </button>
            </div>
        </div>
    )
}