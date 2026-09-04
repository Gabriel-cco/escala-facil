export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-4 md:p-0">
      <div className="animate-pulse space-y-4">
        {/* header bar */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 rounded-lg bg-black/[0.07]" />
          <div className="h-9 w-28 rounded-[11px] bg-black/[0.06]" />
        </div>

        {/* filtros / chips */}
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-full bg-black/[0.07]" />
          <div className="h-8 w-24 rounded-full bg-black/[0.05]" />
          <div className="h-8 w-20 rounded-full bg-black/[0.05]" />
        </div>

        {/* cards de evento */}
        <div className="space-y-3 pt-1">
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
