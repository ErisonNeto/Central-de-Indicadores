"use client";
import { useState } from "react";
import { novemberKpiGroups } from "../lib/monthly-kpi-goals.js";

const formatWeight = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

export default function OfficialGoals({ month }: { month: string }) {
  const [groupId, setGroupId] = useState("lm");
  if (month !== "2026-11") return null;
  const group = novemberKpiGroups.find((item) => item.id === groupId) ?? novemberKpiGroups[0];

  return (
    <details className="month-rules calculation-notes">
      <summary>Metas oficiais de novembro/2026 · KPI GP-PA</summary>
      <p>
        Referência da planilha KPI – GP-PA – Novembro 2026. As quatro categorias
        são independentes; SC e DC indicam tipos de estação, não os responsáveis
        S/C desta Central. Os valores abaixo são metas da planilha, não resultados apurados.
      </p>
      <div className="month-controls">
        <label>
          Critérios por função ou operação
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            {novemberKpiGroups.map((item) => (
              <option value={item.id} key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="month-help">{group.description}</p>
      <div className="month-scroll" role="region" tabIndex={0} aria-label={"Metas oficiais: " + group.name}>
        <table className="month-history">
          <caption className="sr-only">Metas, valores mínimos e pesos de novembro de 2026</caption>
          <thead>
            <tr>
              <th scope="col">Indicador</th>
              <th scope="col">Meta</th>
              <th scope="col">Mínimo (planilha)</th>
              <th scope="col">Peso da meta</th>
              <th scope="col">Peso mínimo</th>
              <th scope="col">Regra / fonte</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((item) => (
              <tr key={item.name}>
                <th scope="row">{item.name}</th>
                <td><strong>{item.target}</strong></td>
                <td>{item.minimum}</td>
                <td>{formatWeight(item.weight)}</td>
                <td>{formatWeight(item.minimumWeight)}</td>
                <td>{item.observation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="month-help">
        Na classificação mensal por S/C, o 1BD usa 85% em novembro (mínimo
        referencial 80%). O SLA permanece 97% e o C2C corresponde a 30
        pedidos por base ativa. As metas em PPM, os percentuais de retidos/sem
        movimentação, os custos e as etapas específicas SC/DC não são
        comparados automaticamente com valores em reais, totais de registros
        ou outras etapas de Shipping Time. Nenhuma pontuação foi calculada.
      </p>
    </details>
  );
}
