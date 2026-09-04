export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-4 md:p-0">
      <div className="animate-pulse space-y-4">
        {/* título + navegação de mês */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 rounded-lg bg-black/[0.07]" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-black/[0.06]" />
            <div className="h-8 w-8 rounded-full bg-black/[0.06]" />
          </div>
        </div>

        {/* grade de calendário */}
        <div className="rounded-[18px] border border-black/[0.06] bg-paper p-4 shadow-card">
          <div className="mb-3 h-4 w-32 rounded bg-black/[0.06]" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-7 rounded-lg bg-black/[0.04]" />
            ))}
          </div>
        </div>

        {/* eventos do mês */}
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
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
