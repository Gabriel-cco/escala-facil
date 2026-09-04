export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-4 md:p-0">
      <div className="animate-pulse space-y-4">
        {/* título */}
        <div className="h-7 w-28 rounded-lg bg-black/[0.07]" />

        {/* cards de troca */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[18px] border border-black/[0.06] bg-paper p-4 shadow-card"
            >
              <div className="mb-2 h-4 w-48 rounded bg-black/[0.06]" />
              <div className="mb-3 h-3 w-32 rounded bg-black/[0.04]" />
              <div className="flex gap-2">
                <div className="h-8 w-24 rounded-[10px] bg-black/[0.05]" />
                <div className="h-8 w-24 rounded-[10px] bg-black/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
