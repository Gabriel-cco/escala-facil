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

/** "28 jun" a partir de um timestamp/ISO. */
export function rotuloData(dataHora: string): string {
  const d = new Date(dataHora);
  if (Number.isNaN(d.getTime())) return "Sem data";
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

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

/** "Julho 2026" a partir de um timestamp/ISO. */
export function rotuloMes(dataHora: string): string {
  const d = new Date(dataHora);
  if (Number.isNaN(d.getTime())) return "Sem data";
  return `${MESES_LONGOS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Chave "AAAA-MM" para agrupar/ordenar por mês cronologicamente. */
export function chaveMes(dataHora: string): string {
  const d = new Date(dataHora);
  if (Number.isNaN(d.getTime())) return "0000-00";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "08:00" a partir de um timestamp/ISO. */
export function rotuloHora(dataHora: string): string {
  const d = new Date(dataHora);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
