import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { FilterProvider } from './context/FilterContext';
import { ReportModeProvider } from './context/ReportModeContext';
import { useAnalyticsWorkspaceData } from './hooks/useAnalyticsWorkspaceData';
import type { MultiSelectOption } from './components/filters/MultiSelect';
import { Layout } from './components/layout/Layout';
import { DevSidebar } from './components/layout/DevSidebar';
import { DashboardPage } from './pages/DashboardPage';
import { SummaryPage } from './pages/SummaryPage';
import { FinancePage } from './pages/FinancePage';
import { InventoryPage } from './pages/InventoryPage';
import { ExternalTrafficPage } from './pages/ExternalTrafficPage';
import { SearchPhrasesPage } from './pages/SearchPhrasesPage';
import { PlanFactPage } from './pages/PlanFactPage';
import { AIInsightsPage } from './pages/AllInsightPage';
import { PublicAuthPage } from './pages/PublicAuthPage';
import { PublicInviteAcceptPage } from './pages/PublicInviteAcceptPage';
import { PublicResetPasswordPage } from './pages/PublicResetPasswordPage';
import { PublicVerifyEmailPage } from './pages/PublicVerifyEmailPage';
import { OrganizationSetupPage } from './pages/OrganizationSetupPage';
import {
  ActionHistoryPage,
  AnalyticsWorkbenchPage,
  AuthPage,
  ConnectionsPage,
  DocsPage,
  OrganizationsPage,
  PlatformHomePage,
} from './pages/PlatformPages';
import { SettingsPage } from './pages/SettingsPage';
import { PREVIEW_ROUTE_PREFIX } from './lib/previewMode';
import { CheckCircle2, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import type { Page } from './types';
import type { SettingsTabId } from './pages/settingsConfig';

type MainPage =
  | 'dashboard'
  | 'summary'
  | 'finance'
  | 'inventory'
  | 'external-traffic'
  | 'search-phrases'
  | 'planfact'
  | 'ai'
  | 'settings'
  | 'accept-invite'
  | 'login'
  | 'register'
  | 'verify-email'
  | 'reset-password'
  | 'setup';
type DevPage = 'home' | 'auth' | 'organizations' | 'connections' | 'analytics' | 'docs' | 'history';
type PreviewPage = Exclude<MainPage, 'login' | 'register' | 'verify-email' | 'reset-password' | 'accept-invite' | 'setup'>;

type RouteState =
  | { mode: 'main'; page: MainPage; settingsTab: SettingsTabId }
  | { mode: 'dev'; page: DevPage; settingsTab: SettingsTabId }
  | { mode: 'preview'; page: PreviewPage; settingsTab: SettingsTabId };

const DEFAULT_SETTINGS_TAB: SettingsTabId = 'profile';
const SETTINGS_TAB_PATTERN = /^\/settings(?:\/([^/?#]+))?\/?$/;
const AUTH_ROUTE_PATTERN = /^\/(login|register)\/?$/;
const PUBLIC_FLOW_ROUTE_PATTERN = /^\/(reset-password|accept-invite|verify-email)\/?$/;
const RESET_PASSWORD_TOKEN_ROUTE_PATTERN = /^\/reset-password\/([^/?#]+)\/?$/;
const ACCEPT_INVITE_TOKEN_ROUTE_PATTERN = /^\/accept-invite\/([^/?#]+)\/?$/;
const DEV_ROUTE_PATTERN = /^\/dev(?:\/platform)?(?:\/([^/?#]+))?\/?$/;
const PREVIEW_ROUTE_PATTERN = /^\/preview(?:\/([^/?#]+))?\/?$/;
const PENDING_INVITE_TOKEN_KEY = 'aistats-pending-invite-token';
const PENDING_INVITE_EMAIL_KEY = 'aistats-pending-invite-email';
const DEV_PAGES = new Set<DevPage>(['home', 'auth', 'organizations', 'connections', 'analytics', 'docs', 'history']);
const PREVIEW_PAGES = new Set<PreviewPage>(['dashboard', 'summary', 'finance', 'inventory', 'external-traffic', 'search-phrases', 'planfact', 'ai', 'settings']);

function normalizeSettingsTab(value: string | undefined): SettingsTabId {
  if (value === 'shops' || value === 'users' || value === 'taxes' || value === 'metrics') {
    return value;
  }
  return DEFAULT_SETTINGS_TAB;
}

function normalizeMainPage(pathname: string): MainPage {
  switch (pathname) {
    case '/':
    case '/dashboard':
      return 'dashboard';
    case '/login':
      return 'login';
    case '/register':
      return 'register';
    case '/verify-email':
      return 'verify-email';
    case '/reset-password':
      return 'reset-password';
    case '/accept-invite':
      return 'accept-invite';
    case '/summary':
      return 'summary';
    case '/finance':
      return 'finance';
    case '/inventory':
      return 'inventory';
    case '/external-traffic':
      return 'external-traffic';
    case '/search-phrases':
      return 'search-phrases';
    case '/planfact':
      return 'planfact';
    case '/ai':
      return 'ai';
    case '/setup':
      return 'setup';
    case '/settings':
      return 'settings';
    default:
      return 'dashboard';
  }
}

function parseRoute(pathname: string): RouteState {
  const previewMatch = pathname.match(PREVIEW_ROUTE_PATTERN);
  if (previewMatch) {
    const page = PREVIEW_PAGES.has(previewMatch[1] as PreviewPage) ? (previewMatch[1] as PreviewPage) : 'dashboard';
    return { mode: 'preview', page, settingsTab: DEFAULT_SETTINGS_TAB };
  }

  const devMatch = pathname.match(DEV_ROUTE_PATTERN);
  if (devMatch) {
    const page = DEV_PAGES.has(devMatch[1] as DevPage) ? (devMatch[1] as DevPage) : 'home';
    return { mode: 'dev', page, settingsTab: DEFAULT_SETTINGS_TAB };
  }

  const authMatch = pathname.match(AUTH_ROUTE_PATTERN);
  if (authMatch) {
    return { mode: 'main', page: authMatch[1] as 'login' | 'register', settingsTab: DEFAULT_SETTINGS_TAB };
  }

  if (RESET_PASSWORD_TOKEN_ROUTE_PATTERN.test(pathname)) {
    return { mode: 'main', page: 'reset-password', settingsTab: DEFAULT_SETTINGS_TAB };
  }

  if (ACCEPT_INVITE_TOKEN_ROUTE_PATTERN.test(pathname)) {
    return { mode: 'main', page: 'accept-invite', settingsTab: DEFAULT_SETTINGS_TAB };
  }

  const publicFlowMatch = pathname.match(PUBLIC_FLOW_ROUTE_PATTERN);
  if (publicFlowMatch) {
    return {
      mode: 'main',
      page: publicFlowMatch[1] as 'reset-password' | 'accept-invite' | 'verify-email',
      settingsTab: DEFAULT_SETTINGS_TAB,
    };
  }

  const settingsMatch = pathname.match(SETTINGS_TAB_PATTERN);
  if (settingsMatch) {
    return { mode: 'main', page: 'settings', settingsTab: normalizeSettingsTab(settingsMatch[1]) };
  }

  return { mode: 'main', page: normalizeMainPage(pathname), settingsTab: DEFAULT_SETTINGS_TAB };
}

function pathForRoute(route: RouteState) {
  if (route.mode === 'preview') {
    return route.page === 'dashboard' ? PREVIEW_ROUTE_PREFIX : `${PREVIEW_ROUTE_PREFIX}/${route.page}`;
  }

  if (route.mode === 'dev') {
    return route.page === 'home' ? '/dev' : `/dev/${route.page}`;
  }

  switch (route.page) {
    case 'summary':
      return '/summary';
    case 'finance':
      return '/finance';
    case 'inventory':
      return '/inventory';
    case 'external-traffic':
      return '/external-traffic';
    case 'search-phrases':
      return '/search-phrases';
    case 'planfact':
      return '/planfact';
    case 'ai':
      return '/ai';
    case 'setup':
      return '/setup';
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'verify-email':
      return '/verify-email';
    case 'reset-password':
      return '/reset-password';
    case 'accept-invite':
      return '/accept-invite';
    case 'settings':
      return route.settingsTab === DEFAULT_SETTINGS_TAB ? '/settings' : `/settings/${route.settingsTab}`;
    case 'dashboard':
    default:
      return '/';
  }
}

function isDevPage(page: Page): page is DevPage {
  return DEV_PAGES.has(page as DevPage);
}

function isMainPage(page: Page): page is Exclude<MainPage, 'login' | 'register'> {
  return (
    page === 'dashboard' ||
      page === 'summary' ||
      page === 'finance' ||
      page === 'inventory' ||
      page === 'external-traffic' ||
      page === 'search-phrases' ||
      page === 'planfact' ||
    page === 'ai' ||
    page === 'settings' ||
    page === 'accept-invite' ||
    page === 'verify-email' ||
    page === 'reset-password'
  );
}

function DevShell({
  currentPage,
  children,
  onNavigate,
  onBack,
}: {
  currentPage: DevPage;
  children: ReactNode;
  onNavigate: (page: DevPage) => void;
  onBack: () => void;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DevSidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onBack={onBack}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function WorkspaceLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <Loader2 size={18} className="animate-spin text-blue-600" />
        <div>
          <div className="text-sm font-semibold text-slate-900">Loading workspace</div>
          <div className="text-xs text-slate-500">Waiting for the backend response...</div>
        </div>
      </div>
    </div>
  );
}

function NotificationStack() {
  const { notifications, dismissNotification } = usePlatform();

  if (notifications.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-full max-w-sm flex-col gap-3 px-2 sm:px-0">
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </div>
  );
}

function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: { tone: 'success' | 'error' | 'info' | 'warning'; title: string; message: string };
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  const toneStyles = {
    success: {
      border: 'border-emerald-200',
      background: 'bg-emerald-50',
      title: 'text-emerald-900',
      message: 'text-emerald-800',
      icon: <CheckCircle2 size={16} />,
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    error: {
      border: 'border-rose-200',
      background: 'bg-rose-50',
      title: 'text-rose-900',
      message: 'text-rose-800',
      icon: <AlertTriangle size={16} />,
      iconBg: 'bg-rose-100 text-rose-700',
    },
    info: {
      border: 'border-sky-200',
      background: 'bg-sky-50',
      title: 'text-sky-900',
      message: 'text-sky-800',
      icon: <Info size={16} />,
      iconBg: 'bg-sky-100 text-sky-700',
    },
    warning: {
      border: 'border-amber-200',
      background: 'bg-amber-50',
      title: 'text-amber-900',
      message: 'text-amber-800',
      icon: <AlertTriangle size={16} />,
      iconBg: 'bg-amber-100 text-amber-700',
    },
  }[notification.tone];

  return (
    <div className={`pointer-events-auto rounded-3xl border ${toneStyles.border} ${toneStyles.background} p-4 shadow-xl`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${toneStyles.iconBg}`}>
          {toneStyles.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${toneStyles.title}`}>{notification.title}</div>
          <div className={`mt-1 text-sm leading-6 ${toneStyles.message}`}>{notification.message}</div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-800"
          aria-label="Закрыть уведомление"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function AppRouter() {
  const { recordAction, session, organizations, isWorkspaceHydrated, acceptInvitation } = usePlatform();
  const acceptInvitationRef = useRef(acceptInvitation);
  const [route, setRoute] = useState<RouteState>(() => {
    if (typeof window === 'undefined') return { mode: 'main', page: 'dashboard', settingsTab: DEFAULT_SETTINGS_TAB };
    return parseRoute(window.location.pathname);
  });
  const shouldLoadAnalyticsShell =
    (route.mode === 'main' || route.mode === 'preview') &&
    (route.page === 'dashboard' ||
      route.page === 'summary' ||
      route.page === 'finance' ||
      route.page === 'inventory' ||
      route.page === 'external-traffic' ||
      route.page === 'search-phrases' ||
      route.page === 'planfact' ||
      route.page === 'ai');
  const analyticsWorkspace = useAnalyticsWorkspaceData({
    enabled: shouldLoadAnalyticsShell,
    includeWorkspaceMetrics: false,
  });
  const filterOptions = useMemo(() => {
    const unique = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'ru'));
    const uniqueStoreOptions = (items: MultiSelectOption[]) => {
      const seen = new Set<string>();
      return items.filter(item => {
        const key = `${item.marketplace ?? 'store'}:${item.value.trim()}`;
        if (!item.value.trim() || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const uniqueSkuOptions = (items: { id: string; sku: string; name: string }[]) => {
      const seen = new Set<string>();
      return items.filter(item => {
        const key = item.id.trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const apiOptions = analyticsWorkspace.filterOptions;
    const apiAccounts = apiOptions?.accounts ?? [];
    const apiProducts = apiOptions?.products ?? [];
    const apiBrands = apiOptions?.brands ?? [];
    const apiCategories = apiOptions?.categories ?? [];

    return {
      brands: unique(apiBrands.map(item => item.label ?? item.id).filter(Boolean)),
      categories: unique(apiCategories.map(item => item.label ?? item.id).filter(Boolean)),
      marketplaces: unique(apiAccounts.map(item => item.marketplace ?? '').filter(Boolean)),
      stores: uniqueStoreOptions(
        apiAccounts.map(item => ({
          value: item.label ?? '',
          label: item.label ?? '',
          optionKey: `${item.marketplace ?? 'store'}:${item.label ?? ''}`,
          marketplace: item.marketplace ?? undefined,
          searchText: `${item.label ?? ''} ${item.marketplace ?? ''}`.trim(),
        }))
      ),
      skus: uniqueSkuOptions(
        apiProducts
          .map(item => ({
            id: String(item.id),
            sku: item.label ?? String(item.id),
            name: item.label ?? String(item.id),
          }))
          .filter(item => Boolean(item.id))
      ),
    };
  }, [analyticsWorkspace.filterOptions]);

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (page: Page, settingsTab: SettingsTabId = DEFAULT_SETTINGS_TAB) => {
    const nextRoute: RouteState = route.mode === 'preview' && PREVIEW_PAGES.has(page as PreviewPage)
      ? { mode: 'preview', page: page as PreviewPage, settingsTab: page === 'settings' ? settingsTab : DEFAULT_SETTINGS_TAB }
      : page === 'settings'
      ? { mode: 'main', page, settingsTab }
      : isDevPage(page)
        ? { mode: 'dev', page, settingsTab: DEFAULT_SETTINGS_TAB }
        : isMainPage(page)
          ? { mode: 'main', page, settingsTab: DEFAULT_SETTINGS_TAB }
          : { mode: 'main', page: 'dashboard', settingsTab: DEFAULT_SETTINGS_TAB };

    const nextPath = pathForRoute(nextRoute);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }

    setRoute(nextRoute);
    if (nextRoute.mode === 'dev') {
      recordAction({
        kind: 'navigation',
        title: 'Navigated to dev page',
        description: `Opened /dev/${nextRoute.page}.`,
      });
    }
  };

  const goToAuth = (mode: 'login' | 'register', replace = false) => {
    const nextRoute: RouteState = { mode: 'main', page: mode, settingsTab: DEFAULT_SETTINGS_TAB };
    const nextPath = pathForRoute(nextRoute);
    if (replace) {
      window.history.replaceState(null, '', nextPath);
    } else if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setRoute(nextRoute);
  };

  const goToVerifyEmail = (email: string, replace = false) => {
    const nextRoute: RouteState = { mode: 'main', page: 'verify-email', settingsTab: DEFAULT_SETTINGS_TAB };
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    const nextPath = `${pathForRoute(nextRoute)}${query}`;
    if (replace) {
      window.history.replaceState(null, '', nextPath);
    } else if (`${window.location.pathname}${window.location.search}` !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setRoute(nextRoute);
  };

  useEffect(() => {
    acceptInvitationRef.current = acceptInvitation;
  }, [acceptInvitation]);

  useEffect(() => {
    if (!session?.accessToken || !isWorkspaceHydrated) return;
    const pendingInviteToken = window.sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY);
    if (!pendingInviteToken) return;

    window.sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
    void acceptInvitationRef.current(pendingInviteToken)
      .then(() => {
        window.sessionStorage.removeItem(PENDING_INVITE_EMAIL_KEY);
        const nextRoute: RouteState = { mode: 'main', page: 'dashboard', settingsTab: DEFAULT_SETTINGS_TAB };
        window.history.replaceState(null, '', pathForRoute(nextRoute));
        setRoute(nextRoute);
      })
      .catch(() => {
        window.sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, pendingInviteToken);
      });
  }, [isWorkspaceHydrated, session?.accessToken]);

  useEffect(() => {
    if (route.mode !== 'main') return;
    if (!isWorkspaceHydrated) return;

    if (!session && route.page !== 'login' && route.page !== 'register' && route.page !== 'verify-email' && route.page !== 'reset-password' && route.page !== 'accept-invite') {
      const nextRoute: RouteState = { mode: 'main', page: 'login', settingsTab: DEFAULT_SETTINGS_TAB };
      const nextPath = pathForRoute(nextRoute);
      if (window.location.pathname !== nextPath) {
        window.history.replaceState(null, '', nextPath);
      }
      setRoute(nextRoute);
      return;
    }

    if (session && (route.page === 'login' || route.page === 'register')) {
      const nextRoute: RouteState =
        organizations.length === 0
          ? { mode: 'main', page: 'setup', settingsTab: DEFAULT_SETTINGS_TAB }
          : { mode: 'main', page: 'dashboard', settingsTab: DEFAULT_SETTINGS_TAB };
      const nextPath = pathForRoute(nextRoute);
      if (window.location.pathname !== nextPath) {
        window.history.replaceState(null, '', nextPath);
      }
      setRoute(nextRoute);
      return;
    }

    if (session && organizations.length === 0 && route.page !== 'setup' && route.page !== 'accept-invite') {
      const nextRoute: RouteState = { mode: 'main', page: 'setup', settingsTab: DEFAULT_SETTINGS_TAB };
      const nextPath = pathForRoute(nextRoute);
      if (window.location.pathname !== nextPath) {
        window.history.replaceState(null, '', nextPath);
      }
      setRoute(nextRoute);
      return;
    }

    if (session && organizations.length > 0 && route.page === 'setup') {
      const nextRoute: RouteState = { mode: 'main', page: 'dashboard', settingsTab: DEFAULT_SETTINGS_TAB };
      const nextPath = pathForRoute(nextRoute);
      if (window.location.pathname !== nextPath) {
        window.history.replaceState(null, '', nextPath);
      }
      setRoute(nextRoute);
    }
  }, [isWorkspaceHydrated, organizations.length, route.mode, route.page, session]);

  if (route.mode === 'dev') {
    const devPage = (() => {
      switch (route.page) {
        case 'auth':
          return <AuthPage />;
        case 'organizations':
          return <OrganizationsPage />;
        case 'connections':
          return <ConnectionsPage />;
        case 'analytics':
          return <AnalyticsWorkbenchPage />;
        case 'docs':
          return <DocsPage />;
        case 'history':
          return <ActionHistoryPage />;
        case 'home':
        default:
          return <PlatformHomePage onNavigate={page => navigate(page)} />;
      }
    })();

    return (
      <>
        <DevShell
          currentPage={route.page}
          onNavigate={page => navigate(page)}
          onBack={() => navigate('dashboard')}
        >
          {devPage}
        </DevShell>
        <NotificationStack />
      </>
    );
  }

  if (route.page === 'login' || route.page === 'register') {
    return (
      <>
        <PublicAuthPage
          mode={route.page}
          onModeChange={mode => goToAuth(mode)}
          onAcceptInvite={() => navigate('accept-invite')}
          onVerifyEmail={email => goToVerifyEmail(email)}
        />
        <NotificationStack />
      </>
    );
  }

  if (route.page === 'reset-password') {
    return (
      <>
        <PublicResetPasswordPage onSuccess={() => goToAuth('login', true)} />
        <NotificationStack />
      </>
    );
  }

  if (route.page === 'verify-email') {
    return (
      <>
        <PublicVerifyEmailPage
          onSuccess={() => goToAuth('login', true)}
          onGoToLogin={() => goToAuth('login', true)}
        />
        <NotificationStack />
      </>
    );
  }

  if (route.page === 'accept-invite') {
    return (
      <>
        <PublicInviteAcceptPage
          onSuccess={() => (session ? navigate('dashboard') : goToAuth('login', true))}
          onGoToLogin={() => goToAuth('login', true)}
          onGoToRegister={() => goToAuth('register', true)}
        />
        <NotificationStack />
      </>
    );
  }

  if (session && !isWorkspaceHydrated && route.page !== 'login' && route.page !== 'register' && route.page !== 'verify-email') {
    return (
      <>
        <WorkspaceLoader />
        <NotificationStack />
      </>
    );
  }

  if (route.page === 'setup') {
    return (
      <>
        <OrganizationSetupPage onContinue={() => navigate('dashboard')} />
        <NotificationStack />
      </>
    );
  }

  const mainPage = (() => {
    switch (route.page) {
      case 'summary':
        return <SummaryPage />;
      case 'finance':
        return <FinancePage />;
      case 'inventory':
        return <InventoryPage />;
      case 'external-traffic':
        return <ExternalTrafficPage />;
      case 'search-phrases':
        return <SearchPhrasesPage />;
      case 'planfact':
        return <PlanFactPage />;
      case 'ai':
        return <AIInsightsPage />;
      case 'settings':
        return <SettingsPage activeTab={route.settingsTab} />;
      case 'dashboard':
      default:
        return <DashboardPage />;
    }
  })();

  return (
    <>
      <Layout
        currentPage={route.page}
        onNavigate={page => navigate(page)}
        brands={filterOptions.brands}
        categories={filterOptions.categories}
        marketplaces={filterOptions.marketplaces}
        stores={filterOptions.stores}
        skus={filterOptions.skus}
        activeSettingsTab={route.page === 'settings' ? route.settingsTab : undefined}
        onSettingsTabChange={tab => navigate('settings', tab)}
      >
        {mainPage}
      </Layout>
      <NotificationStack />
    </>
  );
}

function App() {
  return (
    <PlatformProvider>
      <FilterProvider>
        <ReportModeProvider>
          <AppRouter />
        </ReportModeProvider>
      </FilterProvider>
    </PlatformProvider>
  );
}

export default App;
