"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Modal usado pelas rotas interceptadas dos formulários (handoff web).
 * Responsivo: no desktop é um card centralizado (#f4f4f2) sobre backdrop;
 * no mobile ocupa a tela inteira com header de voltar, imitando a página.
 * Fechar = voltar na pilha (router.back), restaurando a rota interceptada.
 */
export default function Modal({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const fechar = () => router.back();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <>
      {/* Backdrop (só web) */}
      <div
        onClick={fechar}
        className="ef-backdrop fixed inset-0 z-40 hidden bg-black/[0.34] md:block"
      />

      <div className="fixed inset-0 z-50 flex flex-col bg-screen md:items-center md:justify-center md:bg-transparent md:p-6">
        {/* Header (só mobile, imita a página) */}
        <header className="sticky top-0 flex flex-none items-center gap-1.5 bg-screen px-4 pb-3.5 pt-4 md:hidden">
          <button
            onClick={fechar}
            aria-label="Voltar"
            className="-mt-1 flex h-[38px] w-[38px] items-center justify-center text-3xl leading-none text-ink"
          >
            ‹
          </button>
          <div className="font-serif text-[20px] font-semibold text-ink">
            {title}
          </div>
        </header>

        <div className="ef-scroll flex-1 overflow-y-auto px-[22px] pb-6 md:flex-none md:overflow-visible md:p-0">
          <div className="md:w-[460px] md:max-w-full md:animate-[ef-pop_0.26s_cubic-bezier(0.2,0.8,0.2,1)] md:rounded-[22px] md:bg-[#f4f4f2] md:p-7 md:shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
            <div className="mb-5 hidden font-serif text-[22px] font-semibold text-ink md:block">
              {title}
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
