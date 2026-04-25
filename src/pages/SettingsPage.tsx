import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronRight,
  LogOut,
  Loader2,
  PencilLine,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { MarketplaceBadge } from '../components/common/MarketplaceIcon';
import { usePlatform, type MarketplaceConnection, type OrganizationMember, type SyncRun } from '../context/PlatformContext';
import { apiRequest } from '../lib/api';
import { SETTINGS_TABS, type SettingsTabId } from './settingsConfig';

type TaxModeId = 'usn-income' | 'usn-income-expense-fixed-vat' | 'usn-income-expense-vat-22' | 'ip-osno' | 'ooo-osno';

interface ProfileState {
  name: string;
  surname: string;
  role: string;
  email: string;
  phone: string;
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

type MarketplaceFinanceSettingsResponse = {
  marketplaceConnectionId: string;
  accountId: number;
  taxEnabled: boolean;
  taxRatePercent: number;
  taxSystem?: string | null;
  updatedAt: string;
};

interface CustomMetric {
  id: string;
  name: string;
  formula: string;
  unitLabel: string;
  active: boolean;
}

type SyncRunApiResponse = {
  id: string;
  marketplaceConnectionId: string;
  syncKind?: string | null;
  dateFrom: string;
  dateTo: string;
  requestedAt?: string;
  enqueuedAt?: string;
  status: string | number;
  error?: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  progressPercent: number;
  progressMessage?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  canRetry: boolean;
  canCancel: boolean;
};

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

function mapFinanceTaxSystemToMode(taxSystem?: string | null): TaxModeId {
  switch ((taxSystem ?? '').toLowerCase()) {
    case 'usn_income_expense':
    case 'usn_income_expense_fixed_vat':
      return 'usn-income-expense-fixed-vat';
    case 'usn_income_expense_vat_22':
      return 'usn-income-expense-vat-22';
    case 'ip_osno':
      return 'ip-osno';
    case 'ooo_osno':
      return 'ooo-osno';
    case 'usn_income':
    default:
      return 'usn-income';
  }
}

function mapTaxModeToFinanceTaxSystem(mode: TaxModeId) {
  switch (mode) {
    case 'usn-income-expense-fixed-vat':
      return 'usn_income_expense_fixed_vat';
    case 'usn-income-expense-vat-22':
      return 'usn_income_expense_vat_22';
    case 'ip-osno':
      return 'ip_osno';
    case 'ooo-osno':
      return 'ooo_osno';
    case 'usn-income':
    default:
      return 'usn_income';
  }
}

function buildTaxConfigFromFinanceSettings(settings?: MarketplaceFinanceSettingsResponse | null): TaxConfig {
  const base = createDefaultTaxConfig();
  if (!settings) return base;

  const taxRate = settings.taxEnabled ? String(settings.taxRatePercent ?? 0) : '';
  const mappedMode = mapFinanceTaxSystemToMode(settings.taxSystem);

  return {
    taxMode: mappedMode,
    includeCostAsExpense: TAX_MODES.find(mode => mode.id === mappedMode)?.supportsCostExpense ?? false,
    quarters: base.quarters.map(quarter => ({
      ...quarter,
      taxRate,
      vatRate: '',
      months: quarter.months.map(month => ({
        ...month,
        taxRate,
        vatRate: '',
      })),
    })),
  };
}

function getEffectiveTaxRate(config: TaxConfig) {
  for (const quarter of config.quarters) {
    if (quarter.taxRate.trim()) return Number(quarter.taxRate);
    for (const month of quarter.months) {
      if (month.taxRate.trim()) return Number(month.taxRate);
    }
  }
  return 0;
}

function getSyncProgressColor(status: SyncRun['status']) {
  switch (status) {
    case 'Succeeded':
      return 'bg-emerald-500';
    case 'Running':
      return 'bg-blue-600';
    case 'Queued':
      return 'bg-amber-500';
    case 'Cancelled':
      return 'bg-slate-400';
    case 'Failed':
    default:
      return 'bg-rose-500';
  }
}

interface SettingsPageProps {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
}

export function SettingsPage({ activeTab, onTabChange }: SettingsPageProps) {
  const {
    session,
    customMetrics,
    connections,
    selectedOrganizationId,
    loadSettingsTabData,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    deleteCurrentUser,
    apiError,
  } = usePlatform();
  const [profile, setProfile] = useState<ProfileState>(() => ({
    ...DEFAULT_PROFILE,
    name: session?.user.firstName || DEFAULT_PROFILE.name,
    surname: session?.user.lastName || DEFAULT_PROFILE.surname,
    email: session?.user.email || DEFAULT_PROFILE.email,
    phone: session?.user.phone || DEFAULT_PROFILE.phone,
  }));
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(TAX_YEARS[0]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [settingsTabLoading, setSettingsTabLoading] = useState<SettingsTabId | null>(null);
  const [taxSettingsLoading, setTaxSettingsLoading] = useState(false);
  const [taxSettingsSaving, setTaxSettingsSaving] = useState(false);
  const [taxSettingsNotice, setTaxSettingsNotice] = useState<string | null>(null);
  const [taxSettingsError, setTaxSettingsError] = useState<string | null>(null);
  const [loadedFinanceSettingsKeys, setLoadedFinanceSettingsKeys] = useState<Record<string, boolean>>({});
  const [taxConfigs, setTaxConfigs] = useState<Record<string, Record<number, TaxConfig>>>(() => {
    return {};
  });

  useEffect(() => {
    setProfile({
      ...DEFAULT_PROFILE,
      name: session?.user.firstName || DEFAULT_PROFILE.name,
      surname: session?.user.lastName || DEFAULT_PROFILE.surname,
      email: session?.user.email || DEFAULT_PROFILE.email,
      phone: session?.user.phone || DEFAULT_PROFILE.phone,
    });
  }, [session?.user.email, session?.user.firstName, session?.user.lastName, session?.user.phone]);

  useEffect(() => {
    const requestedTab = activeTab === 'shops' || activeTab === 'users' || activeTab === 'metrics' ? activeTab : null;
    if (!requestedTab) {
      setSettingsTabLoading(null);
      return;
    }

    let cancelled = false;
    setSettingsTabLoading(requestedTab);
    void loadSettingsTabData(requestedTab)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSettingsTabLoading(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, loadSettingsTabData]);

  const taxShops = useMemo(
    () => connections.filter(connection => connection.organizationId === selectedOrganizationId),
    [connections, selectedOrganizationId]
  );

  useEffect(() => {
    if (taxShops.length === 0) {
      setSelectedShopId('');
      return;
    }
    setSelectedShopId(current => (current && taxShops.some(shop => shop.id === current) ? current : taxShops[0].id));
  }, [taxShops]);

  useEffect(() => {
    if (taxShops.length === 0) return;
    setTaxConfigs(current => {
      const next = { ...current };
      taxShops.forEach(shop => {
        if (!next[shop.id]) {
          next[shop.id] = {};
        }
        TAX_YEARS.forEach(year => {
          if (!next[shop.id][year]) {
            next[shop.id][year] = createDefaultTaxConfig();
          }
        });
      });
      return next;
    });
  }, [taxShops]);

  useEffect(() => {
    if (activeTab !== 'taxes' || !session?.accessToken || !selectedShopId || loadedFinanceSettingsKeys[selectedShopId]) return;

    let cancelled = false;
    setTaxSettingsLoading(true);
    setTaxSettingsError(null);

    void apiRequest<MarketplaceFinanceSettingsResponse>(`/config/marketplace-connections/${selectedShopId}/finance-settings`, {
      token: session.accessToken,
    })
      .then(response => {
        if (cancelled) return;
        const nextConfig = buildTaxConfigFromFinanceSettings(response ?? null);
        setTaxConfigs(current => ({
          ...current,
          [selectedShopId]: Object.fromEntries(TAX_YEARS.map(year => [year, nextConfig])) as Record<number, TaxConfig>,
        }));
        setLoadedFinanceSettingsKeys(current => ({ ...current, [selectedShopId]: true }));
      })
      .catch(error => {
        if (cancelled) return;
        setTaxSettingsError(error instanceof Error ? error.message : 'Не удалось загрузить налоговые настройки.');
      })
      .finally(() => {
        if (!cancelled) setTaxSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, loadedFinanceSettingsKeys, selectedShopId, session?.accessToken]);

  const selectedShop = useMemo(
    () => taxShops.find(shop => shop.id === selectedShopId) ?? taxShops[0] ?? null,
    [selectedShopId, taxShops]
  );
  const currentTaxConfig = selectedShop ? (taxConfigs[selectedShop.id]?.[selectedYear] ?? createDefaultTaxConfig()) : createDefaultTaxConfig();
  const currentTaxMode = TAX_MODES.find(mode => mode.id === currentTaxConfig.taxMode) ?? TAX_MODES[0];
  const updateProfileField = (field: keyof ProfileState, value: string) => {
    setProfile(current => ({ ...current, [field]: value }));
  };

  const cancelProfileEdit = () => {
    setProfile({
      ...DEFAULT_PROFILE,
      name: session?.user.firstName || DEFAULT_PROFILE.name,
      surname: session?.user.lastName || DEFAULT_PROFILE.surname,
      email: session?.user.email || DEFAULT_PROFILE.email,
      phone: session?.user.phone || DEFAULT_PROFILE.phone,
    });
    setIsEditingProfile(false);
    setProfileNotice(null);
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileNotice(null);
    try {
      await updateProfile({
        firstName: profile.name.trim(),
        lastName: profile.surname.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });
      setIsEditingProfile(false);
      setProfileNotice('Профиль сохранен через API.');
    } catch (error) {
      setProfileNotice(error instanceof Error ? error.message : 'Не удалось сохранить профиль.');
    } finally {
      setProfileSaving(false);
    }
  };

  const submitPasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordNotice('Новый пароль и подтверждение не совпадают.');
      return;
    }

    setPasswordSaving(true);
    setPasswordNotice(null);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordNotice('Пароль изменен через API.');
    } catch (error) {
      setPasswordNotice(error instanceof Error ? error.message : 'Не удалось сменить пароль.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    const email = session?.user.email || profile.email;
    setPasswordSaving(true);
    setPasswordNotice(null);
    try {
      await requestPasswordReset(email);
      setPasswordNotice(`Ссылка для сброса пароля отправлена на ${email}.`);
    } catch (error) {
      setPasswordNotice(error instanceof Error ? error.message : 'Не удалось запросить сброс пароля.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const updateTaxConfig = (updater: (config: TaxConfig) => TaxConfig) => {
    if (!selectedShop) return;
    setTaxConfigs(current => ({
      ...current,
      [selectedShop.id]: {
        ...current[selectedShop.id],
        [selectedYear]: updater(current[selectedShop.id]?.[selectedYear] ?? createDefaultTaxConfig()),
      },
    }));
  };

  const saveTaxSettings = async () => {
    if (!session?.accessToken || !selectedShop) return;

    setTaxSettingsSaving(true);
    setTaxSettingsNotice(null);
    setTaxSettingsError(null);

    try {
      const taxRatePercent = getEffectiveTaxRate(currentTaxConfig);
      await apiRequest<MarketplaceFinanceSettingsResponse>(`/config/marketplace-connections/${selectedShop.id}/finance-settings`, {
        method: 'PUT',
        token: session.accessToken,
        body: JSON.stringify({
          taxEnabled: taxRatePercent > 0,
          taxRatePercent,
          taxSystem: mapTaxModeToFinanceTaxSystem(currentTaxConfig.taxMode),
        }),
      });
      setTaxSettingsNotice('Налоговые настройки сохранены. Текущий API пока хранит ставку и режим на уровне кабинета.');
    } catch (error) {
      setTaxSettingsError(error instanceof Error ? error.message : 'Не удалось сохранить налоговые настройки.');
    } finally {
      setTaxSettingsSaving(false);
    }
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
              saving={profileSaving}
              notice={profileNotice}
              apiError={apiError}
              onEditToggle={() => setIsEditingProfile(current => !current)}
              onCancelEdit={cancelProfileEdit}
              onFieldChange={updateProfileField}
              onSave={saveProfile}
              onLogout={logout}
              passwordForm={passwordForm}
              passwordSaving={passwordSaving}
              passwordNotice={passwordNotice}
              onPasswordChange={setPasswordForm}
              onPasswordSubmit={submitPasswordChange}
              onPasswordReset={sendPasswordReset}
              onDeleteCurrentUser={deleteCurrentUser}
            />
          )}

          {activeTab === 'shops' && <ShopsTab isLoading={settingsTabLoading === 'shops'} />}

          {activeTab === 'users' && <UsersTab isLoading={settingsTabLoading === 'users'} />}

          {activeTab === 'taxes' && (
            <TaxesTab
              shops={taxShops}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              selectedShopId={selectedShopId}
              onShopChange={setSelectedShopId}
              currentTaxConfig={currentTaxConfig}
              currentTaxMode={currentTaxMode}
              isLoading={taxSettingsLoading}
              isSaving={taxSettingsSaving}
              notice={taxSettingsNotice}
              error={taxSettingsError}
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
              onSave={saveTaxSettings}
            />
          )}

          {activeTab === 'metrics' && <MetricsTab customMetrics={customMetrics} isLoading={settingsTabLoading === 'metrics'} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  isEditing,
  saving,
  notice,
  apiError,
  onEditToggle,
  onCancelEdit,
  onFieldChange,
  onSave,
  onLogout,
  passwordForm,
  passwordSaving,
  passwordNotice,
  onPasswordChange,
  onPasswordSubmit,
  onPasswordReset,
  onDeleteCurrentUser,
}: {
  profile: ProfileState;
  isEditing: boolean;
  saving: boolean;
  notice: string | null;
  apiError: string | null;
  onEditToggle: () => void;
  onCancelEdit: () => void;
  onFieldChange: (field: keyof ProfileState, value: string) => void;
  onSave: () => void;
  onLogout: () => void;
  passwordForm: { currentPassword: string; newPassword: string; confirmPassword: string };
  passwordSaving: boolean;
  passwordNotice: string | null;
  onPasswordChange: (value: { currentPassword: string; newPassword: string; confirmPassword: string }) => void;
  onPasswordSubmit: () => void;
  onPasswordReset: () => void;
  onDeleteCurrentUser: () => Promise<void>;
}) {
  const fields: { key: keyof ProfileState; label: string }[] = [
    { key: 'name', label: 'Имя' },
    { key: 'surname', label: 'Фамилия' },
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
            onClick={isEditing ? onCancelEdit : onEditToggle}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <PencilLine size={16} />
            {isEditing ? 'Отменить' : 'Редактировать'}
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {isEditing && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saving ? 'Сохранение...' : 'Сохранить профиль'}
            </button>
          )}
          {!isEditing && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Роль и доступы по-прежнему управляются на уровне организации.
            </div>
          )}
        </div>

        {(notice || apiError) && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              notice ? 'bg-blue-50 text-blue-800' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {notice || apiError}
          </div>
        )}
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
              onClick={onPasswordReset}
              disabled={passwordSaving}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Запросить сброс пароля
            </button>
            <button
              type="button"
              onClick={onPasswordSubmit}
              disabled={passwordSaving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              {passwordSaving ? 'Сохранение...' : 'Сменить пароль'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <LogOut size={16} />
              Выйти из аккаунта
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-600">Текущий пароль</div>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={event => onPasswordChange({ ...passwordForm, currentPassword: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-600">Новый пароль</div>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={event => onPasswordChange({ ...passwordForm, newPassword: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-600">Подтвердите новый пароль</div>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={event => onPasswordChange({ ...passwordForm, confirmPassword: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
              />
            </label>
          </div>

          {passwordNotice && (
            <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{passwordNotice}</div>
          )}
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
            onClick={async () => {
              if (!window.confirm('Delete your profile permanently? This action cannot be undone.')) return;
              await onDeleteCurrentUser();
            }}
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

function ShopsTab({ isLoading }: { isLoading: boolean }) {
  const { session, connections, syncRuns, selectedOrganizationId, validateConnection, enqueueSync, connectShop } = usePlatform();
  const shops = connections.filter(connection => connection.organizationId === selectedOrganizationId);
  const defaultDateTo = new Date().toISOString().slice(0, 10);
  const defaultDateFrom = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [isConnectFormOpen, setIsConnectFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRuns, setHistoryRuns] = useState<SyncRun[]>([]);
  const [historyShopName, setHistoryShopName] = useState('');
  const [syncShopId, setSyncShopId] = useState<string | null>(null);
  const [syncShopName, setSyncShopName] = useState('');
  const [syncDateFrom, setSyncDateFrom] = useState(defaultDateFrom);
  const [syncDateTo, setSyncDateTo] = useState(defaultDateTo);
  const [syncDateError, setSyncDateError] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState<'Wildberries' | 'Ozon'>('Ozon');
  const [displayName, setDisplayName] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [performanceClientId, setPerformanceClientId] = useState('');
  const [performanceClientSecret, setPerformanceClientSecret] = useState('');
  const [startInitialSync, setStartInitialSync] = useState(true);
  const [connectNotice, setConnectNotice] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isMarketplaceMenuOpen, setIsMarketplaceMenuOpen] = useState(false);

  const openSyncModal = (shopId: string, shopName: string) => {
    setSyncShopId(shopId);
    setSyncShopName(shopName);
    setSyncDateFrom(defaultDateFrom);
    setSyncDateTo(defaultDateTo);
    setSyncDateError(null);
    setIsSyncModalOpen(true);
  };

  const closeSyncModal = () => {
    setIsSyncModalOpen(false);
    setSyncShopId(null);
    setSyncShopName('');
    setSyncDateError(null);
  };

  const submitSync = (marketplaceName: 'Wildberries' | 'Ozon') => {
    if (!syncShopId) return;
    if (!syncDateFrom || !syncDateTo) {
      setSyncDateError('Укажите обе даты для синхронизации.');
      return;
    }
    if (syncDateFrom > syncDateTo) {
      setSyncDateError('Дата начала не может быть позже даты окончания.');
      return;
    }

    enqueueSync({
      connectionId: syncShopId,
      dateFrom: syncDateFrom,
      dateTo: syncDateTo,
      syncKinds: marketplaceName === 'Ozon' ? ['postings', 'finance', 'returns', 'stocks'] : ['orders', 'sales', 'stocks', 'finance'],
    });
    closeSyncModal();
  };

  const openHistory = async (shopId: string, shopName: string) => {
    if (!session?.accessToken) return;

    setHistoryShopName(shopName);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await apiRequest<SyncRunApiResponse[]>(`/marketplace-connections/${shopId}/sync-runs`, {
        token: session.accessToken,
      });
      setHistoryRuns(
        (response ?? []).map(item => ({
          id: item.id,
          connectionId: item.marketplaceConnectionId,
          status:
            item.status === 'Queued' ||
            item.status === 'Running' ||
            item.status === 'Cancelled' ||
            item.status === 'Succeeded' ||
            item.status === 'Failed'
              ? item.status
              : 'Queued',
          dateFrom: item.dateFrom,
          dateTo: item.dateTo,
          syncKinds: item.syncKind ? [item.syncKind] : [],
          progressPercent: item.progressPercent,
          progressMessage: item.progressMessage ?? '',
          error: item.error ?? undefined,
          canRetry: item.canRetry,
          canCancel: item.canCancel,
          attemptCount: item.attemptCount,
          maxAttempts: item.maxAttempts,
          nextAttemptAt: item.nextAttemptAt ?? undefined,
          enqueuedAt: item.enqueuedAt ?? item.requestedAt ?? new Date().toISOString(),
        }))
      );
    } catch (error) {
      setHistoryRuns([]);
      setHistoryError(error instanceof Error ? error.message : 'Не удалось загрузить историю синхронизаций.');
    } finally {
      setHistoryLoading(false);
    }
  };

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
            onClick={() => setIsConnectFormOpen(current => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus size={16} />
            Подключить магазин
          </button>
        </div>
      </div>

      {isConnectFormOpen && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-sm font-medium text-blue-600">Новый магазин</div>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Подключение через API</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Заполните минимальные данные, чтобы создать подключение и, при желании, сразу поставить начальную синхронизацию в очередь.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <div className="mb-2 text-sm font-medium text-slate-600">Маркетплейс</div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setConnectError(null);
                      setIsMarketplaceMenuOpen(current => !current);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <div className="flex items-center gap-3">
                      <MarketplaceBadge marketplace={marketplace} compact className="border-transparent bg-slate-100" />
                      <span className="font-medium">{marketplace}</span>
                    </div>
                    <ChevronRight size={16} className={`text-slate-400 transition-transform ${isMarketplaceMenuOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {isMarketplaceMenuOpen && (
                    <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {(['Ozon', 'Wildberries'] as const).map(option => {
                        const active = marketplace === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setMarketplace(option);
                              setIsMarketplaceMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                              active ? 'bg-slate-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <MarketplaceBadge marketplace={option} compact className="border-transparent bg-slate-100" />
                              <span className="font-medium">{option}</span>
                            </div>
                            {active && <Check size={16} className="text-blue-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </label>
              <label className="block md:col-span-2">
                <div className="mb-2 text-sm font-medium text-slate-600">Название магазина (необязательно)</div>
                <input
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                  placeholder="Если маркетплейс не вернет название сам"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              {marketplace === 'Ozon' ? (
                <>
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-600">Client ID</div>
                    <input
                      value={clientId}
                      onChange={event => setClientId(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-600">API Key</div>
                    <input
                      value={apiKey}
                      onChange={event => {
                        setApiKey(event.target.value);
                        setConnectError(null);
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-600">Performance Client ID (необязательно)</div>
                    <input
                      value={performanceClientId}
                      onChange={event => {
                        setPerformanceClientId(event.target.value);
                        setConnectError(null);
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-sm font-medium text-slate-600">Performance Client Secret (необязательно)</div>
                    <input
                      value={performanceClientSecret}
                      onChange={event => {
                        setPerformanceClientSecret(event.target.value);
                        setConnectError(null);
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                </>
              ) : (
                <label className="block md:col-span-2">
                  <div className="mb-2 text-sm font-medium text-slate-600">API Token</div>
                  <input
                    value={apiToken}
                    onChange={event => setApiToken(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              )}
              <label className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={startInitialSync}
                  onChange={event => setStartInitialSync(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm text-slate-700">Запустить начальную синхронизацию сразу</span>
              </label>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const trimmedPerformanceClientId = performanceClientId.trim();
                    const trimmedPerformanceClientSecret = performanceClientSecret.trim();
                    if ((trimmedPerformanceClientId && !trimmedPerformanceClientSecret) || (!trimmedPerformanceClientId && trimmedPerformanceClientSecret)) {
                      setConnectError('Для Ozon performance credentials нужно заполнить оба поля: Client ID и Client Secret.');
                      return;
                    }

                    setConnectError(null);
                    connectShop({
                      marketplace,
                      displayName: displayName.trim() || undefined,
                      credentials:
                        marketplace === 'Ozon'
                          ? {
                              clientId: clientId.trim(),
                              apiKey: apiKey.trim(),
                              ...(trimmedPerformanceClientId && trimmedPerformanceClientSecret
                                ? {
                                    performanceClientId: trimmedPerformanceClientId,
                                    performanceClientSecret: trimmedPerformanceClientSecret,
                                  }
                                : {}),
                            }
                          : { apiToken: apiToken.trim() },
                      startInitialSync,
                      initialSyncDays: 14,
                      initialSyncKinds:
                        marketplace === 'Ozon'
                          ? ['postings', 'finance', 'returns', 'stocks']
                          : ['orders', 'sales', 'stocks', 'finance'],
                    });
                    setConnectNotice(`Подключение ${displayName.trim() || marketplace} отправлено в API.`);
                    setIsConnectFormOpen(false);
                    setDisplayName('');
                    setApiToken('');
                    setClientId('');
                    setApiKey('');
                    setPerformanceClientId('');
                    setPerformanceClientSecret('');
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Connect shop
                </button>
                <button
                  type="button"
                  onClick={() => setIsConnectFormOpen(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          {connectError && <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{connectError}</div>}
          {connectNotice && <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{connectNotice}</div>}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          Loading shop data...
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-2">
        {shops.map(shop => {
          const latestSync = syncRuns.find(run => run.id === shop.latestSyncRunId);
          const isHealthy = shop.validationState === 'Validated';

          return (
            <article key={shop.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <MarketplaceBadge marketplace={shop.marketplace} className="bg-slate-50" />
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{shop.displayName}</h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {shop.validationState}
                </span>
              </div>

              <dl className="mt-6 space-y-4">
                <MetaRow label="Креды" value={shop.credentialSummary} />
                <MetaRow label="Организация" value={shop.organizationId} />
                <MetaRow
                  label="Последняя синхронизация"
                  value={
                    latestSync ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
                          <span>{latestSync.status}</span>
                          <span className="font-semibold text-slate-900">{latestSync.progressPercent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${getSyncProgressColor(latestSync.status)}`}
                            style={{ width: `${Math.min(100, Math.max(0, latestSync.progressPercent))}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500">
                          {latestSync.progressMessage || 'Синхронизация выполняется...'}
                        </div>
                      </div>
                    ) : (
                      'Нет данных'
                    )
                  }
                />
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
                  onClick={() => void validateConnection(shop.id)}
                  className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Проверить
                </button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => openSyncModal(shop.id, shop.displayName)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Запустить синхронизацию
                </button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void openHistory(shop.id, shop.displayName)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  История синхронизаций
                </button>
              </div>
            </article>
          );
        })}

        {!isLoading && shops.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Для текущей организации пока нет подключенных магазинов.
          </div>
        )}
      </div>

      {isHistoryOpen && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              setIsHistoryOpen(false);
            }
          }}
        >
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-sm font-medium text-blue-600">История синхронизаций</div>
                <h3 className="text-2xl font-semibold text-slate-900">{historyShopName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Закрыть
              </button>
            </div>

            <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-6 py-5">
              {historyLoading && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  Загружаем синхронизации...
                </div>
              )}

              {historyError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {historyError}
                </div>
              )}

              {!historyLoading && !historyError && (
                <div className="space-y-3">
                  {historyRuns.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Для этого магазина пока нет запусков синхронизации.
                    </div>
                  ) : (
                    historyRuns.map(run => (
                      <article key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{run.id}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {run.dateFrom} → {run.dateTo} · {run.syncKinds.join(', ')}
                            </div>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                            {run.status}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                          <div>Прогресс: {run.progressPercent}%</div>
                          <div>Попытки: {run.attemptCount}/{run.maxAttempts}</div>
                          <div>Можно повторить: {run.canRetry ? 'Да' : 'Нет'}</div>
                          <div>Можно отменить: {run.canCancel ? 'Да' : 'Нет'}</div>
                        </div>

                        <div className="mt-3">
                          <div className="h-2 overflow-hidden rounded-full bg-white">
                            <div
                              className={`h-full rounded-full ${getSyncProgressColor(run.status)}`}
                              style={{ width: `${Math.min(100, Math.max(0, run.progressPercent))}%` }}
                            />
                          </div>
                          <div className="mt-2 text-sm text-slate-500">
                            {run.progressMessage || 'Идет синхронизация данных...'}
                          </div>
                        </div>

                        <div className="mt-2 text-sm text-slate-500">
                          <div>Запрошено: {new Date(run.enqueuedAt).toLocaleString('ru-RU')}</div>
                          {run.nextAttemptAt && <div>Следующая попытка: {new Date(run.nextAttemptAt).toLocaleString('ru-RU')}</div>}
                          {run.error && <div className="mt-1 text-rose-600">Ошибка: {run.error}</div>}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSyncModalOpen && (
        <div
          className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              closeSyncModal();
            }
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-sm font-medium text-blue-600">Синхронизация</div>
                <h3 className="text-2xl font-semibold text-slate-900">{syncShopName}</h3>
              </div>
              <button
                type="button"
                onClick={closeSyncModal}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <p className="text-sm leading-6 text-slate-500">
                Укажите период для запуска синхронизации. В API будет отправлен payload с полями <code>dateFrom</code> и <code>dateTo</code> в camelCase.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-600">Дата начала</div>
                  <input
                    type="date"
                    value={syncDateFrom}
                    max={syncDateTo || undefined}
                    onChange={event => {
                      setSyncDateFrom(event.target.value);
                      setSyncDateError(null);
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-slate-600">Дата окончания</div>
                  <input
                    type="date"
                    value={syncDateTo}
                    min={syncDateFrom || undefined}
                    max={defaultDateTo}
                    onChange={event => {
                      setSyncDateTo(event.target.value);
                      setSyncDateError(null);
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              {syncDateError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{syncDateError}</div>}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const shop = shops.find(item => item.id === syncShopId);
                    if (shop) {
                      submitSync(shop.marketplace);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Запустить синхронизацию
                </button>
                <button
                  type="button"
                  onClick={closeSyncModal}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function UsersTab({ isLoading }: { isLoading: boolean }) {
  const {
    members,
    invitations,
    selectedOrganizationId,
    organizations,
    inviteMember,
    renameOrganization,
    updateMemberRole,
    removeMember,
    transferOrganizationOwnership,
    revokeInvitation,
    apiError,
  } = usePlatform();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationMember['role']>('Manager');
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const activeOrganization = organizations.find(org => org.id === selectedOrganizationId);

  useEffect(() => {
    setOrganizationName(activeOrganization?.name ?? '');
  }, [activeOrganization?.id, activeOrganization?.name]);

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return;

    inviteMember({ email, role: inviteRole });
    setInviteNotice(`Invite queued for ${email} in organization ${selectedOrganizationId}.`);
    setInviteEmail('');
  };

  const handleRenameOrganization = async () => {
    if (!activeOrganization || !organizationName.trim()) return;
    setActionNotice(null);
    await renameOrganization(activeOrganization.id, organizationName.trim());
    setActionNotice('Organization name updated.');
  };

  const handleRoleChange = async (memberId: string, role: OrganizationMember['role']) => {
    setBusyMemberId(memberId);
    setActionNotice(null);
    try {
      await updateMemberRole({ memberId, role });
      setActionNotice(`Member role updated to ${role}.`);
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setBusyMemberId(memberId);
    setActionNotice(null);
    try {
      await removeMember(memberId);
      setActionNotice('Member removed from the organization.');
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleTransfer = async (memberId: string) => {
    setBusyMemberId(memberId);
    setActionNotice(null);
    try {
      await transferOrganizationOwnership(memberId);
      setActionNotice('Organization ownership transferred.');
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setBusyInvitationId(invitationId);
    setActionNotice(null);
    try {
      await revokeInvitation(invitationId);
      setActionNotice('Invitation revoked.');
    } finally {
      setBusyInvitationId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-medium text-blue-600">Organization</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Current organization settings</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Rename the active workspace and manage members, invitations, and ownership from one place.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {activeOrganization?.id ?? 'No organization selected'}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            value={organizationName}
            onChange={event => setOrganizationName(event.target.value)}
            placeholder="Organization name"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={() => void handleRenameOrganization()}
            disabled={!activeOrganization || !organizationName.trim()}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Rename
          </button>
        </div>

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
            onClick={handleInvite}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus size={16} />
            Пригласить пользователя
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <input
            value={inviteEmail}
            onChange={event => setInviteEmail(event.target.value)}
            placeholder="manager@company.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <select
            value={inviteRole}
            onChange={event => setInviteRole(event.target.value as OrganizationMember['role'])}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="Owner">Owner</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
          </select>
          <button
            type="button"
            onClick={handleInvite}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Отправить
          </button>
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            Loading team data...
          </div>
        )}

        {inviteNotice && <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{inviteNotice}</div>}
        {actionNotice && <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{actionNotice}</div>}
        {apiError && <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{apiError}</div>}
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
          {members.map(member => {
            const fullName = `${member.firstName} ${member.lastName}`.trim() || member.email;

            return (
              <div key={member.id} className="grid gap-4 px-5 py-5 md:grid-cols-[1.2fr_0.8fr_1fr_1fr_0.8fr] md:px-6">
                <div className="space-y-3 md:space-y-1">
                  <div className="font-semibold text-slate-900">{fullName}</div>
                  <div className="text-sm text-slate-500">{member.phone}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">Роль</div>
                  <select
                    value={member.role}
                    onChange={event => void handleRoleChange(member.id, event.target.value as OrganizationMember['role'])}
                    disabled={member.role === 'Owner' || busyMemberId === member.id}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:bg-slate-50"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <MobileInfoRow label="Контакты" value={member.email} />
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">Действия</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleTransfer(member.id)}
                      disabled={member.id === activeOrganization?.ownerUserId || busyMemberId === member.id}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove(member.id)}
                      disabled={member.role === 'Owner' || busyMemberId === member.id}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 md:block">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">Статус</div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      member.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
              </div>
            );
          })}

          {invitations.map(invitation => (
            <div key={invitation.id} className="grid gap-4 px-5 py-5 md:grid-cols-[1.2fr_0.8fr_1fr_0.9fr_0.8fr] md:px-6">
              <div className="space-y-3 md:space-y-1">
                <div className="font-semibold text-slate-900">{invitation.email}</div>
                <div className="text-sm text-slate-500">Invitation ID: {invitation.id}</div>
              </div>
              <MobileInfoRow label="Роль" value={invitation.role} />
              <MobileInfoRow label="Контакты" value="—" />
              <MobileInfoRow label="Доступ" value="Pending invite" />
              <div className="flex items-center justify-between gap-3 md:block">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 md:hidden">Статус</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    {invitation.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(invitation.id)}
                    disabled={busyInvitationId === invitation.id}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TaxesTab({
  shops,
  selectedYear,
  onYearChange,
  selectedShopId,
  onShopChange,
  currentTaxConfig,
  currentTaxMode,
  isLoading,
  isSaving,
  notice,
  error,
  onTaxModeChange,
  onCostExpenseToggle,
  onQuarterChange,
  onMonthChange,
  onSave,
}: {
  shops: MarketplaceConnection[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedShopId: string;
  onShopChange: (shopId: string) => void;
  currentTaxConfig: TaxConfig;
  currentTaxMode: (typeof TAX_MODES)[number];
  isLoading: boolean;
  isSaving: boolean;
  notice: string | null;
  error: string | null;
  onTaxModeChange: (mode: TaxModeId) => void;
  onCostExpenseToggle: () => void;
  onQuarterChange: (quarterIndex: number, field: 'taxRate' | 'vatRate', value: string) => void;
  onMonthChange: (quarterIndex: number, monthIndex: number, field: 'taxRate' | 'vatRate', value: string) => void;
  onSave: () => void;
}) {
  if (shops.length === 0) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-blue-600">Налоги</div>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Настройка налоговых режимов</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Подключите хотя бы один кабинет, чтобы настроить налоговые параметры и использовать бизнес-метрики в отчетах.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <div className="text-sm font-medium text-blue-600">Налоги</div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Настройка налоговых режимов</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Режим налогообложения выбирается на кабинет на год. Налоговую ставку и НДС можно задавать по кварталу
              и уточнять по месяцам внутри квартала. Текущий API пока сохраняет режим и ставку на уровне кабинета,
              поэтому помесячная сетка здесь выступает как подготовленная форма для будущего расширения контракта.
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
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>
                        {shop.displayName}
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
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить все'}
            </button>
          </div>

          {isLoading && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              Загружаем налоговые настройки кабинета...
            </div>
          )}

          {notice && <div className="mb-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</div>}
          {error && <div className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

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

function MetricsTab({ customMetrics, isLoading }: { customMetrics: CustomMetric[]; isLoading: boolean }) {
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

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-600 shadow-sm">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          Loading custom metrics...
        </div>
      ) : customMetrics.length === 0 ? (
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
                  <p className="mt-1 text-sm text-slate-500">Единица измерения: {metric.unitLabel || 'Не указана'}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    metric.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {metric.active ? 'Активна' : 'Неактивна'}
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

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
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
