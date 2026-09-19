"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, Suspense } from "react";

function BuscaInputInner({ valorInicial }: { valorInicial: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(valor: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor.trim()) {
        params.set("busca", valor.trim());
      } else {
        params.delete("busca");
      }
      params.delete("p");
      router.push(`?${params.toString()}`, { scroll: false });
    }, 350);
  }

  return (
    <input
      type="search"
      key={valorInicial}
      defaultValue={valorInicial}
      placeholder="Buscar por nome..."
      onChange={(e) => handleChange(e.target.value)}
      className="h-9 w-full rounded-xl border border-black/[0.10] bg-surface px-3.5 text-[13px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/30 md:w-60"
    />
  );
}

export function BuscaInput({ valorInicial }: { valorInicial: string }) {
  return (
    <Suspense>
      <BuscaInputInner valorInicial={valorInicial} />
    </Suspense>
  );
}
