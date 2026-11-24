// Fonte: "KPI – GP-PA - Novembro 2026", abas LM, Analistas, SC e DC.
// Apenas critérios operacionais: dados pessoais e remunerações foram excluídos.
// As metas são referências do mês; nenhum escore é calculado automaticamente.
const row = (name, target, minimum, weight, minimumWeight, observation = "") =>
  ({ name, target, minimum, weight, minimumWeight, observation });

export const novemberKpiGroups = [
  {
    id: "lm",
    name: "Gestores, Líderes e Assist LM",
    description: "Critérios mensais da gestão de last mile",
    rows: [
      row("SLA", "97%", "93%", 20, 10, "Entregas realizadas dentro do prazo"),
      row("PNR", "22", "27", 10, 5, "Considerando ticket aberto; unidade não especificada na planilha"),
      row("Extravio", "400 PPM", "500 PPM", 10, 5, "Arbitragem finalizada no mês"),
      row("Avaria", "20 PPM", "24 PPM", 10, 5, "Arbitragem finalizada no mês"),
      row("C2C", "30 × nº de bases", "20 × nº de bases", 10, 5, "Quantidade de pedidos mensais multiplicada pela quantidade de bases"),
      row("Redução de custo de coleta por pacote", "−R$ 0,10", "−R$ 0,05", 10, 5, "Redução em comparação com o mês anterior"),
      row("Redução de custo de entrega por pacote", "−R$ 0,10", "−R$ 0,05", 10, 5, "Redução em comparação com o mês anterior"),
      row("1BD", "85%", "80%", 10, 5, "Entregas realizadas dentro do prazo"),
      row("Sem Movimentação ≥ 3 dias (DC/CD)", "5%", "6%", 5, 2.5, "Pedidos com mais de 3 dias sem movimentação"),
      row("Pedidos Retidos ≥ 3 dias", "3%", "7%", 5, 2.5, "Pedidos vencidos há mais de 3 dias"),
    ],
  },
  {
    id: "analistas",
    name: "Analistas",
    description: "Critérios mensais da equipe de analistas",
    rows: [
      row("SLA", "97%", "93%", 20, 10, "Entregas realizadas dentro do prazo"),
      row("PNR", "22", "27", 15, 7.5, "Considerando ticket aberto; unidade não especificada na planilha"),
      row("Extravio", "400 PPM", "500 PPM", 15, 7.5, "Arbitragem finalizada no mês"),
      row("Avaria", "20 PPM", "24 PPM", 15, 7.5, "Arbitragem finalizada no mês"),
      row("1BD", "85%", "80%", 15, 7.5, "Entregas realizadas dentro do prazo"),
      row("Sem Movimentação ≥ 3 dias (DC/CD)", "5%", "6%", 10, 5, "Pedidos com mais de 3 dias sem movimentação"),
      row("Pedidos Retidos ≥ 3 dias", "3%", "7%", 10, 5, "Pedidos vencidos há mais de 3 dias"),
    ],
  },
  {
    id: "sc",
    name: "SC",
    description: "Projeto regular 70% · indicadores específicos das estações SC",
    rows: [
      row("Taxa de Expedição SC → HUB", "95%", "93%", 20, 10, "JMS: expedição no prazo SC → HUB"),
      row("Taxa de Expedição SC → SC", "95%", "94%", 20, 10, "JMS: expedição no prazo SC → SC (novo)"),
      row("Taxa de envio errado SC → SC", "0,9%", "1%", 10, 5, "JMS: taxa de triagem errada"),
      row("Extravio (SC/DC)", "400 PPM", "450 PPM", 10, 5, "JMS: relatório de taxa de extravio"),
      row("Avaria (SC/DC)", "81 PPM", "90 PPM", 10, 5, "JMS: relatório de taxa de avaria"),
      row("Sem Movimentação ≥ 3 dias (SC/DC)", "1,2%", "1,4%", 10, 5, "Resultado mensal ÷ volume de coleta e entrega do mês; sem scan de expedição"),
      row("Shipping Time · chegada à SC → expedição", "15,5 h", "16,5 h", 10, 5, "Etapa específica da estação SC, não soma das etapas 6, 7 e 8"),
      row("Pontualidade da linha secundária", "95%", "93%", 10, 5, "JMS: pontualidade no transporte de linha secundária"),
    ],
  },
  {
    id: "dc",
    name: "DC",
    description: "Projeto regular 100% · indicadores específicos das estações DC",
    rows: [
      row("Taxa de Expedição HUB → PDD", "95%", "93%", 20, 10, "JMS: expedição no prazo HUB → PDD"),
      row("Extravio (DC)", "400 PPM", "450 PPM", 10, 5, "JMS: relatório de taxa de extravio"),
      row("Avaria (DC)", "81 PPM", "90 PPM", 20, 10, "JMS: relatório de taxa de avaria"),
      row("Sem Movimentação ≥ 3 dias (DC)", "1,2%", "1,4%", 20, 10, "Resultado mensal ÷ volume de coleta e entrega do mês; sem scan de expedição"),
      row("Shipping Time · chegada à DC → expedição", "15,5 h", "16,5 h", 20, 10, "Etapa específica da estação DC, não soma das etapas 6, 7 e 8"),
      row("Pontualidade da linha secundária", "95%", "93%", 10, 5, "JMS: pontualidade no transporte de linha secundária"),
    ],
  },
];

// O único ajuste numérico compatível com a métrica percentual mensal já existente
// é 1BD. Os demais KPIs de referência ainda precisam de medida com a mesma
// unidade e metodologia (por exemplo PPM, custos, % de retidos e sem movimento).
export const monthlyGoalOverrides = {
  "2026-11": { "1bd": 85 },
};

export function officialMonthlyGoal(kind, dateOrMonth) {
  const month = String(dateOrMonth || "").slice(0, 7);
  return monthlyGoalOverrides[month]?.[kind] ?? null;
}
export function metricWithMonthlyGoal(metric, month) {
  const official = officialMonthlyGoal(metric.id, month);
  return official == null
    ? metric
    : {
        ...metric,
        goal: official,
        minimum: 80,
        note: metric.note + " Meta do KPI GP-PA de novembro/2026: 85% (mínimo 80%); cálculo atual preservado, sujeito à conferência da metodologia.",
      };
}
