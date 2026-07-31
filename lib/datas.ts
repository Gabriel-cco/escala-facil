const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const MESES_LONGOS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// events.date vem como "AAAA-MM-DD" e events.time como "HH:MM:SS".
// Parseamos manualmente para evitar o deslocamento de fuso do `new Date(iso)`.
function partesData(
  date: string | null | undefined
): { ano: number; mes: number; dia: number } | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

/** "28 jun" a partir de uma data "AAAA-MM-DD". */
export function rotuloData(date: string): string {
  const p = partesData(date);
  if (!p) return "Sem data";
  return `${p.dia} ${MESES[p.mes - 1]}`;
}

/** "Julho 2026" a partir de uma data "AAAA-MM-DD". */
export function rotuloMes(date: string): string {
  const p = partesData(date);
  if (!p) return "Sem data";
  return `${MESES_LONGOS[p.mes - 1]} ${p.ano}`;
}

/** Chave "AAAA-MM" para agrupar/ordenar por mês cronologicamente. */
export function chaveMes(date: string): string {
  const p = partesData(date);
  if (!p) return "0000-00";
  return `${p.ano}-${String(p.mes).padStart(2, "0")}`;
}

/** "08:00" a partir de um horário "HH:MM[:SS]". */
export function rotuloHora(time: string | null | undefined): string {
  if (!time) return "--:--";
  const m = /^(\d{2}):(\d{2})/.exec(time);
  if (!m) return "--:--";
  return `${m[1]}:${m[2]}`;
}
