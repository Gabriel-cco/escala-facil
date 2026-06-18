'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Grupo = { id: string; nome: string }

export default function NovoMembroForm({ grupos }: { grupos: Grupo[] }) {
    const [nome, setNome] = useState('')
    const [telefone, setTelefone] = useState('')
    const [grupoId, setGrupoId] = useState('')
    const [dataNascimento, setDataNascimento] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')
    const router = useRouter()

    async function criarMembro() {
        setErro('')

        if (!nome || !grupoId) {
            setErro('Preencha o nome e selecione um grupo.')
            return
        }

        setSalvando(true)

        const supabase = createClient()

        const { error } = await supabase.from('members').insert({
            nome: nome,
            telefone: telefone || null,
            group_id: grupoId,
            data_nascimento: dataNascimento || null,
        })

        setSalvando(false)

        if (error) {
            setErro('Erro ao salvar: ' + error.message)
            return
        }

        setNome('')
        setTelefone('')
        setGrupoId('')
        setDataNascimento('')
        router.refresh()
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="font-medium mb-3">Novo membro</h2>

            <div className="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder="Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2"
                />

                <input
                    type="text"
                    placeholder="Telefone (opcional)"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
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

                <label className="text-sm text-gray-600">
                    Data de nascimento (opcional)
                    <input
                        type="date"
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 mt-1 block w-full"
                    />
                </label>

                {erro && <p className="text-red-600 text-sm">{erro}</p>}

                <button
                    onClick={criarMembro}
                    disabled={salvando}
                    className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                    {salvando ? 'Salvando...' : 'Criar membro'}
                </button>
            </div>
        </div>
    )
}