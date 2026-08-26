"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function MembroSelect({
  membros,
  membroId,
}: {
  membros: { id: string; nome: string }[];
  membroId: string | null;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function mudar(id: string) {
    const p = new URLSearchParams(sp.toString());
    if (id) p.set("membro", id);
    else p.delete("membro");
    const qs = p.toString();
    router.push(qs ? `/eventos?${qs}` : "/eventos", { scroll: false });
  }

  return (
    <select
      value={membroId ?? ""}
      onChange={(e) => mudar(e.target.value)}
      className="rounded-full border border-black/10 bg-paper px-3.5 py-1.5 text-[13px] font-medium text-ink-soft focus:outline-none"
    >
      <option value="">Todos os membros</option>
      {membros.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nome}
        </option>
      ))}
    </select>
  );
}
