"use client";

import { useState } from "react";

type AcaoCount = { action: string; count: number };

export default function RankingAcoesToggle({
  todas,
  semPage,
}: {
  todas: AcaoCount[];
  semPage: AcaoCount[];
}) {
  const [excluirPage, setExcluirPage] = useState(false);
  const lista = excluirPage ? semPage : todas;

  return (
    <>
      <div className="flex items-center justify-end px-4 pt-3 pb-1">
        <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-muted select-none">
          <input
            type="checkbox"
            checked={excluirPage}
            onChange={(e) => setExcluirPage(e.target.checked)}
            className="h-3.5 w-3.5 rounded"
          />
          Excluir view_page
        </label>
      </div>
      <table className="w-full">
        <tbody>
          {lista.slice(0, 20).map((r, i) => (
            <tr key={r.action} className="border-b border-black/[0.04] last:border-0">
              <td className="px-5 py-2.5 text-[13px] text-muted w-6">{i + 1}</td>
              <td className="py-2.5 text-[13px] font-mono text-ink flex-1">
                {r.action}
              </td>
              <td className="px-5 py-2.5 text-right text-[13px] font-semibold text-ink-soft">
                {r.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
