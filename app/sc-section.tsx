"use client";
import { kpiTone, kpiLabel } from "../lib/kpi-status.js";
import { useEffect, useState } from "react";
import { fetchJson } from "./client-data";
import { ClaimsSc } from "./claims-view";
import { officialMonthlyGoal } from "../lib/monthly-kpi-goals.js";
import { Users, RefreshCw, ArrowUpRight } from "lucide-react";
const options = [
  {
    id: "1bd",
    name: "1BD",
    unit: "%",
    url: "https://j-t-1bd-5cd-csat.onrender.com/",
  },
  {
    id: "5cd",
    name: "5CD",
    unit: " remessas",
    url: "https://j-t-1bd-5cd-csat.onrender.com/",
  },
  {
    id: "csat",
    name: "CSAT",
    unit: "%",
    url: "https://j-t-1bd-5cd-csat.onrender.com/",
  },
  {
    id: "sla",
    name: "SLA",
    unit: "%",
    url: "https://jandt-sla-dashboard.onrender.com/",
  },
  { id: "t0", name: "T0", unit: "%", url: "https://j-t-t0.onrender.com/" },
  {
    id: "shipping",
    name: "Shipping Time",
    unit: "h",
    url: "https://j-t-shippingtime.onrender.com/",
  },
  {
    id: "capotamento",
    name: "Capotamento",
    unit: "%",
    url: "https://j-t-capotamento.onrender.com/",
  },
  {id: "c2c", name: "C2C", unit: "%", url: "https://c2c-e9f0.onrender.com/"},
];
const f = (v: number) =>
  v.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
