"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useShell } from "./menu-context";
import NotificationBell from "./NotificationBell";

type HeaderProps =
  | { variant: "home" }
  | {
      variant: "root";
      title: string;
      actionLabel?: string;
      actionHref?: string;
    }
  | { variant: "back"; title: string };

/**
 * Header do app. No mobile (<md) renderiza a barra sticky em três modos:
 * - home: ☰ + "Escala Fácil" + avatar (abrem o menu lateral)
 * - root: título grande (telas raiz da barra de abas)
 * - back: ‹ voltar + título da subtela
 * Em qualquer viewport, registra o chrome (título/ação/voltar) que a topbar
 * web consome. É oculto no desktop (md:hidden) — lá quem aparece é a topbar.
 */
export default function Header(props: HeaderProps) {
  const router = useRouter();
  const { openMenu, userIniciais, setChrome } = useShell();

  // Título exibido na topbar web conforme a variante.
  let chromeTitle = "";
  let showBack = false;
  let actionLabel: string | undefined;
  let actionHref: string | undefined;
  if (props.variant === "home") {
    // A saudação "Olá, {nome}" vive no conteúdo do dashboard — topbar limpa.
    chromeTitle = "";
  } else if (props.variant === "root") {
    chromeTitle = props.title;
    actionLabel = props.actionLabel;
    actionHref = props.actionHref;
  } else {
    chromeTitle = props.title;
    showBack = true;
  }

  useEffect(() => {
    setChrome({ title: chromeTitle, showBack, actionLabel, actionHref });
  }, [chromeTitle, showBack, actionLabel, actionHref, setChrome]);

  if (props.variant === "home") {
    return (
      <header className="sticky top-0 z-30 flex flex-none items-center justify-between bg-screen px-5 pb-3.5 pt-4 md:hidden">
        <button
          onClick={openMenu}
          aria-label="Abrir menu"
          className="flex h-[38px] w-[38px] items-center justify-center text-[22px] leading-none text-ink"
        >
          ☰
        </button>
        <div className="text-[20px] tracking-tight text-ink">
          <span className="font-light">escala</span><span className="font-bold">fácil</span>
        </div>
        <NotificationBell />
      </header>
    );
  }

  if (props.variant === "back") {
    return (
      <header className="sticky top-0 z-30 flex flex-none items-center justify-between bg-screen px-4 pb-3.5 pt-4 md:hidden">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="-mt-1 flex h-[38px] w-[38px] items-center justify-center text-3xl leading-none text-ink"
          >
            ‹
          </button>
          <div className="font-serif text-[20px] font-semibold text-ink">
            {props.title}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={openMenu}
            aria-label="Abrir menu"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-primary-light text-[13px] font-semibold text-primary"
          >
            {userIniciais || "··"}
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex flex-none items-center justify-between bg-screen px-5 pb-3.5 pt-4 md:hidden">
      <div className="font-serif text-[28px] font-semibold text-ink">
        {props.title}
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <button
          onClick={openMenu}
          aria-label="Abrir menu"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-primary-light text-[13px] font-semibold text-primary"
        >
          {userIniciais || "··"}
        </button>
      </div>
    </header>
  );
}
