import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  LogOut,
  PencilLine,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { SETTINGS_TABS, type SettingsTabId } from './settingsConfig';

const CUSTOM_METRICS_STORAGE_KEY = 'dashboard-custom-metrics';
type TaxModeId = 'usn-income' | 'usn-income-expense-fixed-vat' | 'usn-income-expense-vat-22' | 'ip-osno' | 'ooo-osno';

interface ProfileState {
  name: string;
  surname: string;
  role: string;
  email: string;
  phone: string;
}

interface Shop {
  id: string;
  name: string;
  marketplace: string;
  legalEntity: string;
  inn: string;
  status: string;
  syncedAt: string;
}

interface OrganizationUser {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  access: string;
  status: string;
}

interface QuarterConfig {
  taxRate: string;
  vatRate: string;
  months: { label: string; taxRate: string; vatRate: string }[];
}

interface TaxConfig {
  taxMode: TaxModeId;
  includeCostAsExpense: boolean;
  quarters: QuarterConfig[];
}

interface CustomMetric {
  id: string;
  name: string;
  formula: string;
  growthColor: string;
  unit: string;
}

const TAX_MODES = [
  { id: 'usn-income', label: 'УСН "Доходы"', rateLabel: 'УСН', supportsVat: false, supportsCostExpense: false },
  { id: 'usn-income-expense-fixed-vat', label: 'УСН "Доходы - Расходы" с фикс. НДС', rateLabel: 'УСН', supportsVat: true, supportsCostExpense: true },
  { id: 'usn-income-expense-vat-22', label: 'УСН "Доходы - Расходы" с НДС 22%', rateLabel: 'УСН', supportsVat: true, supportsCostExpense: true },
  { id: 'ip-osno', label: 'ИП на ОСНО', rateLabel: 'НДФЛ', supportsVat: true, supportsCostExpense: true },
  { id: 'ooo-osno', label: 'ООО на ОСНО', rateLabel: 'Налог на прибыль', supportsVat: true, supportsCostExpense: true },
] satisfies {
  id: TaxModeId;
  label: string;
  rateLabel: string;
  supportsVat: boolean;
  supportsCostExpense: boolean;
}[];

const TAX_YEARS = [2026, 2025, 2024];

const DEFAULT_PROFILE: ProfileState = {
  name: 'Алина',
  surname: 'Иванова',
  role: 'Owner',
  email: 'alina@analyticspro.ru',
  phone: '+7 (999) 123-45-67',
};

const SHOPS: Shop[] = [
  {
    id: 'shop-ozon-home',
    name: 'Aurora Home',
    marketplace: 'Ozon',
    legalEntity: 'ООО Аурора Трейд',
    inn: '7704123456',
    status: 'Синхронизация активна',
    syncedAt: '17 апреля 2026, 15:20',
  },
  {
    id: 'shop-wb-sport',
    name: 'Aurora Sport',
    marketplace: 'Wildberries',
    legalEntity: 'ИП Иванова А.А.',
    inn: '667812345678',
    status: 'Требуется проверка токена',
    syncedAt: '17 апреля 2026, 14:55',
  },
  {
    id: 'shop-ym-main',
    name: 'Aurora Market',
    marketplace: 'Яндекс Маркет',
    legalEntity: 'ООО Аурора Трейд',
    inn: '7704123456',
    status: 'Синхронизация активна',
    syncedAt: '17 апреля 2026, 15:05',
  },
];

const ORGANIZATION_USERS: OrganizationUser[] = [
  {
    id: 'user-1',
    name: 'Алина Иванова',
    role: 'Owner',
    email: 'alina@analyticspro.ru',
    phone: '+7 (999) 123-45-67',
    access: 'Все магазины и настройки',
    status: 'Активен',
  },
  {
    id: 'user-2',
    name: 'Михаил Корнеев',
    role: 'Finance manager',
    email: 'finance@analyticspro.ru',
    phone: '+7 (912) 800-14-11',
    access: 'Финансы, налоги, отчеты',
    status: 'Активен',
  },
  {
    id: 'user-3',
    name: 'Екатерина Смирнова',
    role: 'Marketplace manager',
    email: 'ops@analyticspro.ru',
    phone: '+7 (903) 700-20-10',
    access: 'Магазины, метрики, дашборд',
    status: 'Приглашение отправлено',
  },
];

