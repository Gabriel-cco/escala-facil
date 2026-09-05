export const MENU_KEYS = [
  { key: "membros",    label: "Membros" },
  { key: "funcoes",    label: "Funções" },
  { key: "eventos",    label: "Eventos" },
  { key: "trocas",     label: "Trocas" },
  { key: "ministerios", label: "Ministérios" },
  { key: "frequencia", label: "Frequência (widget)" },
] as const;

export type MenuKey = (typeof MENU_KEYS)[number]["key"];
