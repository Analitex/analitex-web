import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { MarketplaceIcon } from '../components/common/MarketplaceIcon';
import { usePlatform } from '../context/PlatformContext';
import { apiRequest } from '../lib/api';
import { formatCurrency } from '../lib/calculations';

type OperationType = 'Expense' | 'Income';

type OperationShop = {
  id: string;
  displayName: string;
  marketplace: string;
};

type ManualOperation = {
  id: string;
  organizationId: string;
  type: OperationType;
  amount: number;
  periodStart: string;
  periodEnd: string;
  category?: string | null;
  comment?: string | null;
  marketplaceConnectionIds: string[];
  shops: OperationShop[];
  updatedAt: string;
};

type ManualOperationsResponse = {
  organizationId: string;
  items: ManualOperation[];
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
};

type OperationDraft = {
  type: OperationType;
  amount: string;
  periodStart: string;
  periodEnd: string;
  category: string;
  comment: string;
  marketplaceConnectionIds: string[];
};

const EMPTY_RESPONSE: ManualOperationsResponse = {
  organizationId: '',
  items: [],
  incomeTotal: 0,
  expenseTotal: 0,
  balance: 0,
};

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getDefaultPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  return { start: toDateInput(start), end: toDateInput(end) };
}

function buildDraft(connectionIds: string[], operation?: ManualOperation): OperationDraft {
  const period = getDefaultPeriod();
  return {
    type: operation?.type ?? 'Expense',
    amount: operation ? String(operation.amount) : '',
    periodStart: operation?.periodStart ?? period.start,
    periodEnd: operation?.periodEnd ?? period.end,
    category: operation?.category ?? '',
    comment: operation?.comment ?? '',
    marketplaceConnectionIds: operation?.marketplaceConnectionIds?.length ? operation.marketplaceConnectionIds : connectionIds,
  };
}

function parseAmount(value: string) {
  const normalized = Number(value.replace(',', '.'));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function formatPeriod(start: string, end: string) {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: '2-digit' };
  const from = new Date(`${start}T00:00:00`).toLocaleDateString('ru-RU', options);
  const to = new Date(`${end}T00:00:00`).toLocaleDateString('ru-RU', options);
  return start === end ? from : `${from} - ${to}`;
}

function OperationTypeBadge({ type }: { type: OperationType }) {
  const isIncome = type === 'Income';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
      {isIncome ? 'Доход' : 'Расход'}
    </span>
  );
}