const MONTH_LABELS = [
  ['Январь', 'Февраль', 'Март'],
  ['Апрель', 'Май', 'Июнь'],
  ['Июль', 'Август', 'Сентябрь'],
  ['Октябрь', 'Ноябрь', 'Декабрь'],
];

function createDefaultQuarter(monthLabels: string[]): QuarterConfig {
  return {
    taxRate: '',
    vatRate: '',
    months: monthLabels.map(label => ({
      label,
      taxRate: '',
      vatRate: '',
    })),
  };
}

function createDefaultTaxConfig(): TaxConfig {
  return {
    taxMode: 'usn-income',
    includeCostAsExpense: false,
    quarters: MONTH_LABELS.map(months => createDefaultQuarter(months)),
  };
}

interface SettingsPageProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsPage({ activeTab, onTabChange }: SettingsPageProps) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(TAX_YEARS[0]);
  const [selectedShopId, setSelectedShopId] = useState<string>(SHOPS[0].id);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<Record<string, Record<number, TaxConfig>>>(() => {
    const initialState: Record<string, Record<number, TaxConfig>> = {};

    SHOPS.forEach(shop => {
      initialState[shop.id] = {};
      TAX_YEARS.forEach(year => {
        initialState[shop.id][year] = createDefaultTaxConfig();
      });
    });

    initialState['shop-ozon-home'][2026] = {
      taxMode: 'usn-income-expense-fixed-vat',
      includeCostAsExpense: true,
      quarters: [
        {
          taxRate: '15',
          vatRate: '10',
          months: [
            { label: 'Январь', taxRate: '15', vatRate: '10' },
            { label: 'Февраль', taxRate: '15', vatRate: '10' },
            { label: 'Март', taxRate: '15', vatRate: '10' },
          ],
        },
        {
          taxRate: '15',
          vatRate: '10',
          months: [
            { label: 'Апрель', taxRate: '15', vatRate: '10' },
            { label: 'Май', taxRate: '15', vatRate: '10' },
            { label: 'Июнь', taxRate: '15', vatRate: '10' },
          ],
        },
        createDefaultQuarter(MONTH_LABELS[2]),
        createDefaultQuarter(MONTH_LABELS[3]),
      ],
    };

    return initialState;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(CUSTOM_METRICS_STORAGE_KEY);
      setCustomMetrics(raw ? (JSON.parse(raw) as CustomMetric[]) : []);
    } catch {
      setCustomMetrics([]);
    }
  }, []);

  const selectedShop = useMemo(
    () => SHOPS.find(shop => shop.id === selectedShopId) ?? SHOPS[0],
    [selectedShopId]
  );
  const currentTaxConfig = taxConfigs[selectedShop.id][selectedYear];
  const currentTaxMode = TAX_MODES.find(mode => mode.id === currentTaxConfig.taxMode) ?? TAX_MODES[0];
  const updateProfileField = (field: keyof ProfileState, value: string) => {
    setProfile(current => ({ ...current, [field]: value }));
  };

  const updateTaxConfig = (updater: (config: TaxConfig) => TaxConfig) => {
    setTaxConfigs(current => ({
      ...current,
      [selectedShop.id]: {
        ...current[selectedShop.id],
        [selectedYear]: updater(current[selectedShop.id][selectedYear]),
      },
    }));
  };

  const applyQuarterValues = (quarterIndex: number, field: 'taxRate' | 'vatRate', value: string) => {
    updateTaxConfig(config => ({
      ...config,
      quarters: config.quarters.map((quarter, index) => {
        if (index !== quarterIndex) return quarter;

        return {
          ...quarter,
          [field]: value,
          months: quarter.months.map(month => ({
            ...month,
            [field]: value,
          })),
        };
      }),
    }));
  };

  const updateMonthValue = (quarterIndex: number, monthIndex: number, field: 'taxRate' | 'vatRate', value: string) => {
    updateTaxConfig(config => ({
      ...config,
      quarters: config.quarters.map((quarter, index) => {
        if (index !== quarterIndex) return quarter;

        return {
          ...quarter,
          months: quarter.months.map((month, idx) =>
            idx === monthIndex ? { ...month, [field]: value } : month
          ),
        };
      }),
    }));
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
        <aside className="hidden lg:sticky lg:top-6 lg:block lg:w-[320px] lg:flex-shrink-0 xl:w-[340px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Settings</div>
              <h1 className="mt-3 text-2xl font-semibold">Настройки кабинета</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Управляйте профилем, подключенными магазинами, доступами команды и налоговыми правилами.
              </p>
            </div>

            <nav className="mt-4 hidden space-y-2 lg:block">
              {SETTINGS_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{tab.label}</div>
                      <div className={`text-xs ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                        {tab.description}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className={isActive ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:max-w-[calc(100%-320px-24px)] xl:max-w-[calc(100%-340px-24px)]">
          {activeTab === 'profile' && (
            <ProfileTab
              profile={profile}
              isEditing={isEditingProfile}
              onEditToggle={() => setIsEditingProfile(current => !current)}
              onFieldChange={updateProfileField}
            />
          )}

          {activeTab === 'shops' && <ShopsTab />}

          {activeTab === 'users' && <UsersTab />}

          {activeTab === 'taxes' && (
            <TaxesTab
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              selectedShopId={selectedShopId}
              onShopChange={setSelectedShopId}
              currentTaxConfig={currentTaxConfig}
              currentTaxMode={currentTaxMode}
              onTaxModeChange={value =>
                updateTaxConfig(config => ({
                  ...config,
                  taxMode: value,
                  includeCostAsExpense:
                    TAX_MODES.find(mode => mode.id === value)?.supportsCostExpense ? config.includeCostAsExpense : false,
                }))
              }
              onCostExpenseToggle={() =>
                updateTaxConfig(config => ({
                  ...config,
                  includeCostAsExpense: !config.includeCostAsExpense,
                }))
              }
              onQuarterChange={applyQuarterValues}
              onMonthChange={updateMonthValue}
            />
          )}

          {activeTab === 'metrics' && <MetricsTab customMetrics={customMetrics} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  isEditing,
  onEditToggle,
  onFieldChange,
}: {
  profile: ProfileState;
  isEditing: boolean;
  onEditToggle: () => void;
  onFieldChange: (field: keyof ProfileState, value: string) => void;
}) {
  const fields: { key: keyof ProfileState; label: string }[] = [
    { key: 'name', label: 'Имя' },
    { key: 'surname', label: 'Фамилия' },
    { key: 'role', label: 'Роль' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Телефон' },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-medium text-blue-600">Профиль</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Личные данные</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Редактируйте имя, роль и контактные данные аккаунта. Критичные действия вынесены в отдельный блок.
            </p>
          </div>
          <button
            type="button"
            onClick={onEditToggle}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <PencilLine size={16} />
            {isEditing ? 'Завершить редактирование' : 'Редактировать'}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {fields.map(field => (
            <label key={field.key} className="block">
              <div className="mb-2 text-sm font-medium text-slate-600">{field.label}</div>
              <input
                type={field.key === 'email' ? 'email' : 'text'}
                value={profile[field.key]}
                onChange={event => onFieldChange(field.key, event.target.value)}
                disabled={!isEditing}
                className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${
                  isEditing
                    ? 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Безопасность</h3>
              <p className="text-sm text-slate-500">Управление паролем и сессиями</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Сменить пароль
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <LogOut size={16} />
              Выйти из аккаунта
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Опасная зона</h3>
              <p className="text-sm text-slate-500">Действия с необратимыми последствиями</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Удаление профиля приведет к отзыву доступа ко всем кабинетам и настройкам организации.
          </p>

          <button
            type="button"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            <Trash2 size={16} />
            Удалить профиль
          </button>
        </div>
      </div>
    </section>
  );
}

function ShopsTab() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium text-blue-600">Магазины</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Подключенные маркетплейсы</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Отслеживайте статусы интеграций Ozon, Wildberries и Яндекс Маркета по каждому кабинету.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus size={16} />
            Подключить магазин
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {SHOPS.map(shop => {
          const isHealthy = shop.status === 'Синхронизация активна';

          return (
            <article key={shop.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {shop.marketplace}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{shop.name}</h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {shop.status}
                </span>
              </div>

              <dl className="mt-6 space-y-4">
                <MetaRow label="Юр. лицо" value={shop.legalEntity} />
                <MetaRow label="ИНН" value={shop.inn} />
                <MetaRow label="Последняя синхронизация" value={shop.syncedAt} />
              </dl>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Настроить
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Обновить токен
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function UsersTab() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium text-blue-600">Пользователи</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Команда организации</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Список сотрудников текущей организации с ролями, доступами и статусами приглашений.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus size={16} />
            Пригласить пользователя
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_0.9fr_0.8fr] gap-4 border-b border-slate-200 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 md:grid">
          <div>Пользователь</div>
          <div>Роль</div>
          <div>Контакты</div>
          <div>Доступ</div>
          <div>Статус</div>
        </div>

        <div className="divide-y divide-slate-200">
          {ORGANIZATION_USERS.map(user => (
            <div key={user.id} className="grid gap-4 px-5 py-5 md:grid-cols-[1.2fr_0.8fr_1fr_0.9fr_0.8fr] md:px-6">
              <div className="space-y-3 md:space-y-1">
                <div className="font-semibold text-slate-900">{user.name}</div>
                <div className="text-sm text-slate-500">{user.phone}</div>
              </div>
              <MobileInfoRow label="Роль" value={user.role} />
              <MobileInfoRow label="Контакты" value={user.email} />
              <MobileInfoRow label="Доступ" value={user.access} />
              <div className="flex items-center justify-between gap-3 md:block">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">Статус</div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    user.status === 'Активен' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {user.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TaxesTab({
  selectedYear,
  onYearChange,
  selectedShopId,
  onShopChange,
  currentTaxConfig,
  currentTaxMode,
  onTaxModeChange,
  onCostExpenseToggle,
  onQuarterChange,
  onMonthChange,
}: {
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedShopId: string;
  onShopChange: (shopId: string) => void;
  currentTaxConfig: TaxConfig;
  currentTaxMode: (typeof TAX_MODES)[number];
  onTaxModeChange: (mode: TaxModeId) => void;
  onCostExpenseToggle: () => void;
  onQuarterChange: (quarterIndex: number, field: 'taxRate' | 'vatRate', value: string) => void;
  onMonthChange: (quarterIndex: number, monthIndex: number, field: 'taxRate' | 'vatRate', value: string) => void;
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <div className="text-sm font-medium text-blue-600">Налоги</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Настройка налоговых режимов</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Режим налогообложения выбирается на кабинет на год. Налоговую ставку и НДС можно задавать по кварталу
              и уточнять по месяцам внутри квартала.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Параметры</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-600">Год</div>
                  <select
                    value={selectedYear}
                    onChange={event => onYearChange(Number(event.target.value))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
                  >
                    {TAX_YEARS.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-600">Магазин</div>
                  <select
                    value={selectedShopId}
                    onChange={event => onShopChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
                  >
                    {SHOPS.map(shop => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-900">Как заполнять</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-900/80">
                <li>Выберите режим налогообложения на кабинет на год.</li>
                <li>Ставку налога и НДС можно задать сразу на квартал, чтобы заполнить все 3 месяца.</li>
                <li>Для ОСНО и УСН доходы-расходы можно учитывать себестоимость как официальный расход.</li>
                <li>После сохранения пересчет данных может занять до 15 минут.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-600">Режим налогообложения</div>
            <select
              value={currentTaxConfig.taxMode}
              onChange={event => onTaxModeChange(event.target.value as TaxModeId)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
            >
              {TAX_MODES.map(mode => (
                <option key={mode.id} value={mode.id}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          <label
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              currentTaxMode.supportsCostExpense
                ? 'border-slate-200 bg-slate-50 text-slate-700'
                : 'border-slate-100 bg-slate-50 text-slate-400'
            }`}
          >
            <input
              type="checkbox"
              checked={currentTaxConfig.includeCostAsExpense}
              onChange={onCostExpenseToggle}
              disabled={!currentTaxMode.supportsCostExpense}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span className="text-sm leading-6">
              Учитывать себестоимость товара как официальный расход
            </span>
          </label>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Квартальные ставки</div>
              <div className="text-sm text-slate-500">
                Пролистывайте кварталы по горизонтали и задавайте ставки сразу на квартал или по месяцам.
              </div>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Сохранить все
            </button>
          </div>

          <div className="-mx-6 overflow-x-auto px-6 pb-2">
            <div className="flex min-w-max gap-2">
          {currentTaxConfig.quarters.map((quarter, quarterIndex) => (
                <div
                  key={`quarter-${quarterIndex}`}
                  className="w-[300px] flex-shrink-0 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:w-[300px] xl:w-[300px]"
                >
              <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Квартал {quarterIndex + 1}
                  </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <RateInput
                  label={`${currentTaxMode.rateLabel}, %`}
                  value={quarter.taxRate}
                  onChange={value => onQuarterChange(quarterIndex, 'taxRate', value)}
                />
                <RateInput
                  label="НДС, %"
                  value={quarter.vatRate}
                  onChange={value => onQuarterChange(quarterIndex, 'vatRate', value)}
                  disabled={!currentTaxMode.supportsVat}
                />
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="divide-y divide-slate-200">
                  {quarter.months.map((month, monthIndex) => (
                    <div key={month.label} className="grid gap-3 px-4 py-3 sm:grid-cols-3 sm:gap-4">
                      <div className="self-center text-sm font-medium text-slate-700">{month.label}</div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:hidden">
                          {currentTaxMode.rateLabel}, %
                        </div>
                        <InlineRateInput
                          value={month.taxRate}
                          onChange={value => onMonthChange(quarterIndex, monthIndex, 'taxRate', value)}
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:hidden">
                          НДС, %
                        </div>
                        <InlineRateInput
                          value={month.vatRate}
                          onChange={value => onMonthChange(quarterIndex, monthIndex, 'vatRate', value)}
                          disabled={!currentTaxMode.supportsVat}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
                </div>
          ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 md:block">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">{label}</div>
      <div className="text-right text-sm text-slate-700 md:text-left">{value}</div>
    </div>
  );
}

function MetricsTab({ customMetrics }: { customMetrics: CustomMetric[] }) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-medium text-blue-600">Метрики</div>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Пользовательские метрики</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Здесь отображаются метрики, созданные пользователем на дашборде. Раздел можно использовать как реестр
          формул и единиц измерения.
        </p>
      </div>

      {customMetrics.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Пользовательские метрики пока не созданы</div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Добавьте метрику в дашборде, и она автоматически появится в этом списке.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {customMetrics.map(metric => (
            <article key={metric.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{metric.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">Единица измерения: {metric.unit || 'Не указана'}</p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${metric.growthColor}22`, color: metric.growthColor || '#0f172a' }}
                >
                  Цвет роста
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Формула</div>
                <code className="mt-2 block whitespace-pre-wrap break-words text-sm text-slate-700">
                  {metric.formula}
                </code>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function RateInput({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-600">{label}</div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        placeholder={disabled ? 'Недоступно для режима' : 'Например, 15'}
        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${
          disabled
            ? 'border-slate-200 bg-slate-100 text-slate-400'
            : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
        }`}
      />
    </label>
  );
}

function InlineRateInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
      placeholder="0"
      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${
        disabled
          ? 'border-slate-200 bg-slate-100 text-slate-400'
          : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
      }`}
    />
  );
}
