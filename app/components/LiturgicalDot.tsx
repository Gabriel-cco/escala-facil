import type { LiturgicalColor } from "@/lib/liturgical";

const CORES: Record<LiturgicalColor, string> = {
  green: "bg-green-500",
  white: "bg-gray-300 border border-gray-400", // branco puro some no fundo branco
  purple: "bg-purple-500",
  red: "bg-red-500",
};

const EMOJI: Record<LiturgicalColor, string> = {
  green: "🟢",
  white: "⚪",
  purple: "🟣",
  red: "🔴",
};

/** Bolinha discreta com a cor litúrgica do dia. Não renderiza nada se não houver cor. */
export function LiturgicalDot({ color }: { color: LiturgicalColor | string | null | undefined }) {
  if (!color || !(color in CORES)) return null;
  return (
    <span
      className={`inline-block h-3 w-3 flex-none rounded-full ${CORES[color as LiturgicalColor]}`}
    />
  );
}

/** Emoji equivalente à cor litúrgica — usado onde o conteúdo pode virar texto puro (link público). */
export function liturgicalEmoji(color: LiturgicalColor | string | null | undefined): string {
  if (!color || !(color in EMOJI)) return "";
  return EMOJI[color as LiturgicalColor];
}
