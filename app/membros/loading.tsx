export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-4 md:p-0">
      <div className="animate-pulse space-y-4">
        {/* header bar */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-36 rounded-lg bg-black/[0.07]" />
          <div className="h-9 w-24 rounded-[11px] bg-black/[0.06]" />
        </div>

        {/* itens de membro */}
        <div className="space-y-3 pt-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-[18px] border border-black/[0.06] bg-paper px-4 py-3.5 shadow-card"
            >
              <div className="h-9 w-9 flex-none rounded-full bg-black/[0.07]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-black/[0.06]" />
                <div className="h-3 w-44 rounded bg-black/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
