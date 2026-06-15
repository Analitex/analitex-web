import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Clock3,
  Database,
  History,
  LockKeyhole,
  Plug,
  Plus,
  Rocket,
  ShieldCheck,
  TimerReset,
  UserPlus,
  Users,
} from 'lucide-react';
import { MarketplaceBadge } from '../components/common/MarketplaceIcon';
import { usePlatform } from '../context/PlatformContext';
import type { Page } from '../types';
import {
  CONNECTOR_CATALOG,
  CONNECT_SHOP_FLOW,
  DIMENSIONS_CATALOG,
  FIRST_OWNER_FLOW,
  HISTORICAL_SYNC_FLOW,
  METRICS_CATALOG,
  getPreferredSyncKinds,
  RECOMMENDED_LOAD_SEQUENCE,
  RECOMMENDED_PRODUCT_LOAD_SEQUENCE,
  PRODUCT_REPORT_METRICS_CATALOG,
} from '../lib/platformCatalog';
import { apiRequest } from '../lib/api';

const OVERVIEW_SUMMARY_METRICS = ['sales', 'commission', 'logistics', 'storage', 'returns', 'ordersCount', 'stockBalance'] as const;

function Surface({ children }: { children: ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">{children}</section>;
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-blue-600">{eyebrow}</div>
      <h2 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function JsonPanel({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-50">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      </div>
      <pre className="overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-200">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'emerald' | 'amber' }) {
  const classes = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes[tone]}`}>{children}</span>;
}

type ProductMetricsApiResponse = {
  metrics?: { key?: string | null; label?: string | null }[] | null;
};

type ProductOverviewApiResponse = {
  scope?: unknown;
  query?: unknown;
  summary?: unknown;
  topProducts?: unknown[];
  meta?: unknown;
};

type ProductRowsApiResponse = {
  scope?: unknown;
  query?: unknown;
  rows?: unknown[];
  summary?: unknown;
  pagination?: unknown;
  meta?: unknown;
};

type ProductDetailsApiResponse = {
  scope?: unknown;
  query?: unknown;
  metric?: string;
  total?: unknown;
  breakdown?: unknown[];
  meta?: unknown;
};

export function PlatformHomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const cards = [
    {
      title: 'Авторизация',
      text: 'Эндпоинты регистрации, входа, профиля и пароля.',
      icon: LockKeyhole,
      page: 'auth',
    },
    {
      title: 'Организации',
      text: 'Команды, приглашения, роли, владение и участники.',
      icon: Users,
      page: 'organizations',
    },
    {
      title: 'Подключения',
      text: 'Connect-shop, проверка, синхронизация, повтор и отмена.',
      icon: Plug,
      page: 'connections',
    },
    {
      title: 'Аналитика',
      text: 'Сводка, тренды, детализация, объяснения и метаданные.',
      icon: Database,
      page: 'analytics',
    },
    {
      title: 'История',
      text: 'Трек навигации и записанные действия платформы.',
      icon: History,
      page: 'history',
    },
  ] as const;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="max-w-3xl">
          <Pill tone="blue">Рабочие сценарии</Pill>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Веб-приложение соответствует рабочим сценариям AiStats.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Используйте экраны ниже, чтобы пройти сценарии онбординга, маркетплейсов, синхронизации и аналитики,
            описанные в документации продукта. Каждая страница построена вокруг рабочих сценариев кабинета.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
            >
              Открыть авторизацию
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('connections')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Посмотреть подключения
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => onNavigate(card.page)}
              className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white transition-transform group-hover:scale-105">
                <Icon size={20} />
              </div>
              <div className="mt-4 text-lg font-semibold text-slate-900">{card.title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.text}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface>
          <SectionTitle
            eyebrow="Рекомендуемый сценарий"
            title="Что приложение должно делать первым"
            description="Это последовательности загрузки, которые помогают держать онбординг и состояние кабинета согласованными."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <FlowList title="Загрузка кабинета" items={RECOMMENDED_LOAD_SEQUENCE} />
            <FlowList title="Товарный экран" items={RECOMMENDED_PRODUCT_LOAD_SEQUENCE} />
            <FlowList title="Онбординг первого владельца" items={FIRST_OWNER_FLOW} />
            <FlowList title="Подключение магазина" items={CONNECT_SHOP_FLOW} />
            <FlowList title="Историческая синхронизация" items={HISTORICAL_SYNC_FLOW} />
          </div>
        </Surface>

        <Surface>
          <SectionTitle
            eyebrow="Операционная справка"
            title="Обзор рабочих областей"
            description="Приложение показывает ключевые сценарии, которые нужны для полноценной работы кабинета."
          />
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill tone="blue">Авторизация</Pill>
            <Pill tone="emerald">Организации</Pill>
            <Pill tone="amber">Подключения</Pill>
            <Pill tone="slate">Аналитика</Pill>
            <Pill tone="slate">Метаданные</Pill>
            <Pill tone="slate">Пользовательские метрики</Pill>
            <Pill tone="slate">Состояние</Pill>
          </div>
        </Surface>
      </div>
    </div>
  );
}

function FlowList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map(item => (
          <li key={item} className="flex gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getConnectorFields(marketplace: 'Wildberries' | 'Ozon') {
  return CONNECTOR_CATALOG.find(item => item.marketplace === marketplace)?.credentialFields ?? [];
}

function serializeSyncKinds(syncKinds: readonly string[]) {
  return syncKinds.join(',');
}

export function AuthPage() {
  const { session, register, login, logout, requestEmailVerification, verifyEmail } = usePlatform();
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [verificationForm, setVerificationForm] = useState({
    email: '',
    code: '',
  });

  const authMe = session
    ? {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        phone: session.user.phone,
        status: session.user.status,
        emailVerifiedAt: session.user.emailVerifiedAt,
        isEmailVerified: session.user.isEmailVerified,
      }
    : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Surface>
        <SectionTitle
          eyebrow="Авторизация"
          title="Регистрация, вход и текущий пользователь"
          description="Регистрация создает пользователя и отправляет код подтверждения. После verify-email пользователь входит через login и получает bearer-токен."
        />
      </Surface>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Регистрация</h3>
              <p className="text-sm text-slate-500">Создание учетной записи владельца</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(['firstName', 'lastName', 'email', 'phone', 'password'] as const).map(key => (
              <label key={key} className={key === 'password' ? 'sm:col-span-2' : ''}>
                  <div className="mb-2 text-sm font-medium text-slate-600">
                    {key === 'firstName'
                      ? 'Имя'
                      : key === 'lastName'
                        ? 'Фамилия'
                        : key === 'email'
                          ? 'Эл. почта'
                          : key === 'phone'
                            ? 'Телефон'
                            : 'Пароль'}
                  </div>
                <input
                  type={key === 'password' ? 'password' : 'text'}
                  value={registerForm[key]}
                  onChange={event => setRegisterForm(current => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              void register(registerForm).then(result => {
                setVerificationForm(current => ({ ...current, email: result.user.email }));
                setLoginForm(current => ({ ...current, email: result.user.email, password: registerForm.password }));
              })
            }
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Создать аккаунт
          </button>
        </Surface>

        <Surface>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Вход</h3>
              <p className="text-sm text-slate-500">Авторизация в кабинете</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Эл. почта</div>
              <input
                type="email"
                value={loginForm.email}
                onChange={event => setLoginForm(current => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Пароль</div>
              <input
                type="password"
                value={loginForm.password}
                onChange={event => setLoginForm(current => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void login(loginForm)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Войти
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Выйти
            </button>
          </div>
        </Surface>
      </div>

      <Surface>
        <SectionTitle
          eyebrow="Подтверждение почты"
          title="Email verification"
          description="Запросите код подтверждения и проверьте его для выбранного email."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label>
            <div className="mb-2 text-sm font-medium text-slate-600">Эл. почта</div>
            <input
              type="email"
              value={verificationForm.email}
              onChange={event => setVerificationForm(current => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
            />
          </label>
          <label>
            <div className="mb-2 text-sm font-medium text-slate-600">Код</div>
            <input
              value={verificationForm.code}
              onChange={event => setVerificationForm(current => ({ ...current, code: event.target.value }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void requestEmailVerification(verificationForm.email)}
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Отправить код
          </button>
          <button
            type="button"
            onClick={() => void verifyEmail(verificationForm)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Подтвердить почту
          </button>
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface>
          <div className="flex items-center justify-between gap-3">
            <SectionTitle
            eyebrow="Сессия"
            title="Содержимое bearer-токена"
            description="Приложение хранит текущую сессию в localStorage, чтобы состояние авторизации переживало обновление страницы."
            />
            <Pill tone={session ? 'emerald' : 'amber'}>{session ? 'В системе' : 'Не вошли'}</Pill>
          </div>
          <div className="mt-5 space-y-4">
            <Row label="Проверка auth/me" value={session ? 'Доступно' : 'Нет сессии'} />
            <Row label="Истекает" value={session?.expiresAt ?? '—'} />
            <Row label="Тип токена" value={session?.tokenType ?? 'Bearer'} />
          </div>
          <div className="mt-5">
            <JsonPanel label="Сессия" value={session ?? { accessToken: 'jwt', tokenType: 'Bearer', expiresAt: '—', user: null }} />
          </div>
        </Surface>

        <Surface>
          <SectionTitle
            eyebrow="Профиль"
            title="Операции с пользователем"
            description="В кабинете есть сценарии профиля, подтверждения почты и смены пароля."
          />
          <div className="mt-5 grid gap-3">
            {[
              'Просмотр текущего пользователя',
              'Обновление профиля',
              'Смена пароля',
              'Удаление аккаунта',
              'Запрос подтверждения почты',
              'Подтверждение почты',
              'Запрос сброса пароля',
              'Сброс пароля',
            ].map(action => (
              <div key={action} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {action}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            {authMe ? 'Текущий пользователь доступен для страниц организаций, подключений и аналитики.' : 'Зарегистрируйтесь или войдите, чтобы заполнить остальные страницы.'}
          </div>
        </Surface>
      </div>
    </div>
  );
}

export function OrganizationsPage() {
  const { organizations, selectedOrganizationId, selectOrganization, members, invitations, createOrganization, inviteMember } = usePlatform();
  const [organizationName, setOrganizationName] = useState('Acme');
  const [inviteEmail, setInviteEmail] = useState('manager@company.com');
  const [inviteRole, setInviteRole] = useState<'Manager' | 'Admin'>('Manager');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Surface>
        <SectionTitle
          eyebrow="Организации"
          title="Команды, участники, приглашения и владение"
          description="Эти страницы поддерживают рабочие сценарии организации: создание, список, участники и приглашения."
        />
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Создать организацию</h3>
          <div className="mt-4">
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Название организации</div>
              <input
                value={organizationName}
                onChange={event => setOrganizationName(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => createOrganization(organizationName)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus size={16} />
            Создать и выбрать
          </button>

          <div className="mt-6 space-y-3">
            {organizations.map(org => (
              <button
                key={org.id}
                type="button"
                onClick={() => selectOrganization(org.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                  selectedOrganizationId === org.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900">{org.name}</div>
                  <div className="text-sm text-slate-500">{selectedOrganizationId === org.id ? 'Выбрана' : 'Доступна'}</div>
                </div>
                <Pill tone={selectedOrganizationId === org.id ? 'blue' : 'slate'}>{selectedOrganizationId === org.id ? 'Выбрано' : 'Переключить'}</Pill>
              </button>
            ))}
          </div>
        </Surface>

        <div className="space-y-6">
          <Surface>
            <h3 className="text-lg font-semibold text-slate-900">Участники</h3>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[1.1fr_0.8fr_1.1fr_0.7fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <div>Пользователь</div>
                <div>Роль</div>
                <div>Эл. почта</div>
                <div>Статус</div>
              </div>
              {members.map(member => (
                <div key={member.id} className="grid grid-cols-[1.1fr_0.8fr_1.1fr_0.7fr] gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0">
                  <div className="font-medium text-slate-900">{member.firstName} {member.lastName}</div>
                  <div className="text-sm text-slate-600">{member.role === 'Owner' ? 'Владелец' : member.role === 'Admin' ? 'Администратор' : 'Менеджер'}</div>
                  <div className="text-sm text-slate-600">{member.email}</div>
                  <div className="text-sm text-slate-600">{member.status === 'Active' ? 'Активен' : member.status === 'Invited' ? 'Приглашен' : 'Неактивен'}</div>
                </div>
              ))}
            </div>
          </Surface>

          <Surface>
            <h3 className="text-lg font-semibold text-slate-900">Приглашения</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_0.7fr_auto]">
              <input
                value={inviteEmail}
                onChange={event => setInviteEmail(event.target.value)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
              <select
                value={inviteRole}
                onChange={event => setInviteRole(event.target.value as typeof inviteRole)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              >
                <option value="Manager">Менеджер</option>
                <option value="Admin">Администратор</option>
              </select>
              <button
                type="button"
                onClick={() => inviteMember({ email: inviteEmail, role: inviteRole })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Отправить приглашение
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {invitations.map(invitation => (
                <div key={invitation.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <div className="font-medium text-slate-900">{invitation.email}</div>
                    <div className="text-sm text-slate-500">{invitation.role === 'Owner' ? 'Владелец' : invitation.role === 'Admin' ? 'Администратор' : 'Менеджер'}</div>
                  </div>
                  <Pill tone={invitation.status === 'Pending' ? 'amber' : invitation.status === 'Accepted' ? 'emerald' : 'slate'}>
                    {invitation.status === 'Pending' ? 'Ожидает' : invitation.status === 'Accepted' ? 'Принято' : 'Отозвано'}
                  </Pill>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}

export function ConnectionsPage() {
  const { connectors, connections, syncRuns, selectedOrganizationId, connectShop, enqueueSync, retrySync, cancelSync } = usePlatform();
  const [marketplace, setMarketplace] = useState<'Wildberries' | 'Ozon'>('Wildberries');
  const [displayName, setDisplayName] = useState('WB Main Shop');
  const [startInitialSync, setStartInitialSync] = useState(true);
  const [initialSyncDays, setInitialSyncDays] = useState(14);
  const [selectedConnectionId, setSelectedConnectionId] = useState('conn-wb-main');
  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo, setDateTo] = useState('2026-04-18');
  const [syncKinds, setSyncKinds] = useState(() => serializeSyncKinds(getPreferredSyncKinds('Wildberries')));
  const [credentials, setCredentials] = useState<Record<string, string>>({ apiToken: 'token' });
  const [connectionFormError, setConnectionFormError] = useState<string | null>(null);

  const connector = useMemo(() => connectors.find(item => item.marketplace === marketplace) ?? connectors[0], [connectors, marketplace]);
  const preferredSyncKinds = useMemo(
    () => getPreferredSyncKinds(marketplace, connector?.supportedSyncKinds ?? []),
    [connector?.supportedSyncKinds, marketplace]
  );
  const connectionOptions = connections.filter(item => item.organizationId === selectedOrganizationId);
  const selectedConnection = connectionOptions.find(item => item.id === selectedConnectionId) ?? connectionOptions[0] ?? connections[0];

  useEffect(() => {
    const next: Record<string, string> = {};
    getConnectorFields(marketplace).forEach(field => {
      next[field.key] = field.key === 'clientId' ? '12345' : 'token';
    });
    setCredentials(next);
    setDisplayName(marketplace === 'Wildberries' ? 'WB Main Shop' : 'Ozon Main Shop');
    setSyncKinds(serializeSyncKinds(preferredSyncKinds));
    setConnectionFormError(null);
  }, [marketplace, preferredSyncKinds]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Surface>
        <SectionTitle
          eyebrow="Подключения"
          title="Каталог коннекторов, магазины и мониторинг синхронизации"
          description="Эта страница покрывает подключение маркетплейсов, ручную историческую синхронизацию и действия над запусками."
        />
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Подключить магазин</h3>
          <div className="mt-4 grid gap-4">
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Маркетплейс</div>
              <select
                value={marketplace}
                onChange={event => setMarketplace(event.target.value as 'Wildberries' | 'Ozon')}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              >
                <option value="Wildberries">Wildberries</option>
                <option value="Ozon">Ozon</option>
              </select>
            </label>

            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Название магазина</div>
              <input
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {connector.credentialFields.map(field => (
                <label key={field.key}>
                  <div className="mb-2 text-sm font-medium text-slate-600">{field.label}</div>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    value={credentials[field.key] ?? ''}
                    required={field.required !== false}
                    onChange={event => {
                      setCredentials(current => ({ ...current, [field.key]: event.target.value }));
                      setConnectionFormError(null);
                    }}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                  />
                </label>
              ))}
            </div>

            {connectionFormError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {connectionFormError}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <div className="mb-2 text-sm font-medium text-slate-600">Дней для первой синхронизации</div>
                <input
                  type="number"
                  value={initialSyncDays}
                  onChange={event => setInitialSyncDays(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                />
              </label>
              <label>
                <div className="mb-2 text-sm font-medium text-slate-600">Типы синхронизации</div>
                <input
                  value={syncKinds}
                  onChange={event => setSyncKinds(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={startInitialSync}
                onChange={event => setStartInitialSync(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span className="text-sm leading-6 text-slate-700">Запустить первую синхронизацию сразу</span>
            </label>

            <button
              type="button"
              onClick={() => {
                const missingCredentialFields = connector.credentialFields.filter(
                  field => field.required !== false && !(credentials[field.key] ?? '').trim()
                );
                if (missingCredentialFields.length > 0) {
                  setConnectionFormError(
                    `Заполните обязательные поля: ${missingCredentialFields.map(field => field.label).join(', ')}.`
                  );
                  return;
                }

                setConnectionFormError(null);
                connectShop({
                  marketplace,
                  displayName,
                  credentials,
                  startInitialSync,
                  initialSyncDays,
                  initialSyncKinds: syncKinds.split(',').map(item => item.trim()).filter(Boolean),
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Rocket size={16} />
              Подключить магазин
            </button>
          </div>
        </Surface>

        <div className="space-y-6">
          <Surface>
            <h3 className="text-lg font-semibold text-slate-900">Каталог коннекторов</h3>
            <div className="mt-4 grid gap-3">
              {connectors.map(item => (
                <div key={item.marketplace} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{item.label}</div>
                      <div className="text-sm text-slate-500">Поддерживаемые типы: {item.supportedSyncKinds.join(', ')}</div>
                    </div>
                    <Pill tone="blue">{item.marketplace}</Pill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.credentialFields.map(field => (
                      <Pill key={field.key} tone="slate">
                        {field.label}
                      </Pill>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Surface>

          <Surface>
            <h3 className="text-lg font-semibold text-slate-900">Список подключений</h3>
            <div className="mt-4 space-y-3">
              {connectionOptions.map(connection => (
                <button
                  key={connection.id}
                  type="button"
                  onClick={() => setSelectedConnectionId(connection.id)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                    selectedConnection?.id === connection.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{connection.displayName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <MarketplaceBadge marketplace={connection.marketplace} compact className="border-transparent bg-slate-100" />
                        <span>{connection.credentialSummary}</span>
                      </div>
                    </div>
                    <Pill tone={connection.validationState === 'Validated' ? 'emerald' : 'amber'}>{connection.validationState}</Pill>
                  </div>
                </button>
              ))}
            </div>
          </Surface>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div>
            <h3 className="text-lg font-semibold text-slate-900">Монитор синхронизации</h3>
            </div>
            <Pill tone={selectedConnection?.displayName ? 'slate' : 'amber'}>
              {selectedConnection?.displayName ?? 'Подключение не выбрано'}
            </Pill>
          </div>

          <div className="mt-4 space-y-3">
            {syncRuns.filter(run => run.connectionId === selectedConnection?.id).map(run => (
              <div key={run.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{run.status}</div>
                    <div className="text-sm text-slate-500">{run.dateFrom} → {run.dateTo} · {run.syncKinds.join(', ')}</div>
                  </div>
                  <Pill tone={run.status === 'Succeeded' ? 'emerald' : run.status === 'Running' ? 'blue' : run.status === 'Cancelled' ? 'slate' : 'amber'}>
                    {run.progressPercent}%
                  </Pill>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${run.progressPercent}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
                  <span>{run.progressMessage}</span>
                    <span>Попытки {run.attemptCount}/{run.maxAttempts}</span>
                  {run.nextAttemptAt && <span>Следующая попытка {run.nextAttemptAt}</span>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => retrySync(run.id)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    Повторить
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelSync(run.id)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    Отменить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
              <h3 className="text-lg font-semibold text-slate-900">Ручная историческая синхронизация</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
                <div className="mb-2 text-sm font-medium text-slate-600">Дата начала</div>
              <input
                type="date"
                value={dateFrom}
                onChange={event => setDateFrom(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </label>
            <label>
                <div className="mb-2 text-sm font-medium text-slate-600">Дата окончания</div>
              <input
                type="date"
                value={dateTo}
                onChange={event => setDateTo(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </label>
          </div>
          <label className="mt-4 block">
            <div className="mb-2 text-sm font-medium text-slate-600">Типы синхронизации</div>
            <input
              value={syncKinds}
              onChange={event => setSyncKinds(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              enqueueSync({
                connectionId: selectedConnection?.id ?? connections[0].id,
                dateFrom,
                dateTo,
                syncKinds: syncKinds.split(',').map(item => item.trim()).filter(Boolean),
              })
            }
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <TimerReset size={16} />
            Запустить синхронизацию
          </button>
        </Surface>
      </div>
    </div>
  );
}

export function AnalyticsWorkbenchPage() {
  const { session } = usePlatform();
  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo, setDateTo] = useState('2026-04-17');
  const [mode, setMode] = useState<'Management' | 'Financial'>('Management');
  const [grain, setGrain] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [groupBy, setGroupBy] = useState<'Product' | 'Brand' | 'Category' | 'Account' | 'Marketplace' | 'Date' | 'Week' | 'Month'>('Product');
  const [metric, setMetric] = useState('sales');
  const [summaryResponse, setSummaryResponse] = useState<unknown>(null);
  const [trendsResponse, setTrendsResponse] = useState<unknown>(null);
  const [breakdownResponse, setBreakdownResponse] = useState<unknown>(null);
  const [explanationsResponse, setExplanationsResponse] = useState<unknown>(null);
  const [metricsResponse, setMetricsResponse] = useState<string[]>([...METRICS_CATALOG]);
  const [dimensionsResponse, setDimensionsResponse] = useState<string[]>([...DIMENSIONS_CATALOG]);
  const [validateResponse, setValidateResponse] = useState<unknown>(null);
  const [previewResponse, setPreviewResponse] = useState<unknown>(null);
  const [productMetricsResponse, setProductMetricsResponse] = useState<string[]>([]);
  const [productOverviewResponse, setProductOverviewResponse] = useState<ProductOverviewApiResponse | null>(null);
  const [productRowsResponse, setProductRowsResponse] = useState<ProductRowsApiResponse | null>(null);
  const [productDetailsResponse, setProductDetailsResponse] = useState<ProductDetailsApiResponse | null>(null);
  const [productMetric, setProductMetric] = useState('profit');
  const [productSortMetric, setProductSortMetric] = useState('sales');
  const [productSortDirection, setProductSortDirection] = useState<'Asc' | 'Desc'>('Desc');
  const [productPage, setProductPage] = useState(1);
  const [productLimit, setProductLimit] = useState(30);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  type MetricsCatalogApiResponse = { metrics?: { key?: string | null; label?: string | null }[] | null };
  type DimensionsCatalogApiResponse = { dimensions?: { key?: string | null; label?: string | null }[] | null };
  type ValidateCustomMetricApiResponse = { isValid: boolean; errors?: string[] | null; referencedMetrics?: string[] | null };
  type PreviewCustomMetricApiResponse = { isValid: boolean; value?: number | null; errors?: string[] | null; referencedMetrics?: string[] | null };

  const summaryRequest = useMemo(() => ({ dateFrom, dateTo, mode, metrics: [...OVERVIEW_SUMMARY_METRICS] }), [dateFrom, dateTo, mode]);
  const trendsRequest = useMemo(() => ({ dateFrom, dateTo, grain, metrics: METRICS_CATALOG.slice(0, 6) }), [dateFrom, dateTo, grain]);
  const breakdownRequest = useMemo(
    () => ({ dateFrom, dateTo, groupBy, metrics: [...METRICS_CATALOG], sort: { metric: 'sales', direction: 'Desc' }, page: 1, limit: 50 }),
    [dateFrom, dateTo, groupBy]
  );
  const explanationRequest = useMemo(() => ({ dateFrom, dateTo, metric }), [dateFrom, dateTo, metric]);
  const customMetricValidation = useMemo(() => ({ formula: '(sales - commission - logistics) / sales' }), []);
  const productSummaryMetrics = PRODUCT_REPORT_METRICS_CATALOG;
  const productOverviewRequest = useMemo(() => ({
    dateFrom,
    dateTo,
    mode,
    summaryMetrics: productSummaryMetrics.slice(0, 5),
    topProductMetrics: productSummaryMetrics.slice(0, 4),
    topProductsSortMetric: productSortMetric,
    topProductsSortDirection: productSortDirection,
    topProductsLimit: 5,
  }), [dateFrom, dateTo, mode, productSortDirection, productSortMetric, productSummaryMetrics]);
  const productTableRequest = useMemo(() => ({
    dateFrom,
    dateTo,
    mode,
    metrics: productSummaryMetrics,
    sort: { metric: productSortMetric, direction: productSortDirection },
    page: productPage,
    limit: productLimit,
  }), [dateFrom, dateTo, mode, productLimit, productPage, productSortDirection, productSortMetric, productSummaryMetrics]);
  const productDetailsRequest = useMemo(() => ({
    dateFrom,
    dateTo,
    mode,
    metric: productMetric,
  }), [dateFrom, dateTo, mode, productMetric]);

  useEffect(() => {
    if (!session?.accessToken) return;

    let cancelled = false;

    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const [metrics, dimensions, summary, trends, breakdown, explanations, validation, preview, productMetrics, productOverview, productRows, productDetails] = await Promise.all([
          apiRequest<MetricsCatalogApiResponse>('/metadata/metrics', { token: session.accessToken }),
          apiRequest<DimensionsCatalogApiResponse>('/metadata/dimensions', { token: session.accessToken }),
          apiRequest<unknown>('/overview/summary', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(summaryRequest),
          }),
          apiRequest<unknown>('/analytics/trends', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(trendsRequest),
          }),
          apiRequest<unknown>('/analytics/breakdown', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(breakdownRequest),
          }),
          apiRequest<unknown>('/analytics/explanations', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(explanationRequest),
          }),
          apiRequest<ValidateCustomMetricApiResponse>('/config/custom-metrics/validate', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify({ formula: customMetricValidation.formula }),
          }),
          apiRequest<PreviewCustomMetricApiResponse>('/config/custom-metrics/preview', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(customMetricValidation),
          }),
          apiRequest<ProductMetricsApiResponse>('/reporting/product-metrics', {
            token: session.accessToken,
          }),
          apiRequest<ProductOverviewApiResponse>('/reporting/products/overview', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(productOverviewRequest),
          }),
          apiRequest<ProductRowsApiResponse>('/reporting/products/query', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(productTableRequest),
          }),
          apiRequest<ProductDetailsApiResponse>('/reporting/products/details', {
            method: 'POST',
            token: session.accessToken,
            body: JSON.stringify(productDetailsRequest),
          }),
        ]);

        if (cancelled) return;

        setMetricsResponse((metrics.metrics ?? []).map(item => item.key ?? item.label).filter(Boolean) as string[]);
        setDimensionsResponse((dimensions.dimensions ?? []).map(item => item.key ?? item.label).filter(Boolean) as string[]);
        setSummaryResponse(summary);
        setTrendsResponse(trends);
        setBreakdownResponse(breakdown);
        setExplanationsResponse(explanations);
        setValidateResponse(validation);
        setPreviewResponse(preview);
        setProductMetricsResponse((productMetrics.metrics ?? []).map(item => item.key ?? item.label).filter(Boolean) as string[]);
        setProductOverviewResponse(productOverview);
        setProductRowsResponse(productRows);
        setProductDetailsResponse(productDetails);
        setApiError(null);
      } catch (error) {
        if (cancelled) return;
        setApiError(error instanceof Error ? error.message : 'Failed to load analytics data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [
    session?.accessToken,
    summaryRequest,
    trendsRequest,
    breakdownRequest,
    explanationRequest,
    customMetricValidation,
    productOverviewRequest,
    productTableRequest,
    productDetailsRequest,
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Surface>
        <SectionTitle
          eyebrow="Аналитика"
          title="Сводка, тренды, детализация, объяснения и метаданные"
          description="Приложение теперь показывает контракт аналитики из `docs/web-api.md`."
        />
      </Surface>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Запрос кабинета</h3>
          {apiError && <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{apiError}</div>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Дата начала</div>
              <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500" />
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Дата окончания</div>
              <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500" />
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Режим</div>
              <select value={mode} onChange={event => setMode(event.target.value as 'Management' | 'Financial')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500">
                <option value="Management">Управленческий</option>
                <option value="Financial">Финансовый</option>
              </select>
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Детализация</div>
              <select value={grain} onChange={event => setGrain(event.target.value as 'Day' | 'Week' | 'Month')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500">
                <option value="Day">День</option>
                <option value="Week">Неделя</option>
                <option value="Month">Месяц</option>
              </select>
            </label>
          </div>
        </Surface>

        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Метрики и измерения</h3>
          {isLoading && <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">Загрузка аналитики...</div>}
          <div className="mt-4 flex flex-wrap gap-2">
            {metricsResponse.map(item => <Pill key={item} tone={item === metric ? 'blue' : 'slate'}>{item}</Pill>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {dimensionsResponse.map(item => <Pill key={item} tone="slate">{item}</Pill>)}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Метрика для объяснений</div>
              <select value={metric} onChange={event => setMetric(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500">
                {metricsResponse.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Группировать по</div>
              <select value={groupBy} onChange={event => setGroupBy(event.target.value as typeof groupBy)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500">
                {dimensionsResponse.filter(item => ['Product', 'Brand', 'Category', 'Account', 'Marketplace', 'Date', 'Week', 'Month'].includes(item)).map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Сводка</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <JsonPanel label="Запрос" value={summaryRequest} />
            <JsonPanel label="Ответ" value={summaryResponse} />
          </div>
        </Surface>

        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Тренды</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <JsonPanel label="Запрос" value={trendsRequest} />
            <JsonPanel label="Ответ" value={trendsResponse} />
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Детализация</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <JsonPanel label="Запрос" value={breakdownRequest} />
            <JsonPanel label="Ответ" value={breakdownResponse} />
          </div>
        </Surface>

        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Объяснения</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <JsonPanel label="Запрос" value={explanationRequest} />
            <JsonPanel label="Ответ" value={explanationsResponse} />
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Метаданные и пользовательские метрики</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Метрики</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {metricsResponse.map(item => <Pill key={item}>{item}</Pill>)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Измерения</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dimensionsResponse.map(item => <Pill key={item}>{item}</Pill>)}
                </div>
              </div>
            </div>
            <JsonPanel label="Ответ проверки" value={validateResponse} />
          </div>
        </Surface>

        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Пользовательские метрики</h3>
          <p className="mt-1 text-sm text-slate-500">Проверяйте, просматривайте, создавайте и обновляйте формулы метрик.</p>
          <div className="mt-4 grid gap-3">
            <JsonPanel label="Запрос проверки" value={customMetricValidation} />
            <JsonPanel label="Запрос предпросмотра" value={customMetricValidation} />
            <JsonPanel label="Ответ предпросмотра" value={previewResponse} />
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Товарный экран</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <JsonPanel label="Метрики товара" value={productMetricsResponse.length > 0 ? productMetricsResponse : [...PRODUCT_REPORT_METRICS_CATALOG]} />
            <JsonPanel label="Запрос overview" value={productOverviewRequest} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <JsonPanel label="Ответ overview" value={productOverviewResponse} />
            <JsonPanel label="Запрос таблицы" value={productTableRequest} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <JsonPanel label="Ответ таблицы" value={productRowsResponse} />
            <JsonPanel label="Запрос деталей" value={productDetailsRequest} />
          </div>
          <div className="mt-4">
            <JsonPanel label="Ответ деталей" value={productDetailsResponse} />
          </div>
        </Surface>

        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Параметры товарного отчета</h3>
          <p className="mt-1 text-sm text-slate-500">Показаны только поля, которые нужны экрану товара.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Метрика для деталей</div>
              <select value={productMetric} onChange={event => setProductMetric(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500">
                {(productMetricsResponse.length > 0 ? productMetricsResponse : [...PRODUCT_REPORT_METRICS_CATALOG]).map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Сортировка</div>
              <select value={productSortMetric} onChange={event => setProductSortMetric(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500">
                {(productMetricsResponse.length > 0 ? productMetricsResponse : [...PRODUCT_REPORT_METRICS_CATALOG]).map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Направление</div>
              <select value={productSortDirection} onChange={event => setProductSortDirection(event.target.value as 'Asc' | 'Desc')} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500">
                <option value="Desc">Desc</option>
                <option value="Asc">Asc</option>
              </select>
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Страница</div>
              <input
                type="number"
                min={1}
                value={productPage}
                onChange={event => setProductPage(Math.max(1, Number(event.target.value) || 1))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </label>
            <label>
              <div className="mb-2 text-sm font-medium text-slate-600">Лимит</div>
              <input
                type="number"
                min={1}
                max={100}
                value={productLimit}
                onChange={event => setProductLimit(Math.max(1, Number(event.target.value) || 30))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
              />
            </label>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 sm:col-span-2">
              Этот экран использует отдельный товарный отчет и не зависит от общей детализации.
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

export function ActionHistoryPage() {
  const { actionHistory } = usePlatform();
  const grouped = useMemo(() => {
    const counts = actionHistory.reduce<Record<string, number>>((acc, action) => {
      acc[action.kind] = (acc[action.kind] ?? 0) + 1;
      return acc;
    }, {});

    return [
      { kind: 'navigation', label: 'Навигация' },
      { kind: 'auth', label: 'Авторизация' },
      { kind: 'organization', label: 'Организации' },
      { kind: 'invitation', label: 'Приглашения' },
      { kind: 'connection', label: 'Подключения' },
      { kind: 'sync', label: 'Синхронизация' },
      { kind: 'metric', label: 'Метрики' },
    ].map(item => ({ ...item, count: counts[item.kind] ?? 0 }));
  }, [actionHistory]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Surface>
        <SectionTitle
          eyebrow="История"
          title="Записанные действия и история навигации"
          description="Каждое важное действие платформы пишется в локальную историю, чтобы сессия сохраняла видимый след между обновлениями страницы."
        />
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Surface>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Итоги действий</h3>
              <p className="text-sm text-slate-500">Количество по категориям действий</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {grouped.map(item => (
              <div key={item.kind} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                <Pill tone={item.count > 0 ? 'blue' : 'slate'}>{item.count}</Pill>
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Последние события</h3>
              <p className="text-sm text-slate-500">Самые свежие действия находятся сверху</p>
            </div>
            <Pill tone="slate">{actionHistory.length} записей</Pill>
          </div>

          <div className="mt-5 space-y-3">
            {actionHistory.map(action => (
              <article key={action.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Pill tone={action.kind === 'sync' ? 'emerald' : action.kind === 'auth' ? 'blue' : 'slate'}>{action.kind}</Pill>
                      <h4 className="truncate text-sm font-semibold text-slate-900">{action.title}</h4>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock3 size={14} />
                    <span>{new Date(action.timestamp).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

export function DocsPage() {
  const docsLinks = [
    { label: 'docs/web-api.md', text: 'Рабочая справка для фронтенда.' },
    { label: 'docs/user-platform-flow.md', text: 'Текущий путь клиента и оператора.' },
    { label: 'docs/mvp-checklist.md', text: 'Чек-лист реализации и заметки по готовности.' },
    { label: 'docs/backend-operations.md', text: 'Операционные рекомендации по сервису.' },
    { label: 'docs/aistats-swagger.json', text: 'Техническая схема сервиса в репозитории.' },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <Surface>
        <SectionTitle
          eyebrow="Документация"
          title="Документация и точки входа поддержки"
          description="Эта страница собирает источники документации и рабочие сценарии, которые нужно знать пользователям фронтенда."
        />
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Файлы документации</h3>
          <div className="mt-4 space-y-3">
            {docsLinks.map(item => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">{item.label}</div>
                <div className="mt-1 text-sm text-slate-500">{item.text}</div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
          <h3 className="text-lg font-semibold text-slate-900">Рабочие правила</h3>
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            Фронтенд должен показывать понятные ошибки валидации и не раскрывать технические маршруты пользователям.
            Эта страница держит правило на виду, пока вы проходите сценарии.
          </div>
        </Surface>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