function Result({
  item,
  goal,
  unit,
  inverse,
  error,
}: {
  item: any;
  goal: any;
  unit: string;
  inverse: boolean;
  error?: string;
}) {
  if (typeof item?.value !== "number")
    return (
      <span className="sc-empty">{error ? "Indisponível" : "Sem dados"}</span>
    );
  const tone = kpiTone(item.value, goal, item.minimum, !inverse);
  return (
    <div className="sc-result">
      <strong>
        {f(item.value)}
        {unit}
      </strong>
      <span className={tone}>{kpiLabel(tone)}</span>
      {item.target !== undefined && (<small>{item.count} / {item.target} pacotes · {item.bases} bases</small>)}
      {item.positives !== undefined && (
        <small>{Number(item.positives).toLocaleString('pt-BR')} positivas · {Number(item.negatives).toLocaleString('pt-BR')} negativas</small>
      )}
      {item.alerts !== undefined && (
        <small className="cap-counts">
          {item.alerts} alerta · {item.cap} capotadas
        </small>
      )}
    </div>
  );
}
function HistoryHeaders({ comparison, csat = false }: { comparison: any; csat?: boolean }) {
  const date = (iso?: string) =>
    iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "";
  return (
    <>
      <th scope="col">
        Mesmo dia na semana passada
        <br />
        <small>{date(comparison?.previousDay?.to)}</small>
      </th>
      <th scope="col">
        {csat ? 'Semana oficial anterior' : 'Semana passada · seg a dom'}
        <br />
        <small>{csat ? (comparison?.previousWeek?.weekId || '—') : <>{date(comparison?.previousWeek?.from)} –{' '}{date(comparison?.previousWeek?.to)}</>}</small>
      </th>
    </>
  );
}
export default function ScSection({ kind }: { kind: string }) {
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRevision((v) => v + 1), 300000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    fetchJson("/api/sc?kind=" + kind, abort.signal)
      .then((d) => {
        if (!abort.signal.aborted) setData(d);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setData({ error: "Não foi possível consultar os responsáveis." });
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [kind, revision]);
  const selected = options.find((x) => x.id === kind)!;
  const monthGoal = kind === "1bd"
    ? officialMonthlyGoal(kind, data?.periods?.start) ?? data?.month?.goal
    : data?.month?.goal;
  const rows = (data?.rows || []).filter((r: any) =>
    (r.name + " " + r.role)
      .toLocaleLowerCase("pt-BR")
      .includes(query.toLocaleLowerCase("pt-BR")),
  );
  if (["avaria", "extravio", "pnr"].includes(kind))
    return <ClaimsSc data={data} loading={loading} rows={rows} />;
  if (kind === "sem_mov" || kind === "retidos") {
    const cell = (entry: any) =>
      entry
        ? entry.value.toLocaleString("pt-BR") +
          " / " +
          entry.q10.toLocaleString("pt-BR")
        : "—";
    return (
      <section className="sc-section">
        <h4>Pacotes por S/C</h4>
        <p>
          Acima de 3 dias / acima de 10 dias · maior volume acima de 3 dias
          primeiro.
        </p>
        {loading ? (
          "Consultando…"
        ) : data?.error ? (
          <p>{data.error}</p>
        ) : (
          <div
            className="sc-scroll"
            tabIndex={0}
            role="region"
            aria-label="Resultados por S/C, tabela com rolagem"
          >
            <table>
              <caption className="sr-only">
                Resultados por responsável e período
              </caption>
              <thead>
                <tr>
                  <th scope="col">Responsável</th>
                  <th scope="col">Ontem</th>
                  <HistoryHeaders comparison={data?.comparison} />
                  <th scope="col">Acumulado do mês</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.name}>
                    <th scope="row">{r.name}</th>
                    <td>{cell(r.day)}</td>
                    <td>{cell(r.previousDay)}</td>
                    <td>{cell(r.previousWeek)}</td>
                    <td>{cell(r.month)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p>Sem dados no período.</p>}
          </div>
        )}
      </section>
    );
  }
  const goal = (v: any) =>
    typeof v === "number"
      ? (kind === "shipping" || kind === "capotamento" ? "≤ " : "≥ ") +
        f(v) +
        selected.unit
      : "Não cadastrada";
  return (
    <section className="sc-section">
      <div className="sc-heading">
        <div>
          <div className="eyebrow">
            <Users size={13} /> EQUIPE DO ORLEAN
          </div>
          <h4>Coordenadores e Supervisores</h4>
          <p>Pior → melhor · dia de referência, com desempate pelo mês</p>
        </div>
        <button
          aria-label="Atualizar resultados dos S/C"
          disabled={loading}
          onClick={() => setRevision((v) => v + 1)}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
        </button>
      </div>
      <div className="sc-tools">
        <input
          type="search"
          aria-label="Buscar coordenador ou supervisor"
          placeholder="Buscar responsável…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {kind === "shipping" || kind === "5cd" ? (
        <div className="sc-goals">
          <span>
            {kind === "5cd"
              ? "Remessas em aberto · média diária nos períodos"
              : "Tempo médio em horas · menor é melhor"}
          </span>
          <span>Sem meta fixa</span>
        </div>
      ) : (
        <div className="sc-goals">
          <span>
            Meta do dia de referência{" "}
            <b>
              {goal(
                data?.day?.goal ??
                  (kind === "1bd"
                    ? 85
                    : kind === "sla"
                      ? 97
                      : kind === "t0"
                        ? 70
                        : kind === "shipping"
                          ? null
                          : kind === "capotamento"
                            ? 0
                            : null),
              )}
            </b>
          </span>
          <span>
            Meta do mês{" "}
            <b>
              {goal(
                monthGoal ??
                  (kind === "1bd"
                    ? 85
                    : kind === "sla"
                      ? 97
                      : kind === "t0"
                        ? 70
                        : kind === "shipping"
                          ? null
                          : kind === "capotamento"
                            ? 0
                            : null),
              )}
            </b>
          </span>
          <span>
            {data?.rows?.length
              ? data.rows.length + " responsáveis"
              : "Equipe do Orlean"}
          </span>
        </div>
      )}
      <div
        role="region"
        aria-label={"Metas por S/C — " + selected.name}
        aria-busy={loading}
      >
        {loading ? (
          <div className="sc-placeholder">
            Consultando os resultados dos S/C…
          </div>
        ) : data?.error ? (
          <div className="sc-placeholder">
            <strong>Consulta indisponível</strong>
            <p>{data.error}</p>
            <a href={selected.url} target="_blank" rel="noopener noreferrer">
              Abrir {selected.name} <ArrowUpRight size={13} />
            </a>
          </div>
        ) : (
          <>
            {(data?.day?.error || data?.month?.error) && (
              <p className="sc-warning">
                {data?.day?.error ? "Ontem: " + data?.day?.error + " " : ""}
                {data?.month?.error ? "Mês: " + data?.month?.error : ""}
              </p>
            )}
            <div
              className="sc-scroll"
              tabIndex={0}
              role="region"
              aria-label="Resultados por S/C, tabela com rolagem"
            >
              <table>
                <caption className="sr-only">
                  Resultados por responsável e período
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Responsável</th>
                    <th scope="col">
                      {kind === "1bd" || kind === "5cd" || kind === "csat"
                        ? "Referência D-2"
                        : "Ontem"}
                    </th>
                    <HistoryHeaders comparison={data?.comparison} csat={kind === 'csat'} />
                    <th scope="col">
                      {kind === "5cd"
                        ? "Média diária do mês"
                        : "Acumulado do mês"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.role + ":" + r.name}>
                      <th scope="row">
                        <span className="sc-name">{r.name}</span>
                        <span className="sc-role">{r.role}</span>
                      </th>
                      <td>
                        <Result
                          item={r.day}
                          goal={data?.day?.goal}
                          unit={selected.unit}
                          inverse={
                            kind === "shipping" || kind === "capotamento"
                          }
                          error={data?.day?.error}
                        />
                      </td>
                      {["previousDay", "previousWeek"].map((period) => (
                        <td key={period}>
                          <Result item={r[period]} goal={data?.day?.goal} unit={selected.unit} inverse={kind === "shipping" || kind === "capotamento"} />
                        </td>
                      ))}
                      <td>
                        <Result
                          item={r.month}
                          goal={monthGoal}
                          unit={selected.unit}
                          inverse={
                            kind === "shipping" || kind === "capotamento"
                          }
                          error={data?.month?.error}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <div className="sc-placeholder">
                {query
                  ? "Nenhum responsável corresponde à busca."
                  : "Nenhum S/C com dados disponível neste período."}
              </div>
            )}
            {data?.month?.note && (
              <p className="sc-footnote">{data.month.note}</p>
            )}
          </>
        )}
      </div>
      <p className="sc-footnote">
        {kind === "5cd"
          ? "Média por dia com relatório, incluindo zero para S/C sem ocorrências em um dia disponível. Sem meta fixa."
          : kind === "csat"
            ? "Avaliações positivas / todas as avaliações. Semana oficial pela coluna D; data diária pela coluna H. Sem meta definida."
          : kind === "1bd"
            ? "Taxa sobre todas as avaliações do período. Referência D-2."
            : kind === "shipping"
              ? "Média ponderada pelos pacotes de cada S/C, sem meta fixa."
              : "Metas do indicador aplicadas a cada S/C."}{" "}
        Quando a origem separa os cargos, cada função aparece em sua própria
        linha; os resultados de Coordenadores e Supervisores não devem ser
        somados. T0 e Shipping Time identificam o responsável apenas como S/C.
      </p>
    </section>
  );
}
