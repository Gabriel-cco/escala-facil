'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
    const [carregando, setCarregando] = useState(false)

    async function entrarComGoogle() {
        setCarregando(true)
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        // Não precisa fazer mais nada: o navegador é redirecionado ao Google
    }

    return (
        <main className="max-w-md mx-auto px-6 py-20 text-center">
            <h1 className="text-2xl font-bold text-paroquia-marrom mb-2">
                Escala Fácil
            </h1>
            <p className="text-gray-600 mb-8">
                Paróquia Santa Terezinha
            </p>

            <div className="bg-paroquia-creme rounded-xl p-8">
                <p className="text-paroquia-marrom mb-6">
                    Entre para gerenciar as escalas.
                </p>
                <button
                    onClick={entrarComGoogle}
                    disabled={carregando}
                    className="bg-white border border-gray-300 rounded-lg px-6 py-3 font-medium hover:bg-gray-50 disabled:opacity-50 w-full"
                >
                    {carregando ? 'Redirecionando...' : 'Entrar com Google'}
                </button>
            </div>
        </main>
    )
}