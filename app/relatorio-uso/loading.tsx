export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-4 md:p-0">
      <div className="animate-pulse space-y-5">
        {/* título + filtro de mês */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-44 rounded-lg bg-black/[0.07]" />
          <div className="h-8 w-32 rounded-full bg-black/[0.06]" />
        </div>

        {/* grid de cards de estatísticas */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[16px] border border-black/[0.06] bg-paper px-5 py-4 shadow-card"
            >
              <div className="mb-2 h-3 w-20 rounded bg-black/[0.05]" />
              <div className="h-7 w-12 rounded-lg bg-black/[0.07]" />
            </div>
          ))}
        </div>

        {/* área do gráfico */}
        <div className="h-48 rounded-[18px] border border-black/[0.06] bg-paper shadow-card" />
      </div>
    </div>
  );
}
