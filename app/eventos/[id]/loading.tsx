export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-[18px] pb-6 pt-4 md:p-0">
      <div className="animate-pulse space-y-5">
        {/* nome do evento + data */}
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-black/[0.07]" />
          <div className="h-4 w-36 rounded bg-black/[0.05]" />
        </div>

        {/* linhas de função + membro */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-[16px] border border-black/[0.06] bg-paper px-4 py-3.5 shadow-card"
            >
              <div className="h-4 w-28 rounded bg-black/[0.06]" />
              <div className="ml-auto h-4 w-20 rounded bg-black/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
