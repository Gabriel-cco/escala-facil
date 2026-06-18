'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function BotaoSair() {
    const [saindo, setSaindo] = useState(false)
    const router = useRouter()

    async function sair() {
        setSaindo(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <button
            onClick={sair}
            disabled={saindo}
            className="text-white/90 hover:text-paroquia-dourado transition-colors text-sm disabled:opacity-50"
        >
            {saindo ? 'Saindo...' : 'Sair'}
        </button>
    )
}