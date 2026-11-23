import assert from "node:assert/strict";
import { novemberKpiGroups, officialMonthlyGoal, metricWithMonthlyGoal } from "../lib/monthly-kpi-goals.js";
import { monthlyMetrics } from "../lib/monthly-series.js";

assert.deepEqual(novemberKpiGroups.map((g) => [g.id, g.rows.length]), [
  ["lm", 10],
  ["analistas", 7],
  ["sc", 8],
  ["dc", 6],
]);
for (const group of novemberKpiGroups) {
  const total = group.rows.reduce((acc, item) => acc + item.weight, 0);
  assert.equal(total, 100, group.name + ": pesos da meta devem somar 100%");
}
const lm = novemberKpiGroups.find((group) => group.id === "lm");
assert.equal(lm.rows.find((row) => row.name === "SLA").target, "97%");
assert.equal(lm.rows.find((row) => row.name === "1BD").target, "85%");
assert.equal(lm.rows.find((row) => row.name === "C2C").target, "30 × nº de bases");
assert.equal(lm.rows.find((row) => row.name === "Extravio").target, "400 PPM");
assert.equal(novemberKpiGroups.find((g) => g.id === "sc").rows.find((r) => r.name.startsWith("Shipping Time")).target, "15,5 h");
assert.equal(officialMonthlyGoal("1bd", "2026-11-01"), 85);
assert.equal(officialMonthlyGoal("1bd", "2026-10"), null);
assert.equal(officialMonthlyGoal("1bd", "2026-12"), null);
assert.equal(officialMonthlyGoal("sla", "2026-11"), null);
const oneBD = monthlyMetrics.find((m) => m.id === "1bd");
assert.equal(oneBD.goal, 80, "meta operacional original preservada");
assert.equal(metricWithMonthlyGoal(oneBD, "2026-11").goal, 85);
assert.equal(metricWithMonthlyGoal(oneBD, "2026-10").goal, 80);
assert.equal(monthlyMetrics.find((m) => m.id === "c2c").goal, 100);
console.log("KPI novembro: quatro grupos, pesos e substituição mensal de 1BD conferidos.");
