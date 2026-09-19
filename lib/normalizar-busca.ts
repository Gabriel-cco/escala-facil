/**
 * Normaliza texto para busca "inteligente": minúsculas, sem acento,
 * pontuação tratada como espaço (separador), espaços duplicados colapsados.
 *
 * Espelha a função SQL `public.normalizar_busca()`, usada na coluna gerada
 * `users.name_normalized` — se uma mudar, a outra precisa mudar junto,
 * senão a busca para de bater com o que está indexado no banco.
 */
const MAPA_ACENTOS: Record<string, string> = {
  á: "a", à: "a", â: "a", ã: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", ô: "o", õ: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c", ñ: "n",
};

function semAcento(texto: string): string {
  return texto
    .split("")
    .map((letra) => MAPA_ACENTOS[letra] ?? letra)
    .join("");
}

export function normalizarBusca(texto: string): string {
  return semAcento(texto.toLowerCase())
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
