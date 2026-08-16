// Calendário litúrgico católico (Romcal, calendário brasileiro em pt-BR).
// Cacheia o calendário do ano inteiro em memória — ele não muda, então não expira.

import { Romcal } from "romcal";
import { Brazil_PtBr } from "@romcal/calendar.brazil";

export type LiturgicalColor = "green" | "white" | "purple" | "red";

export interface LiturgicalInfo {
  name: string; // ex.: "18º Domingo do Tempo Comum"
  color: LiturgicalColor;
  rank: string; // ex.: "Domingo", "Solenidade", "Festa", "Memória"
  season: string; // ex.: "Tempo Comum", "Advento", "Quaresma", "Páscoa"
}

// Romcal retorna cores em inglês maiúsculo. Mapeamos para o enum do banco
// (liturgical_color: green | white | purple | red). Rosa e preto (usados
// raramente — Gaudete/Laetare e exéquias) caem no roxo, o mais próximo.
function mapColor(colors: string[]): LiturgicalColor {
  const cor = colors[0];
  switch (cor) {
    case "GREEN":
      return "green";
    case "WHITE":
    case "GOLD":
      return "white";
    case "RED":
      return "red";
    case "PURPLE":
    case "VIOLET":
    case "ROSE":
    case "BLACK":
    default:
      return "purple";
  }
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Cache do calendário por ano — calculado uma vez, reaproveitado sempre.
const cacheAnos = new Map<number, Promise<Record<string, RomcalLiturgicalDay[]>>>();

// Tipagem mínima do que usamos do LiturgicalDay do Romcal (evita depender de
// tipos internos exportados só pelo pacote `rites/roman1969`).
type RomcalLiturgicalDay = {
  date: string;
  name: string;
  rankName: string;
  colors: string[];
  seasonNames: string[];
};

function getYearCalendar(year: number): Promise<Record<string, RomcalLiturgicalDay[]>> {
  let cached = cacheAnos.get(year);
  if (!cached) {
    const romcal = new Romcal({ localizedCalendar: Brazil_PtBr });
    cached = romcal.generateCalendar(year) as unknown as Promise<
      Record<string, RomcalLiturgicalDay[]>
    >;
    cacheAnos.set(year, cached);
  }
  return cached;
}

function paraLiturgicalInfo(dia: RomcalLiturgicalDay): LiturgicalInfo {
  return {
    name: dia.name,
    color: mapColor(dia.colors),
    rank: capitalizar(dia.rankName),
    season: dia.seasonNames[0] ?? "",
  };
}

/**
 * Retorna informações litúrgicas para uma data específica ("AAAA-MM-DD").
 */
export async function getLiturgicalInfo(date: string): Promise<LiturgicalInfo | null> {
  const ano = Number(date.slice(0, 4));
  if (!ano) return null;
  const calendario = await getYearCalendar(ano);
  const dia = calendario[date]?.[0];
  if (!dia) return null;
  return paraLiturgicalInfo(dia);
}

/**
 * Retorna informações litúrgicas para todas as datas de um mês, indexadas
 * por "AAAA-MM-DD". Útil para preencher o preview do template mensal.
 */
export async function getLiturgicalMonth(
  year: number,
  month: number
): Promise<Record<string, LiturgicalInfo>> {
  const calendario = await getYearCalendar(year);
  const prefixo = `${year}-${String(month).padStart(2, "0")}`;
  const resultado: Record<string, LiturgicalInfo> = {};
  for (const [date, dias] of Object.entries(calendario)) {
    if (!date.startsWith(prefixo) || !dias[0]) continue;
    resultado[date] = paraLiturgicalInfo(dias[0]);
  }
  return resultado;
}
