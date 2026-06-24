/** Gera as iniciais (até 2 letras) de um nome — usado nos avatares. */
export function iniciais(nome: string): string {
  return (nome || "")
    .trim()
    .split(/\s+/)
    .map((parte) => parte[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