export function OperationsPage() {
  const { session, connections, selectedOrganizationId, loadSettingsTabData, enqueueNotification } = usePlatform();
  const shops = useMemo(
    () => connections.filter(connection => connection.organizationId === selectedOrganizationId),
    [connections, selectedOrganizationId]
  );
  const shopIds = useMemo(() => shops.map(shop => shop.id), [shops]);

  const [response, setResponse] = useState<ManualOperationsResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManualOperation | null>(null);
  const [draft, setDraft] = useState<OperationDraft>(() => buildDraft([]));

  const loadOperations = useCallback(async () => {
    if (!session?.accessToken || !selectedOrganizationId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ManualOperationsResponse>(`/organizations/${selectedOrganizationId}/manual-operations`, {
        token: session.accessToken,
      });
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить операции.');
    } finally {
      setLoading(false);
    }
  }, [selectedOrganizationId, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) return;
    void loadSettingsTabData('shops');
  }, [loadSettingsTabData, session?.accessToken]);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  useEffect(() => {
    if (!editing) {
      setDraft(current => ({
        ...current,
        marketplaceConnectionIds: current.marketplaceConnectionIds.length ? current.marketplaceConnectionIds : shopIds,
      }));
    }
  }, [editing, shopIds]);

  const beginCreate = () => {
    setEditing(null);
    setDraft(buildDraft(shopIds));
    setError(null);
  };

  const beginEdit = (operation: ManualOperation) => {
    setEditing(operation);
    setDraft(buildDraft(shopIds, operation));
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(buildDraft(shopIds));
  };

  const toggleShop = (connectionId: string) => {
    setDraft(current => {
      const selected = new Set(current.marketplaceConnectionIds);
      if (selected.has(connectionId)) {
        selected.delete(connectionId);
      } else {
        selected.add(connectionId);
      }

      return { ...current, marketplaceConnectionIds: Array.from(selected) };
    });
  };

  const submit = async () => {
    if (!session?.accessToken || !selectedOrganizationId || saving) return;
    const amount = parseAmount(draft.amount);
    if (amount == null) {
      setError('Введите сумму больше нуля.');
      return;
    }
    if (draft.periodEnd < draft.periodStart) {
      setError('Дата окончания не может быть раньше даты начала.');
      return;
    }
    if (draft.marketplaceConnectionIds.length === 0) {
      setError('Выберите хотя бы один магазин.');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      type: draft.type,
      amount,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      category: draft.category.trim() || null,
      comment: draft.comment.trim() || null,
      marketplaceConnectionIds: draft.marketplaceConnectionIds,
    };

    try {
      const path = editing
        ? `/organizations/${selectedOrganizationId}/manual-operations/${editing.id}`
        : `/organizations/${selectedOrganizationId}/manual-operations`;
      await apiRequest<ManualOperation>(path, {
        method: editing ? 'PUT' : 'POST',
        token: session.accessToken,
        body: JSON.stringify(payload),
      });
      enqueueNotification({
        tone: 'success',
        title: editing ? 'Операция обновлена' : 'Операция добавлена',
        message: 'Расходы в отчётах пересчитаются по периоду операции.',
      });
      setEditing(null);
      setDraft(buildDraft(shopIds));
      await loadOperations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить операцию.');
    } finally {
      setSaving(false);
    }
  };

  const deleteOperation = async (operation: ManualOperation) => {
    if (!session?.accessToken || !selectedOrganizationId || saving) return;
    if (!window.confirm('Удалить операцию?')) return;

    setSaving(true);
    setError(null);
    try {
      await apiRequest<void>(`/organizations/${selectedOrganizationId}/manual-operations/${operation.id}`, {
        method: 'DELETE',
        token: session.accessToken,
      });
      enqueueNotification({
        tone: 'success',
        title: 'Операция удалена',
        message: 'Операционные расходы обновятся в следующих отчётах.',
      });
      if (editing?.id === operation.id) {
        setEditing(null);
        setDraft(buildDraft(shopIds));
      }
      await loadOperations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить операцию.');
    } finally {
      setSaving(false);
    }
  };

  const items = response.items ?? [];

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Операции</h1>
          <p className="mt-1 text-sm text-slate-500">Доходы и расходы, которые распределяются по товарам в выбранном периоде</p>
        </div>
        <button
          type="button"
          onClick={beginCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <Plus size={16} />
          Добавить
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Доход</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{formatCurrency(response.incomeTotal, true)}</div>
        </div>
        <div className="rounded-lg border border-rose-100 bg-rose-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Расход</div>
          <div className="mt-1 text-2xl font-bold text-rose-900">{formatCurrency(response.expenseTotal, true)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Сальдо</div>
          <div className={`mt-1 text-2xl font-bold ${response.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatCurrency(response.balance, true)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">{editing ? 'Редактирование' : 'Новая операция'}</div>
              <div className="text-xs text-slate-500">Сумма распределится по продажам выбранных магазинов</div>
            </div>
            {editing && (
              <button type="button" onClick={cancelEdit} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              {(['Expense', 'Income'] as OperationType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDraft(current => ({ ...current, type }))}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    draft.type === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type === 'Expense' ? 'Расход' : 'Доход'}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Сумма</span>
              <input
                value={draft.amount}
                onChange={event => setDraft(current => ({ ...current, amount: event.target.value }))}
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-400"
                placeholder="0"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Начало</span>
                <input
                  type="date"
                  value={draft.periodStart}
                  onChange={event => setDraft(current => ({ ...current, periodStart: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Конец</span>
                <input
                  type="date"
                  value={draft.periodEnd}
                  onChange={event => setDraft(current => ({ ...current, periodEnd: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Статья</span>
              <input
                value={draft.category}
                onChange={event => setDraft(current => ({ ...current, category: event.target.value }))}
                maxLength={128}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                placeholder="Операция без статьи"
              />
            </label>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Магазины</div>
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {shops.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-slate-500">Нет доступных магазинов</div>
                ) : (
                  shops.map(shop => {
                    const checked = draft.marketplaceConnectionIds.includes(shop.id);
                    return (
                      <button
                        key={shop.id}
                        type="button"
                        onClick={() => toggleShop(shop.id)}
                        className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition ${
                          checked ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? 'border-white bg-white text-slate-900' : 'border-slate-300'}`}>
                          {checked && <Check size={13} />}
                        </span>
                        <MarketplaceIcon marketplace={shop.marketplace} className="h-5 w-5" />
                        <span className="min-w-0 flex-1 truncate">{shop.displayName}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Комментарий</span>
              <textarea
                value={draft.comment}
                onChange={event => setDraft(current => ({ ...current, comment: event.target.value }))}
                maxLength={1000}
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

            <button
              type="button"
              onClick={submit}
              disabled={saving || shops.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {editing ? 'Сохранить' : 'Добавить операцию'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays size={16} className="text-slate-400" />
              Список операций
            </div>
            {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Период</th>
                  <th className="px-4 py-3">Тип</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                  <th className="px-4 py-3">Статья</th>
                  <th className="px-4 py-3">Магазины</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      Операций пока нет
                    </td>
                  </tr>
                ) : (
                  items.map(operation => (
                    <tr key={operation.id} className={editing?.id === operation.id ? 'bg-blue-50/40' : 'bg-white'}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{formatPeriod(operation.periodStart, operation.periodEnd)}</td>
                      <td className="px-4 py-3"><OperationTypeBadge type={operation.type} /></td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${operation.type === 'Income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(operation.amount, true)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{operation.category || 'Операция без статьи'}</td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-xs flex-wrap gap-1.5">
                          {operation.shops.map(shop => (
                            <span key={`${operation.id}-${shop.id}`} className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              <MarketplaceIcon marketplace={shop.marketplace} className="h-3.5 w-3.5" />
                              <span className="truncate">{shop.displayName}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => beginEdit(operation)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Редактировать"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteOperation(operation)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Удалить"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
