"use server";

// Wrapper de Server Actions em torno de lib/liturgical.ts — o Romcal é uma lib
// relativamente pesada; mantê-la só no servidor evita inflar o bundle do
// cliente nos formulários (Criar/Editar evento) que precisam do cálculo.

import {
  getLiturgicalInfo,
  getLiturgicalMonth,
  type LiturgicalInfo,
} from "./liturgical";

export async function getLiturgicalInfoAction(
  date: string
): Promise<LiturgicalInfo | null> {
  return getLiturgicalInfo(date);
}

export async function getLiturgicalMonthAction(
  year: number,
  month: number
): Promise<Record<string, LiturgicalInfo>> {
  return getLiturgicalMonth(year, month);
}
