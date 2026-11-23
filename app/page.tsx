"use client";
import { useEffect, useState } from "react";
import { fetchJson } from "./client-data";
import { displayChange } from "../lib/display-change.js";
import { ClaimsTiles } from "./claims-view";
import ScSection from "./sc-section";
import MonthlySc from "./monthly-sc";
import { officialMonthlyGoal } from "../lib/monthly-kpi-goals.js";
import {
  ArrowUpRight,
  ArrowRight,
  RefreshCw,
  LayoutGrid,
  Target,
  Clock3,
  ShieldAlert,
  PackageCheck,
  Truck,
  ChevronDown,
  Activity,
} from "lucide-react";
const panels = [
  {
    id: "sla",
    title: "SLA – Regional",
    label: "Entregas dentro do prazo",
    icon: PackageCheck,
    url: "https://jandt-sla-dashboard.onrender.com/",
    unit: "%",
    note: "Meta diária ≥ 95% · mensal ≥ 97%",
  },
  {
    id: "t0",
    title: "T0 – Regional",
    label: "Entregas no mesmo dia",
    icon: Target,
    url: "https://j-t-t0.onrender.com/",
    unit: "%",
    note: "Meta ≥ 70% · quanto maior, melhor",
  },
  {
    id: "shipping",
    title: "Shipping Time",
    label: "Tempo médio · etapas 6, 7 e 8",
    icon: Truck,
    url: "https://j-t-shippingtime.onrender.com/",
    unit: "h",
    note: "Média em horas · quanto menor, melhor · sem meta fixa",
  },
  {
    id: "capotamento",
    title: "Capotamento",
    label: "Bases em alerta ou capotadas",
    icon: ShieldAlert,
    url: "https://j-t-capotamento.onrender.com/",
    unit: "%",
    note: "Meta da central: 0% em alerta ou capotadas",
  },
  {
    id: "sem_mov",
    title: "Sem Movimentação",
    label: "Pacotes sem movimentação",
    icon: Clock3,
    url: "https://j-t-semmov-and-retidos.onrender.com/?indicador=sem_mov",
    unit: "pct",
    note: "Acima de 10 dias também entra no corte de 3 dias. Os períodos somam os registros diários.",
  },
  {
    id: "retidos",
    title: "Retidos",
    label: "Pacotes retidos na base",
    icon: PackageCheck,
    url: "https://j-t-semmov-and-retidos.onrender.com/?indicador=retidos",
    unit: "pct",
    note: "Acima de 10 dias também entra no corte de 3 dias. Os períodos somam os registros diários.",
  },
  {
    id: "1bd",
    title: "1BD",
    label: "Entregas concluídas · Qualidade TikTok",
    icon: Target,
    url: "https://j-t-1bd-5cd-csat.onrender.com/",
    unit: "%",
    note: "Referência D-2 · meta diária ≥ 80% · avaliações concluídas / total de avaliações",
  },
  {
    id: "5cd",
    title: "5CD",
    label: "Remessas em aberto · Qualidade TikTok",
    icon: PackageCheck,
    url: "https://j-t-1bd-5cd-csat.onrender.com/",
    unit: " remessas",
    note: "Referência D-2 · menor é melhor · semana e mês exibem média por dia com relatório, sem meta fixa",
  },
  {
    id: "csat",
    title: "CSAT",
    label: "Satisfação do cliente · avaliações TikTok",
    icon: Target,
    url: "https://j-t-1bd-5cd-csat.onrender.com/",
    unit: "%",
    note: "Referência D-2 · avaliações positivas / total · semana oficial da coluna D · sem meta definida",
  },
  {
    id: "avaria",
    title: "Avaria",
    label: "Ocorrências finalizadas · valor e quantidade",
    icon: ShieldAlert,
    url: "https://j-t-avaria-extravio-pnr.onrender.com/?indicador=Avaria",
    unit: "BRL",
    note: "Sem meta fixa · fechamento do ticket · semana e mês parciais até hoje. Revogados e apelações em conferência.",
  },
  {
    id: "extravio",
    title: "Extravio",
    label: "Ocorrências finalizadas · valor e quantidade",
    icon: ShieldAlert,
    url: "https://j-t-avaria-extravio-pnr.onrender.com/?indicador=Extravio",
    unit: "BRL",
    note: "Sem meta fixa · fechamento do ticket · semana e mês parciais até hoje. Revogados e apelações em conferência.",
  },
  {
    id: "pnr",
    title: "PNR",
    label: "Ocorrências finalizadas · valor e quantidade",
    icon: ShieldAlert,
    url: "https://j-t-avaria-extravio-pnr.onrender.com/?indicador=PNR",
    unit: "BRL",
    note: "Sem meta fixa · fechamento do ticket · semana e mês parciais até hoje. Revogados e apelações em conferência.",
  },
  {
    id: "c2c", title: "C2C", label: "Atingimento da meta de captação", icon: PackageCheck,
    url: "https://c2c-e9f0.onrender.com/", unit: "%",
    note: "Meta mensal: 30 pacotes por base ativa · dia e semana: 1 por base/dia até o dia 30 · 100% = meta atingida",
  },
];
const fmt = (n: number) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
const date = (s: string) => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) : "—");
function Metric({
  data,
  unit,
  inverse,
}: {
  data: any;
  unit: string;
  inverse: boolean;
}) {
  const has = typeof data?.value === "number" && Number.isFinite(data.value);
  const status =
    has && typeof data.goal === "number"
      ? inverse
        ? data.value <= data.goal
        : data.value >= data.goal
      : null;
  return (
    <>
      <div
        className={
          "number " + (status === true ? "good" : status === false ? "bad" : "")
        }
      >
        {has ? fmt(data.value) : "—"}
        <span>{has ? unit : ""}</span>
      </div>
      <div
        className={
          "state " +
          (status === true ? "green" : status === false ? "red" : "neutral")
        }
      >
        {!data
          ? "Consultando…"
          : !has
            ? data.message || "Sem dados no período"
            : status === true
              ? "● Dentro da meta"
              : status === false
                ? "● Fora da meta"
                : data.info || "● Sem meta cadastrada"}
      </div>
      {has && data.target !== undefined && (<small>Meta: {data.target.toLocaleString("pt-BR")} pacotes · {data.bases} bases ativas</small>)}
      {has && data.positives !== undefined && (
        <small>{Number(data.positives).toLocaleString('pt-BR')} positivas · {Number(data.negatives).toLocaleString('pt-BR')} negativas</small>
      )}
      {has && data.alerts !== undefined && (
        <small className="cap-counts">
          {data.alerts} em alerta · {data.cap} capotadas
        </small>
      )}
      {has && (
        <small>
          {data.count?.toLocaleString("pt-BR")}{" "}
          {data.countLabel ||
            (data.cap !== undefined ? "registros de bases" : "pacotes")}
          {data.available !== undefined
            ? " · " + data.available + "/" + data.expected + " dias com dados"
            : ""}
        </small>
      )}
    </>
  );
}
type Sample = {
  from: string;
  to: string;
  value: number | null;
  days: number;
  elapsed?: number;
  weekId?: string;
};
function Change({
  current,
  previous,
  unit,
}: {
  current?: number | null;
  previous?: number | null;
  unit: string;
}) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  return (
    <small className="metric-change">
      {displayChange(
        diff,
        unit === "h" ? "h" : unit === "%" ? "p.p." : "remessas",
      )}{" "}
      vs. anterior
    </small>
  );
}
function HistoryTile({
  label,
  sample,
  unit,
  previous,
}: {
  label: string;
  sample: Sample;
  unit: string;
  previous?: Sample;
}) {
  const single = sample.from === sample.to && sample.elapsed === undefined && !sample.weekId;
  return (
    <div className="period-tile">
      <span className="period-label">{label}</span>
      <small>
        {sample.weekId ? "Semana oficial " + sample.weekId : sample.elapsed === 0
          ? "A partir de " + date(sample.from)
          : single
            ? date(sample.to)
            : date(sample.from) + " – " + date(sample.to)}
      </small>
      <div className="number">
        {sample.value == null ? "—" : fmt(sample.value)}
        {sample.value != null && <span>{unit}</span>}
      </div>
      {sample.value == null && <small>Sem dados</small>}
      {!single && !sample.weekId && (
        <small>
          {sample.elapsed === 0
            ? "Aguardando o primeiro dia fechado"
            : sample.days + "/" + (sample.elapsed ?? 7) + " dias com dados"}
        </small>
      )}
      <Change current={sample.value} previous={previous?.value} unit={unit} />
    </div>
  );
}
function AgingTiles({ data }: { data: any }) {
  const c = data?.comparison;
  return (
    <div className="period-grid">
      {[
        ["Ontem", data?.day],
        ["Mesmo dia na semana passada", c?.previousDay],
        ["Semana atual até ontem", c?.week],
        ["Semana passada · seg a dom", c?.previousWeek],
        ["Acumulado do mês", data?.month],
      ].map(([label, item]) => (
        <div
          key={label}
          className={
            "period-tile" + (label === "Acumulado do mês" ? " monthly" : "")
          }
        >
          <span className="period-label">{label}</span>
          <small>
            {item?.expected > 0
              ? item.from === item.to
                ? date(item.to)
                : date(item.from) + " – " + date(item.to)
              : ""}
          </small>
          {item?.value != null ? (
            <>
              <strong>{item.value.toLocaleString("pt-BR")}</strong> acima de 3
              dias
              <br />
              <strong>{item.q10.toLocaleString("pt-BR")}</strong> acima de 10
              dias
              <small>
                {item.days}/{item.expected} dias com dados
              </small>
            </>
          ) : (
            <small>{data ? "Sem dados no período" : "Consultando…"}</small>
          )}
        </div>
      ))}
    </div>
  );
}
export default function Home() {
  const [view, setView] = useState("indicators");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((v) => v + 1);
  useEffect(() => {
    if (view !== "indicators") return;
    const timer = setInterval(refresh, 300000);
    return () => clearInterval(timer);
  }, [view]);
  useEffect(() => {
    if (view !== "indicators") return;
    // Indicadores de qualidade mudam apos importacoes operacionais: revalidar
    // apenas estes tres cards a cada minuto, sem recalcular todos os outros.
    const abort = new AbortController();
    let running = false;
    const timer = setInterval(async () => {
      if (running || abort.signal.aborted) return;
      running = true;
      try {
        await Promise.all(["1bd", "5cd", "csat"].map(async (kind) => {
          try {
            const result = await fetchJson("/api/indicator?kind=" + kind, abort.signal);
            if (!abort.signal.aborted) setData((old) => ({ ...old, [kind]: result }));
          } catch {
            // Preserva o ultimo resultado ate a proxima consulta bem-sucedida.
          }
        }));
      } finally {
        running = false;
      }
    }, 60000);
    return () => { clearInterval(timer); abort.abort(); };
  }, [view]);
  useEffect(() => {
    if (view !== "indicators") return;
    const abort = new AbortController();
    setLoading(true);
    const queue = [...panels];
    async function worker() {
      while (queue.length && !abort.signal.aborted) {
        const p = queue.shift()!;
        try {
          const d = await fetchJson(
            "/api/indicator?kind=" + p.id,
            abort.signal,
          );
          if (!abort.signal.aborted) setData((old) => ({ ...old, [p.id]: d }));
        } catch {
          if (!abort.signal.aborted)
            setData((old) => ({
              ...old,
              [p.id]: {
                error:
                  "Não foi possível consultar este indicador. Tente atualizar.",
              },
            }));
        }
      }
    }
    Promise.all([worker(), worker(), worker()]).then(() => {
      if (!abort.signal.aborted) {
        setUpdated(
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          }),
        );
        setLoading(false);
      }
    });
    return () => abort.abort();
  }, [view, revision]);
  function switchTab(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "indicators"
        : event.key === "End"
          ? "monthly"
          : view === "indicators"
            ? "monthly"
            : "indicators";
    setView(next);
    document.getElementById("tab-" + next)?.focus();
  }
  const period = Object.values(data).find((x: any) => x.periods)?.periods;
  const success = Object.values(data).filter(
    (x: any) => typeof x.day?.value === "number",
  ).length;
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside className="app-sidebar" aria-label="Navegação regional">
        <a className="brand" href="/">
          J&T<span>EXPRESS</span>
        </a>
        <div className="side-label">GESTÃO REGIONAL</div>
        <nav aria-label="Principal">
          <a className="nav-active" href="#main-content" aria-current="page">
            <LayoutGrid size={19} aria-hidden="true" />
            Central de indicadores
          </a>
        </nav>
        <div className="side-bottom">
          <span className="avatar">OR</span>
          <div>
            Orlean<small>Visão do responsável</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <a
            className="brand mobile-brand"
            href="/"
            aria-label="J&T Express — início"
          >
            J&T<span>EXPRESS</span>
          </a>
          <span className="breadcrumb">
            <span className="crumb">Regional</span>
            <span className="slash">/</span>Central de indicadores
          </span>
          <div className="profile">OR</div>
        </header>
        <main className="app-main" id="main-content" tabIndex={-1}>
          <div className="eyebrow">
            <span /> PERFORMANCE OPERACIONAL
          </div>
          <div className="heading">
            <div>
              <h1>Central de Indicadores</h1>
              <p>
                Os resultados mais recentes. A visão do mês. Tudo em um só
                lugar.
              </p>
            </div>
            {view === "indicators" && (
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                aria-label="Atualizar indicadores"
                aria-busy={loading}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                {loading ? "Atualizando" : "Atualizar"}
              </button>
            )}
          </div>
          <div
            className="central-tabs"
            role="tablist"
            aria-label="Visualização da Central"
          >
            {[
              { id: "indicators", label: "Indicadores" },
              { id: "monthly", label: "Mensal por S/C" },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                id={"tab-" + tab.id}
                role="tab"
                aria-selected={view === tab.id}
                aria-controls={"panel-" + tab.id}
                tabIndex={view === tab.id ? 0 : -1}
                onKeyDown={switchTab}
                onClick={() => setView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            id="panel-monthly"
            role="tabpanel"
            aria-labelledby="tab-monthly"
            hidden={view !== "monthly"}
          >
            {view === "monthly" && <MonthlySc />}
          </div>
          <div
            id="panel-indicators"
            role="tabpanel"
            aria-labelledby="tab-indicators"
            hidden={view !== "indicators"}
          >
            {view === "indicators" && (
              <>
                <div className="toolbar">
                  <div className="filter">
                    <span className="avatar small">OR</span>
                    <span>
                      Responsável <strong>Orlean</strong>
                    </span>
                  </div>
                  <div className="period">
                    <Clock3 size={16} />
                    <span>
                      {period
                        ? "Ontem, " +
                          date(period.yesterday) +
                          " · Mês até " +
                          date(period.end)
                        : "Ontem e mês até o último dia fechado"}
                    </span>
                  </div>
                  <span className="update">
                    {updated ? "Consulta às " + updated : "Consultando fontes"}
                  </span>
                </div>
                <section aria-labelledby="indicators-title">
                  <div className="section-title">
                    <h2 id="indicators-title">
                      Seus indicadores{" "}
                      <span>{String(panels.length).padStart(2, "0")}</span>
                    </h2>
                    <span role="status">
                      <Activity size={14} aria-hidden="true" />
                      {loading
                        ? "Carregando resultados"
                        : success +
                          " de " +
                          panels.length +
                          " com registros na referência"}
                    </span>
                  </div>
                  <div className="indicator-grid">
                    {panels.map((p, i) => {
                      const d = data[p.id];
                      const Icon = p.icon;
                      return (
                        <article
                          key={p.id}
                          aria-labelledby={"title-" + p.id}
                          className={
                            "indicator-card" +
                            (expanded[p.id] ? " card-expanded" : "")
                          }
                        >
                          <div className="card-head">
                            <div className="icon">
                              <Icon size={23} />
                            </div>
                            <span className="card-index">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <h3 id={"title-" + p.id}>{p.title}</h3>
                          <p className="subtitle">{p.label}</p>
                          {d?.error ? (
                            <div className="error">
                              <strong>Resultado indisponível</strong>
                              <p>{d.error}</p>
                              <span>
                                O acesso ao indicador continua disponível.
                              </span>
                            </div>
                          ) : p.unit === "BRL" ? (
                            <ClaimsTiles data={d} />
                          ) : p.unit === "pct" ? (
                            <AgingTiles data={d} />
                          ) : (
                            <div className="period-grid">
                              <div className="period-tile">
                                <span className="period-label">
                                  {p.id === "1bd" || p.id === "5cd" || p.id === "csat"
                                    ? "Referência D-2"
                                    : "Ontem"}{" "}
                                  {d?.periods && date(d.periods.yesterday)}
                                </span>
                                <Metric
                                  data={d?.day}
                                  unit={p.unit}
                                  inverse={
                                    p.id === "shipping" ||
                                    p.id === "capotamento"
                                  }
                                />
                                <Change
                                  current={d?.day?.value}
                                  previous={d?.comparison?.previousDay?.value}
                                  unit={p.unit}
                                />
                              </div>
                              {d?.comparison && (
                                <>
                                  <HistoryTile
                                    label="Mesmo dia na semana passada"
                                    sample={d.comparison.previousDay}
                                    unit={p.unit}
                                  />
                                  <HistoryTile
                                    label={
                                      p.id === "csat"
                                        ? "Última semana oficial"
                                        : p.id === "1bd" || p.id === "5cd"
                                        ? "Semana até D-2"
                                        : "Semana atual até ontem"
                                    }
                                    sample={d.comparison.week}
                                    previous={d.comparison.previousWeek}
                                    unit={p.unit}
                                  />
                                  <HistoryTile
                                    label={p.id === "csat" ? "Semana oficial anterior" : "Semana passada · seg a dom"}
                                    sample={d.comparison.previousWeek}
                                    unit={p.unit}
                                  />
                                </>
                              )}
                              <div className="period-tile monthly">
                                <span className="period-label">
                                  {p.id === "5cd"
                                    ? "Média diária do mês"
                                    : "Acumulado do mês"}
                                </span>
                                <Metric
                                  data={
                                    p.id === "1bd" && d?.month && d?.periods?.start
                                      ? {
                                          ...d.month,
                                          goal: officialMonthlyGoal("1bd", d.periods.start) ?? d.month.goal,
                                        }
                                      : d?.month
                                  }
                                  unit={p.unit}
                                  inverse={
                                    p.id === "shipping" ||
                                    p.id === "capotamento"
                                  }
                                />
                              </div>
                            </div>
                          )}
                          <div className="goal">
                            <Target size={13} />
                            {p.id === "1bd" && d?.periods?.start?.slice(0, 7) === "2026-11"
                              ? p.note + " · meta mensal KPI GP-PA ≥ 85% (mínimo 80%)"
                              : p.note}
                          </div>
                          <div className="card-actions">
                            <a
                              className="open"
                              aria-label={
                                "Abrir " + p.title + " em uma nova aba"
                              }
                              href={p.url || undefined}
                              aria-disabled={!p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span>
                                {p.url
                                  ? "Abrir indicador"
                                  : "Link do painel pendente"}
                              </span>
                              <ArrowUpRight size={17} />
                            </a>
                            <button
                              type="button"
                              className="expand-sc"
                              aria-label={
                                (expanded[p.id] ? "Recolher" : "Expandir") +
                                " resultados por S/C de " +
                                p.title
                              }
                              aria-expanded={!!expanded[p.id]}
                              aria-controls={"sc-" + p.id}
                              onClick={() =>
                                setExpanded((old) => ({
                                  ...old,
                                  [p.id]: !old[p.id],
                                }))
                              }
                            >
                              <span>
                                {expanded[p.id]
                                  ? "Recolher S/C"
                                  : p.unit === "BRL"
                                    ? "Valores por S/C"
                                    : p.id === "5cd"
                                      ? "Remessas por S/C"
                                      : p.unit === "pct"
                                        ? "Pacotes por S/C"
                                        : p.id === "shipping"
                                          ? "Tempos por S/C"
                                          : "Metas por S/C"}
                              </span>
                              <ChevronDown
                                size={16}
                                className={expanded[p.id] ? "rotated" : ""}
                              />
                            </button>
                          </div>
                          <div id={"sc-" + p.id} hidden={!expanded[p.id]}>
                            {expanded[p.id] && <ScSection kind={p.id} />}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
                <section
                  className="information"
                  aria-labelledby="information-title"
                >
                  <div className="info-icon">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <h2 id="information-title">
                      Uma visão rápida para decidir onde olhar.
                    </h2>
                    <p>
                      Os cards atualizam a cada 5 minutos. Qualidade 1BD, 5CD e CSAT
                      usam D-2; Avaria, Extravio e PNR incluem a semana e o mês
                      até hoje. Os demais indicadores usam ontem. Abra o
                      indicador para explorar bases, equipes e detalhes.
                    </p>
                  </div>
                  <ArrowRight size={20} aria-hidden="true" />
                </section>
                <details className="calculation-notes">
                  <summary>Como os resultados são calculados</summary>
                  <p>
                    <b>SLA e T0:</b> resultado sobre o total de pacotes do
                    período, sem média simples dos percentuais diários.{" "}
                    <b>Shipping Time:</b> média em horas ponderada pelos
                    pacotes, somando as etapas 6 a 8; sem meta fixa ou
                    classificação de atingimento. O recorte do Orlean usa os
                    códigos de bases presentes no SLA do mesmo período.
                  </p>
                  <p>
                    <b>Capotamento:</b> bases com status ALERTA ou CAPOTADA ÷
                    registros de bases, com meta de 0% definida na central. Cada
                    registro entra uma única vez no cálculo. Pré-alerta e
                    monitoramento não entram nesse percentual. No mês, soma
                    desses registros em cada dia ÷ soma dos registros de bases
                    diários; uma base pode aparecer em vários dias. Não é a
                    porcentagem de bases únicas do mês. Dias sem registros são
                    indicados na cobertura.
                  </p>
                  <p>
                    <b>Qualidade 1BD e 5CD:</b> referência D-2 no horário de
                    Brasília, com mês e semanas relativos a essa data. 1BD é o
                    percentual de avaliações concluídas, ponderado pelo volume.
                    5CD é o volume em aberto no dia e a média dos volumes
                    diários disponíveis na semana e no mês. Dias sem relatório
                    não entram como zero.
                  </p>
                  <p>
                    Datas no horário de Brasília. O mês vai do dia 1 até ontem;
                    no primeiro dia do mês, o acumulado fica sem dia fechado.
                    Ausência de dados nunca é exibida como 0%. O filtro é
                    aplicado apenas quando há um único cadastro correspondente a
                    Orlean.
                  </p>
                </details>
              </>
            )}
          </div>
          <footer className="app-footer">
            <span>
              J&T EXPRESS <b> / </b> GESTÃO REGIONAL
            </span>
            <span>Central de Indicadores · Orlean</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
