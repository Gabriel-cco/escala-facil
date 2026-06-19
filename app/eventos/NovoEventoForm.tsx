'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Grupo = { id: string; nome: string }

export default function NovoEventoForm({ grupos }: { grupos: Grupo[] }) {
    const [titulo, setTitulo] = useState('')
    const [dataHora, setDataHora] = useState('')
    const [grupoId, setGrupoId] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')
    const router = useRouter()

    async function criarEvento() {
        setErro('')

        if (!titulo || !dataHora || !grupoId) {
            setErro('Preencha o título, a data/hora e selecione um grupo.')
            return
        }

        setSalvando(true)

        const supabase = createClient()

        const { error } = await supabase.from('events').insert({
            titulo: titulo,
            data_hora: dataHora,
            group_id: grupoId,
        })

        setSalvando(false)

        if (error) {
            setErro('Erro ao salvar: ' + error.message)
            return
        }

        setTitulo('')
        setDataHora('')
        setGrupoId('')
        router.refresh()
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="font-medium mb-3">Novo evento</h2>

            <div className="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder="Título (ex: Missa de Domingo 9h)"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                />

                <input
                    type="datetime-local"
                    value={dataHora}
                    onChange={(e) => setDataHora(e.target.value)}
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
                    onClick={criarEvento}
                    disabled={salvando}
                    className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                    {salvando ? 'Salvando...' : 'Criar evento'}
                </button>
            </div>
        </div>
    )
}