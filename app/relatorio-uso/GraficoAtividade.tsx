"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type DiaAtividade = { dia: string; total: number };

export default function GraficoAtividade({ dados }: { dados: DiaAtividade[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[13px] text-muted">
        Sem dados para o período.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={dados} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 11, fill: "#9a8e85" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9a8e85" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          formatter={(value) => [value, "ações"]}
        />
        <Bar dataKey="total" fill="#8b5e3c" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
