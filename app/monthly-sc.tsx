"use client";
import { useEffect, useRef, useState } from "react";
import { fetchJson } from "./client-data";
import { displayChange } from "../lib/display-change.js";
import { monthlyMetrics, combineMonthly } from "../lib/monthly-series.js";
type Metric = (typeof monthlyMetrics)[number];
const format = (value: number | null | undefined, m: Metric) =>
  value == null
    ? "—"
    : m.unit === "BRL"
      ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + m.unit;
const date = (s?: string) => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) : "—");
const status = (p: any, m: Metric) =>
  p?.value == null
    ? "Sem dados"
    : m.goal == null
      ? "Sem meta definida"
      : (m.up ? p.value >= m.goal : p.value <= m.goal)
        ? "Dentro da meta"
        : "Fora da meta";
const tone = (p: any, m: Metric) =>
  status(p, m) === "Dentro da meta"
    ? "good"
    : status(p, m) === "Fora da meta"
      ? "bad"
      : "neutral";
function Variation({ point, m }: { point: any; m: Metric }) {
  const change = point?.change;
  if (!change)
    return <span className="month-change neutral">Sem comparação diária</span>;
  const movement = change.amount,
    better = movement === 0 ? null : m.up ? movement > 0 : movement < 0;
  const text = displayChange(
    movement,
    m.unit === "%" ? "p.p." : m.unit === "BRL" ? "R$" : m.unit.trim(),
  );
  return (
    <span
      className={
        "month-change " + (better == null ? "neutral" : better ? "good" : "bad")
      }
    >
      {text}
      {change.relative != null && m.unit !== "%" ? (
        <span>Variação relativa: {displayChange(change.relative, "%")}</span>
      ) : null}
      <span>
        {movement === 0 ? "Estável" : better ? "Melhora" : "Piora"} vs.
        fechamento anterior
      </span>
    </span>
  );
}
export default function MonthlySc() {
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
  const [month, setMonth] = useState(currentMonth),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("sla");
  const [data, setData] = useState<Record<string, any>>({}),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0),
    [updated, setUpdated] = useState("");
  const [selection, setSelection] = useState<{
      key: string;
      kind: string;
    } | null>(null),
    detail = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const loadedMonth = useRef(month);
  function closeHistory() {
    setSelection(null);
    trigger.current?.focus();
  }
  useEffect(() => {
    const timer = setInterval(() => setRefresh((n) => n + 1), 300000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    if (loadedMonth.current !== month) {
      setData({});
      setUpdated("");
      loadedMonth.current = month;
    }
    // Workers consume their own queue; the table and future loads need the catalog intact.
    const queue = [...monthlyMetrics];
    async function worker() {
      while (queue.length && !abort.signal.aborted) {
        const metric = queue.shift()!;
        try {
          const result = await fetchJson(
            "/api/monthly?kind=" + metric.id + "&month=" + month,
            abort.signal,
          );
          if (!abort.signal.aborted)
            setData((old) => ({ ...old, [metric.id]: result }));
        } catch {
          if (!abort.signal.aborted)
            setData((old) => ({
              ...old,
              [metric.id]: { error: "Falha na conexão com a Central." },
            }));
        }
      }
    }
    Promise.all([worker(), worker(), worker()]).then(() => {
      if (!abort.signal.aborted) {
        setLoading(false);
        setUpdated(
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      }
    });
    return () => abort.abort();
  }, [month, refresh]);
  useEffect(() => {
    if (selection) {
      detail.current?.focus({ preventScroll: true });
      detail.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
  }, [selection]);
  const rows = combineMonthly(Object.values(data));
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const metric = monthlyMetrics.find((m) => m.id === sort)!;
  const shown = rows
    .filter((r: any) => normalize(r.name).includes(normalize(search)))
    .sort((a: any, b: any) => {
      const x = a.metrics[sort]?.current?.value,
        y = b.metrics[sort]?.current?.value;
      if (x == null && y != null) return 1;
      if (y == null && x != null) return -1;
      return x != null && y != null && x !== y
        ? metric.up
          ? x - y
          : y - x
        : a.name.localeCompare(b.name, "pt-BR");
    });
  let good = 0,
    bad = 0;
  for (const r of shown)
    for (const m of monthlyMetrics) {
      const s = status(r.metrics[m.id]?.current, m);
      good += Number(s === "Dentro da meta");
      bad += Number(s === "Fora da meta");
    }
  const errors = monthlyMetrics.filter((m) => data[m.id]?.error);
  const selectedPerson = rows.find((r: any) => r.key === selection?.key),
    selectedMetric = monthlyMetrics.find((m) => m.id === selection?.kind),
    selected = selection && selectedPerson?.metrics[selection.kind];
  return (
    <section className="monthly-view" aria-label="Visão mensal por S/C">
      <div className="month-banner">
        <div>
          <span>GESTÃO REGIONAL · ORLEAN</span>
          <h2>Metas e evolução mensal por S/C</h2>
          <p>O acumulado do mês, acompanhado a cada fechamento diário.</p>
        </div>
        <b>
          {month.slice(5)}/{month.slice(0, 4)}
        </b>
      </div>
      <div className="month-summary">
        <div>
          <small>S/C exibidos</small>
          <strong>{shown.length}</strong>
          <span>Responsáveis encontrados nas fontes</span>
        </div>
        <div>
          <small>Dentro da meta</small>
          <strong className="good">{good}</strong>
          <span>Resultados com meta definida</span>
        </div>
        <div>
          <small>Fora da meta</small>
          <strong className="bad">{bad}</strong>
          <span>Resultados que precisam de atenção</span>
        </div>
        <div>
          <small>Consultas concluídas</small>
          <strong>
            {Object.values(data).filter((r: any) => !r.error).length} / 11
          </strong>
          <span>
            {loading
              ? "Consultando indicadores…"
              : updated
                ? "Consulta às " + updated
                : "Aguardando consulta"}{" "}
            · CSAT pendente
          </span>
        </div>
      </div>
      <div className="month-controls">
        <label>
          Mês
          <input
            type="month"
            value={month}
            min="2000-01"
            max={currentMonth}
            onChange={(e) => {
              if (
                /^20\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value) &&
                e.target.value <= currentMonth
              ) {
                setMonth(e.target.value);
                setSelection(null);
              }
            }}
          />
        </label>
        <label>
          Buscar S/C
          <input
            type="search"
            placeholder="Nome do responsável"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Pior → melhor
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {monthlyMetrics
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <button onClick={() => setRefresh((n) => n + 1)} disabled={loading}>
          {loading ? "Atualizando…" : "Atualizar dados"}
        </button>
      </div>
      <p className="month-help">
        Todos os valores são mensais. As setas comparam o acumulado até uma data
        com o acumulado até o dia anterior. Clique em uma célula para ver todos
        os dias. Percentuais variam em pontos percentuais (p.p.).
      </p>
      {errors.length > 0 && (
        <p role="status" className="month-warning">
          Consulta indisponível: {errors.map((m) => m.name).join(", ")}. Os
          demais indicadores continuam disponíveis.
        </p>
      )}
      <div
        className="month-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabela mensal, role para ver todos os indicadores"
      >
        <table className="month-table">
          <caption className="sr-only">
            Acumulados mensais e metas por S/C
          </caption>
          <thead>
            <tr>
              <th scope="col">
                S/C<small>Nome do responsável</small>
              </th>
              {monthlyMetrics.map((m) => (
                <th
                  scope="col"
                  key={m.id}
                  aria-sort={
                    sort === m.id ? (m.up ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    onClick={() => setSort(m.id)}
                  >
                    {m.name}
                    {sort === m.id ? " ↓" : ""}
                  </button>
                  <small>
                    {m.goal == null
                      ? "Sem meta definida"
                      : "Meta " + (m.up ? "≥ " : "≤ ") + format(m.goal, m)}
                  </small>
                  <small>
                    {data[m.id]?.range
                      ? data[m.id].range.end < data[m.id].range.start
                        ? "Sem dia fechado"
                        : date(data[m.id].range.start) +
                          " – " +
                          date(data[m.id].range.end)
                      : loading
                          ? "Consultando…"
                          : "Sem dados"}
                  </small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r: any) => (
              <tr key={r.key}>
                <th scope="row">
                  {r.name}
                  <small>
                    {r.roles
                      .filter((role: string) => role !== "S/C")
                      .join(" / ") || "S/C"}
                  </small>
                </th>
                {monthlyMetrics.map((m) => {
                  const record = r.metrics[m.id],
                    p = record?.current;
                  return (
                    <td key={m.id}>
                      <button
                        className={"month-cell " + tone(p, m)}
                        onClick={(event) => {
                          trigger.current = event.currentTarget;
                          setSelection({ key: r.key, kind: m.id });
                        }}
                        aria-label={
                          r.name + ", " + m.name + ", " + format(p?.value, m)
                        }
                      >
                        <strong>{format(p?.value, m)}</strong>
                        <span>
                          {record?.conflict
                            ? "Responsável ambíguo"
                            : data[m.id]?.error
                              ? "Consulta indisponível"
                              : !data[m.id]
                                ? loading
                                  ? "Consultando…"
                                  : "Sem dados"
                                : status(p, m)}
                        </span>
                        {p?.value != null && (
                          <>
                            <Variation point={p} m={m} />
                            {m.unit === "BRL" && (
                              <small>{p.count} ocorrências finalizadas</small>
                            )}
                            {m.id === "csat" && p.count != null && (
                              <small>{Number(p.positives).toLocaleString("pt-BR")} positivas · {Number(p.negatives).toLocaleString("pt-BR")} negativas</small>
                            )}
                            {p.q10 != null && (
                              <small>
                                {p.q10.toLocaleString("pt-BR")} acima de 10 dias
                              </small>
                            )}
                            <small>
                              {p.observed
                                ? "Dados em " + date(p.date)
                                : "Sem novo dado · último " +
                                  date(p.lastObserved)}
                            </small>
                          </>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={13} className="month-empty">
                  {loading
                    ? "Carregando os responsáveis…"
                    : errors.length === 11
                      ? "Não foi possível carregar as fontes. Tente atualizar."
                      : search
                        ? "Nenhum S/C encontrado para esta busca."
                        : "Nenhum S/C com dados neste mês."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="month-help">
        Verde = dentro da meta / melhora · Vermelho = fora da meta / piora ·
        Cinza = sem meta, sem comparação ou sem dados. Os totais de atingimento
        contam células, não somam volumes entre funções.
      </p>
      {selection && selectedMetric && (
        <section
          className="month-detail"
          tabIndex={-1}
          ref={detail}
          aria-label="Histórico diário do acumulado"
        >
          <div className="month-detail-head">
            <div>
              <h3>
                {selectedPerson?.name} · {selectedMetric.name}
              </h3>
              <p>{selectedMetric.note}</p>
            </div>
            <button onClick={closeHistory}>Fechar histórico</button>
          </div>
          {selected?.conflict ? (
            <p>
              Este nome aparece em mais de uma função na mesma fonte. Os valores
              não foram somados para evitar duplicidade.
            </p>
          ) : selected?.history ? (
            <div
              className="month-scroll"
              role="region"
              tabIndex={0}
              aria-label="Histórico diário, tabela com rolagem"
            >
              <table className="month-history">
                <caption className="sr-only">
                  Histórico diário do acumulado mensal
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Fechamento</th>
                    <th scope="col">Acumulado do mês</th>
                    <th scope="col">Meta</th>
                    <th scope="col">Variação diária do acumulado</th>
                    <th scope="col">Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.history.map((p: any) => (
                    <tr key={p.date}>
                      <th scope="row">{date(p.date)}</th>
                      <td>
                        <b>{format(p.value, selectedMetric)}</b>
                        {selectedMetric.unit === "BRL" && p.value != null && (
                          <small>
                            {p.count} ocorrências · {p.reviewCount || 0} em
                            conferência
                          </small>
                        )}
                      </td>
                      <td className={tone(p, selectedMetric)}>
                        {status(p, selectedMetric)}
                      </td>
                      <td>
                        <Variation point={p} m={selectedMetric} />
                      </td>
                      <td>
                        {p.observed
                          ? "Com registros"
                          : "Sem novo dado neste dia"}
                        {!p.observed && p.lastObserved && (
                          <small>
                            Acumulado mantido até {date(p.lastObserved)}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>
              {data[selectedMetric.id]?.error ||
                "Sem dados disponíveis para este S/C e indicador no mês."}
            </p>
          )}
        </section>
      )}
      <details className="month-rules calculation-notes">
        <summary>Regras e disponibilidade dos indicadores</summary>
        <p>
          A aba mantém as regras de cálculo vigentes na Central. O mês atual vai
          até D-1; 1BD e 5CD vão até D-2. Meses anteriores usam o mês completo,
          respeitando essa defasagem. Atualização automática a cada 5 minutos.
        </p>
        <p>
          Dias sem registros não são tratados como zero: o último acumulado é
          mantido com a data explícita, e a variação fica sem comparação.
          Ausência de registro em fontes de ocorrências não comprova ausência de
          ocorrências.
        </p>
        <ul>
          {monthlyMetrics.map((m) => (
            <li key={m.id}>
              <b>{m.name}:</b> {m.note}
            </li>
          ))}
        </ul>
        <p>
          Os nomes completos são conciliados entre fontes ignorando acentos,
          caixa e espaços. Quando há duas funções para o mesmo nome na mesma
          fonte, a célula é sinalizada como ambígua. Darley permanece excluído.
          Não há pontuação.
        </p>
      </details>
    </section>
  );
}
