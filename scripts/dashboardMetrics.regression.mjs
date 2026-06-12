import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = new URL('../src/lib/dashboardMetrics.ts', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8')
  .replace(/^import .+;\r?\n/gm, '')
  .replace(/^export type FormulaMetricValues = .+;\r?\n/gm, '')
  .replace(/export function /g, 'function ');

const compiled = ts.transpileModule(
  `${source}\nglobalThis.__dashboardMetricsTest = { buildFormulaMetricValues };`,
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const context = {
  buildMetricValue(current, previous, sparkline) {
    const delta = current - previous;
    return {
      current,
      previous,
      delta,
      deltaPercent: previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0,
      trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
      sparkline,
    };
  },
  formatCurrency(value) {
    return String(value);
  },
  formatNumber(value) {
    return String(value);
  },
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(compiled, context, { filename: 'dashboardMetrics.ts' });

const { buildFormulaMetricValues } = context.__dashboardMetricsTest;

const direct = buildFormulaMetricValues(
  {
    realisation: 5_246_057,
    profit: 778_610.31,
    profitWithoutExpense: 807_253.31,
    operatingExpenses: 28_643,
    profitability: 14.84,
    marginalityWithoutExpense: 15.39,
  },
  {
    profit: { previous: 700_000 },
    profitWithoutExpense: { previous: 725_000 },
    operatingExpenses: { previous: 25_000 },
    marginalityWithoutExpense: { previous: 14.5 },
  }
);

assert.equal(direct.profit.current, 778_610.31);
assert.equal(direct.profitWithoutExpense.current, 807_253.31);
assert.equal(direct.profitWithoutExpense.previous, 725_000);
assert.equal(direct.operatingExpenses.current, 28_643);
assert.equal(direct.expense.current, 28_643);
assert.equal(direct.marginalityWithoutExpense.current, 15.39);
assert.notEqual(direct.profitWithoutExpense.current, direct.profit.current);
assert.notEqual(direct.marginalityWithoutExpense.current, direct.profitability.current);

const fallback = buildFormulaMetricValues(
  {
    realisation: 1_000,
    profit: 900,
    operatingExpenses: 100,
    profitability: 90,
  },
  {
    realisation: { previous: 800 },
    profit: { previous: 700 },
    operatingExpenses: { previous: 50 },
  }
);

assert.equal(fallback.profitWithoutExpense.current, 1_000);
assert.equal(fallback.profitWithoutExpense.previous, 750);
assert.equal(fallback.marginalityWithoutExpense.current, 100);
assert.equal(fallback.marginalityWithoutExpense.previous, 93.75);

console.log('dashboardMetrics regression: ok');
