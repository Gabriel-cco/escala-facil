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

/** "08:00" a partir de um timestamp/ISO. */
export function rotuloHora(dataHora: string): string {
  const d = new Date(dataHora);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
