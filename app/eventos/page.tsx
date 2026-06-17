import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import NovoEventoForm from './NovoEventoForm'

export default async function EventosPage() {
    const { data: eventos, error } = await supabase
        .from('events')
        .select('*')
        .order('data_hora', { ascending: true })

    return (
        <main className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Eventos</h1>

            <NovoEventoForm />

            {error && (
                <p className="text-red-600">Erro: {error.message}</p>
            )}

            {eventos && eventos.length === 0 && (
                <p className="text-gray-500">Nenhum evento cadastrado ainda.</p>
            )}

            <ul className="space-y-3">
                {eventos?.map((evento) => (
                    <li
                        key={evento.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                        <Link href={`/eventos/${evento.id}`} className="block">
                            <p className="font-medium">{evento.titulo}</p>
                            <p className="text-sm text-gray-500">
                                {new Date(evento.data_hora).toLocaleString('pt-BR', {
                                    weekday: 'long',
                                    day: '2-digit',
                                    month: 'long',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    )
}