import type { InventoryRecord, PlanRecord, Product, SalesRecord } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY_MS);
}

const today = new Date();
const startDate = addDays(today, -119);

export const products: Product[] = [
  {
    id: 'p-aurora-mug',
    name: 'Термокружка Aurora',
    sku: 'AUR-MUG-01',
    brand: 'Aurora',
    category: 'Термопосуда',
    marketplace: 'Wildberries',
    store: 'Основной',
    cost_price: 420,
    created_at: toDateString(addDays(today, -240)),
  },
  {
    id: 'p-nord-lamp',
    name: 'Настольная лампа Nord',
    sku: 'NRD-LMP-02',
    brand: 'Nord',
    category: 'Освещение',
    marketplace: 'Ozon',
    store: 'Home',
    cost_price: 1180,
    created_at: toDateString(addDays(today, -230)),
  },
  {
    id: 'p-velo-bottle',
    name: 'Бутылка Velo',
    sku: 'VEL-BTL-03',
    brand: 'Velo',
    category: 'Спорт',
    marketplace: 'Wildberries',
    store: 'Sport',
    cost_price: 310,
    created_at: toDateString(addDays(today, -220)),
  },
  {
    id: 'p-luma-box',
    name: 'Органайзер Luma Box',
    sku: 'LUM-BOX-04',
    brand: 'Luma',
    category: 'Хранение',
    marketplace: 'Яндекс Маркет',
    store: 'Home',
    cost_price: 540,
    created_at: toDateString(addDays(today, -210)),
  },
];

export const salesRecords: SalesRecord[] = products.flatMap((product, productIndex) =>
  Array.from({ length: 120 }, (_, dayIndex) => {
    const date = addDays(startDate, dayIndex);
    const seasonalBoost = dayIndex > 75 ? 1.12 : 1;
    const weekdayBoost = date.getDay() === 0 || date.getDay() === 6 ? 1.18 : 1;
    const demandBase = 8 + productIndex * 3;
    const orders = Math.max(4, Math.round((demandBase + (dayIndex % 7) + productIndex) * seasonalBoost * weekdayBoost));
    const returns = Math.max(0, Math.round(orders * (0.05 + productIndex * 0.01)));
    const sales = Math.max(0, orders - returns - (dayIndex % 5 === 0 ? 1 : 0));
    const avgPrice = 1200 + productIndex * 650 + (dayIndex % 9) * 25;
    const avgSalePrice = Math.round(avgPrice * (0.86 + ((dayIndex + productIndex) % 4) * 0.015));
    const revenue = sales * avgSalePrice;
    const logisticsCost = Math.round(revenue * (0.09 + productIndex * 0.008));
    const adsSpend = Math.round(revenue * (0.07 + (dayIndex % 6) * 0.004));
    const commission = Math.round(revenue * 0.14);
    const storageCost = Math.round(150 + productIndex * 45 + (dayIndex % 8) * 14);
    const taxes = Math.round(revenue * 0.06);
    const otherCosts = Math.round(revenue * (0.018 + productIndex * 0.003));

    return {
      id: `${product.id}-${dayIndex}`,
      product_id: product.id,
      date: toDateString(date),
      revenue,
      orders,
      sales,
      returns,
      logistics_cost: logisticsCost,
      ads_spend: adsSpend,
      commission,
      storage_cost: storageCost,
      taxes,
      other_costs: otherCosts,
      avg_price: avgPrice,
      avg_sale_price: avgSalePrice,
    };
  })
);

export const inventoryRecords: InventoryRecord[] = products.flatMap((product, productIndex) => {
  const warehouses = productIndex % 2 === 0 ? ['Москва', 'Казань'] : ['Подольск', 'Екатеринбург'];

  return Array.from({ length: 18 }, (_, snapshotIndex) => {
    const snapshotDate = addDays(today, -snapshotIndex * 7);
    const salesForWindow = salesRecords.filter(
      record =>
        record.product_id === product.id &&
        record.date >= toDateString(addDays(snapshotDate, -6)) &&
        record.date <= toDateString(snapshotDate)
    );
    const sold = salesForWindow.reduce((sum, record) => sum + record.sales, 0);
    const baseStock = 340 - snapshotIndex * (14 + productIndex * 2);
    const totalStock = Math.max(0, baseStock - sold + productIndex * 18);

    return warehouses.map((warehouse, warehouseIndex) => ({
      id: `${product.id}-inv-${snapshotIndex}-${warehouseIndex}`,
      product_id: product.id,
      date: toDateString(snapshotDate),
      stock_quantity: Math.max(0, Math.round(totalStock * (warehouseIndex === 0 ? 0.62 : 0.38))),
      warehouse,
    }));
  }).flat();
});

export const planRecords: PlanRecord[] = products.flatMap((product, productIndex) =>
  Array.from({ length: 4 }, (_, periodIndex) => {
    const periodStart = addDays(today, -(periodIndex + 1) * 28 + 1);
    const periodEnd = addDays(periodStart, 27);
    const periodSales = salesRecords.filter(
      record => record.product_id === product.id && record.date >= toDateString(periodStart) && record.date <= toDateString(periodEnd)
    );
    const actualRevenue = periodSales.reduce((sum, record) => sum + record.revenue, 0);
    const actualOrders = periodSales.reduce((sum, record) => sum + record.orders, 0);
    const plannedRevenue = Math.round(actualRevenue * (0.92 + ((periodIndex + productIndex) % 3) * 0.06));
    const plannedProfit = Math.round(plannedRevenue * (0.19 + productIndex * 0.01));
    const plannedOrders = Math.round(actualOrders * (0.95 + (periodIndex % 2) * 0.05));

    return {
      id: `${product.id}-plan-${periodIndex}`,
      product_id: product.id,
      period_start: toDateString(periodStart),
      period_end: toDateString(periodEnd),
      planned_revenue: plannedRevenue,
      planned_profit: plannedProfit,
      planned_orders: plannedOrders,
    };
  })
);
