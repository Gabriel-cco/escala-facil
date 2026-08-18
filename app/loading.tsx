/**
 * Skeleton de navegação. Como o AppShell (layout raiz) persiste entre trocas de
 * página, só a área de conteúdo mostra este placeholder enquanto a próxima tela
 * carrega no servidor — a navegação (inclusive as abas no mobile) passa a dar
 * feedback imediato em vez de "travar" no clique. Genérico de propósito: serve
 * de boundary para todas as rotas dentro da casca.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-4 md:p-0">
      <div className="animate-pulse space-y-4">
        {/* título */}
        <div className="h-7 w-44 rounded-lg bg-black/[0.07]" />
        <div className="h-4 w-60 rounded bg-black/[0.05]" />

        {/* cartões */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] rounded-[18px] border border-black/[0.06] bg-paper shadow-card"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
