/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CONNECTOR_CATALOG } from '../lib/platformCatalog';
import { ApiError, apiRequest, configureApiAuthHandlers } from '../lib/api';

export interface PlatformUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'Active' | 'Invited' | 'Inactive';
  emailVerifiedAt?: string | null;
  isEmailVerified: boolean;
}

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: PlatformUser;
  refreshToken?: string;
}

export interface RegisterResult {
  user: PlatformUser;
  requiresEmailVerification: boolean;
  nextAction?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  ownerUserId: string;
  currentUserRole?: OrganizationMember['role'] | null;
  currentUserAccountAccessMode?: OrganizationMember['accountAccessMode'] | null;
  currentUserMarketplaceConnectionIds: string[];
  createdAt: string;
}

export interface OrganizationMember extends PlatformUser {
  role: 'Owner' | 'Admin' | 'Manager';
  accountAccessMode: 'Full' | 'Assigned';
  marketplaceConnectionIds: string[];
}

export interface Invitation {
  id: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Manager';
  accountAccessMode: 'Full' | 'Assigned';
  marketplaceConnectionIds: string[];
  status: 'Pending' | 'Accepted' | 'Revoked';
}

export interface InvitationPreview {
  email: string;
  role: OrganizationMember['role'];
  accountAccessMode: OrganizationMember['accountAccessMode'];
  marketplaceConnectionIds: string[];
  status: Invitation['status'];
  expiresAt: string;
  organizationName: string;
  isExpired: boolean;
}

export interface MarketplaceConnection {
  id: string;
  organizationId: string;
  marketplace: 'Wildberries' | 'Ozon';
  displayName: string;
  credentialSummary: string;
  validationState: 'Validated' | 'Needs attention';
  latestSyncRunId?: string;
}

export interface SyncRun {
  id: string;
  connectionId: string;
  status: 'Queued' | 'Running' | 'Cancelled' | 'Succeeded' | 'Failed';
  dateFrom: string;
  dateTo: string;
  syncKinds: string[];
  progressPercent: number;
  progressMessage: string;
  error?: string;
  canRetry: boolean;
  canCancel: boolean;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: string;
  enqueuedAt: string;
  requestedByUserId?: string;
}

export interface CustomMetric {
  id: string;
  name: string;
  formula: string;
  unitLabel: string;
  active: boolean;
}

export interface MarketplaceConnectorDefinition {
  marketplace: 'Wildberries' | 'Ozon';
  label: string;
  supportedSyncKinds: string[];
  credentialFields: { key: string; label: string; secret: boolean; required: boolean }[];
}

export interface ActionRecord {
  id: string;
  kind: 'navigation' | 'auth' | 'organization' | 'invitation' | 'connection' | 'sync' | 'metric';
  title: string;
  description: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  tone: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: string;
}

interface PlatformContextValue {
  session: AuthSession | null;
  isWorkspaceHydrated: boolean;
  users: PlatformUser[];
  organizations: Organization[];
  selectedOrganizationId: string;
  members: OrganizationMember[];
  invitations: Invitation[];
  connectors: MarketplaceConnectorDefinition[];
  connections: MarketplaceConnection[];
  syncRuns: SyncRun[];
  customMetrics: CustomMetric[];
  actionHistory: ActionRecord[];
  notifications: NotificationItem[];
  apiError: string | null;
  register: (input: { firstName: string; lastName: string; email: string; phone: string; password: string; invitationToken?: string }) => Promise<RegisterResult>;
  login: (input: { email: string; password: string }) => Promise<AuthSession>;
  logout: () => void;
  requestEmailVerification: (email: string) => Promise<void>;
  verifyEmail: (input: { email: string; code: string }) => Promise<void>;
  createOrganization: (name: string) => Organization;
  renameOrganization: (organizationId: string, name: string) => Promise<Organization>;
  selectOrganization: (organizationId: string) => void;
  inviteMember: (input: { email: string; role: OrganizationMember['role']; accountAccessMode?: OrganizationMember['accountAccessMode']; marketplaceConnectionIds?: string[] }) => Invitation;
  previewInvitation: (token: string) => Promise<InvitationPreview>;
  acceptInvitation: (token: string) => Promise<void>;
  updateMemberRole: (input: { memberId: string; role: OrganizationMember['role']; accountAccessMode?: OrganizationMember['accountAccessMode']; marketplaceConnectionIds?: string[] }) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  transferOrganizationOwnership: (newOwnerUserId: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  connectShop: (input: {
    marketplace: 'Wildberries' | 'Ozon';
    displayName?: string;
    credentials: Record<string, string>;
    startInitialSync: boolean;
    initialSyncDays: number;
    initialSyncKinds: string[];
  }) => MarketplaceConnection;
  updateConnection: (input: { connectionId: string; displayName?: string; credentials?: Record<string, string> }) => Promise<MarketplaceConnection>;
  deleteConnection: (connectionId: string) => Promise<void>;
  validateConnection: (connectionId: string) => Promise<MarketplaceConnection>;
  enqueueSync: (input: { connectionId: string; dateFrom: string; dateTo: string; syncKinds: string[] }) => SyncRun | null;
  retrySync: (syncRunId: string) => SyncRun | null;
  cancelSync: (syncRunId: string) => SyncRun | null;
  addCustomMetric: (metric: CustomMetric) => void;
  updateCustomMetric: (metric: CustomMetric) => void;
  updateProfile: (input: { firstName: string; lastName: string; email: string; phone: string }) => Promise<PlatformUser>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (input: { resetToken: string; newPassword: string }) => Promise<void>;
  deleteCurrentUser: () => Promise<void>;
  loadSettingsTabData: (tab: 'shops' | 'users' | 'metrics') => Promise<void>;
  recordAction: (action: Omit<ActionRecord, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  enqueueNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
}

const STORAGE_KEY = 'aistats-platform-state';
const ACTION_HISTORY_STORAGE_KEY = 'aistats-platform-action-history';
const NOTIFICATION_LIMIT = 4;

const initialActionHistory: ActionRecord[] = [];

const initialNotifications: NotificationItem[] = [];

const defaultSession: AuthSession | null = null;

const PlatformContext = createContext<PlatformContextValue | null>(null);

function loadStoredSession() {
  if (typeof window === 'undefined') return defaultSession;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession;
    const parsed = JSON.parse(raw) as Partial<Pick<PlatformContextValue, 'session'>>;
    return parsed.session ?? defaultSession;
  } catch {
    return defaultSession;
  }
}

function saveStoredSession(session: AuthSession | null) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ session }));
}

function loadStoredActionHistory() {
  if (typeof window === 'undefined') return initialActionHistory;
  try {
    const raw = window.localStorage.getItem(ACTION_HISTORY_STORAGE_KEY);
    if (!raw) return initialActionHistory;
    const parsed = JSON.parse(raw) as ActionRecord[];
    return parsed.length > 0 ? parsed : initialActionHistory;
  } catch {
    return initialActionHistory;
  }
}

function saveStoredActionHistory(actionHistory: ActionRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTION_HISTORY_STORAGE_KEY, JSON.stringify(actionHistory));
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

type ApiUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | number;
  emailVerifiedAt?: string | null;
  isEmailVerified?: boolean;
};

type ApiOrganization = {
  id: string;
  name?: string | null;
  ownerUserId?: string;
  currentUserRole?: string | number | null;
  currentUserAccountAccessMode?: string | number | null;
  currentUserMarketplaceConnectionIds?: string[] | null;
  createdAt?: string;
};

type ApiMember = {
  id?: string;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | number;
  role?: string | number;
  accountAccessMode?: string | number;
  marketplaceConnectionIds?: string[] | null;
};

type ApiInvitation = {
  id: string;
  email?: string | null;
  role?: string | number;
  accountAccessMode?: string | number;
  marketplaceConnectionIds?: string[] | null;
  status?: string | number;
};

type ApiInvitationPreview = {
  email?: string | null;
  role?: string | number;
  accountAccessMode?: string | number;
  marketplaceConnectionIds?: string[] | null;
  status?: string | number;
  expiresAt?: string;
  organizationName?: string | null;
  isExpired?: boolean;
};

type ApiConnector = {
  marketplace?: string | number;
  label?: string | null;
  supportedSyncKinds?: string[] | null;
  credentialFields?: { key?: string | null; label?: string | null; secret?: boolean; required?: boolean }[] | null;
};

function createFallbackConnectors(): MarketplaceConnectorDefinition[] {
  return CONNECTOR_CATALOG.map(connector => ({
    marketplace: connector.marketplace,
    label: connector.label,
    supportedSyncKinds: [...connector.supportedSyncKinds],
    credentialFields: connector.credentialFields.map(field => ({
      key: field.key,
      label: field.label,
      secret: field.secret,
      required: field.required,
    })),
  }));
}

type ApiConnection = {
  id: string;
  organizationId?: string;
  marketplace?: string | number;
  displayName?: string | null;
  externalAccountId?: string | null;
  status?: string | number;
  latestSyncRun?: ApiSyncRun | null;
};

type ApiConnectionValidationResult = {
  isValid?: boolean;
  externalAccountId?: string | null;
  externalAccountName?: string | null;
  error?: string | null;
};

type ApiConnectionUpdateResponse =
  | ApiConnection
  | { connection?: ApiConnection | null }
  | { data?: ApiConnection | { connection?: ApiConnection | null } | null };

type ApiSyncRun = {
  id: string;
  marketplaceConnectionId?: string;
  syncKind?: string | null;
  dateFrom?: string;
  dateTo?: string;
  requestedAt?: string;
  status?: string | number;
  error?: string | null;
  attemptCount?: number;
  maxAttempts?: number;
  nextAttemptAt?: string | null;
  progressPercent?: number;
  progressMessage?: string | null;
  startedAt?: string;
  finishedAt?: string | null;
  requestedByUserId?: string | null;
  enqueuedAt?: string | null;
  canRetry?: boolean;
  canCancel?: boolean;
};

type ApiCustomMetric = {
  id: number;
  name?: string | null;
  formula?: string | null;
  unitLabel?: string | null;
  active?: boolean;
};

type ApiProfileResponse = ApiUser;
type ApiRegisterResponse = {
  user?: ApiUser | null;
  requiresEmailVerification?: boolean;
  nextAction?: string | null;
};

type ApiAuthTokenResponse = {
  accessToken?: string;
  refreshToken?: string | null;
  tokenType?: string;
  expiresAt?: string;
  user?: ApiUser | null;
};

function mapUserStatus(value: unknown): PlatformUser['status'] {
  if (typeof value === 'string') {
    if (value === 'Active' || value === 'Invited' || value === 'Inactive') return value;
  }

  switch (value) {
    case 0:
      return 'Active';
    case 1:
      return 'Invited';
    default:
      return 'Inactive';
  }
}

function mapRole(value: unknown): OrganizationMember['role'] {
  if (typeof value === 'string') {
    if (value === 'OrgOwner') return 'Owner';
    if (value === 'Owner' || value === 'Admin' || value === 'Manager') return value;
  }

  switch (value) {
    case 0:
      return 'Owner';
    case 1:
      return 'Admin';
    case 2:
    default:
      return 'Manager';
  }
}

function mapOptionalRole(value: unknown): OrganizationMember['role'] | null {
  if (value === undefined || value === null) return null;
  return mapRole(value);
}

function mapAccountAccessMode(value: unknown): OrganizationMember['accountAccessMode'] {
  if (value === 'Assigned' || value === 1) return 'Assigned';
  return 'Full';
}

function mapOptionalAccountAccessMode(value: unknown): OrganizationMember['accountAccessMode'] | null {
  if (value === undefined || value === null) return null;
  return mapAccountAccessMode(value);
}

function toApiRole(role: OrganizationMember['role']) {
  return role === 'Owner' ? 'OrgOwner' : role;
}

function resolveAccountAccessInput(
  role: OrganizationMember['role'],
  accountAccessMode?: OrganizationMember['accountAccessMode'],
  marketplaceConnectionIds?: string[]
) {
  if (role !== 'Manager') {
    return { accountAccessMode: 'Full' as const, marketplaceConnectionIds: [] };
  }

  const resolvedMode = accountAccessMode ?? 'Assigned';
  return {
    accountAccessMode: resolvedMode,
    marketplaceConnectionIds: resolvedMode === 'Full' ? [] : marketplaceConnectionIds ?? [],
  };
}

function mapMarketplace(value: unknown): 'Wildberries' | 'Ozon' {
  if (value === 'Wildberries' || value === 'Ozon') return value;
  return value === 1 ? 'Ozon' : 'Wildberries';
}

function mapConnectionStatus(value: unknown): 'Validated' | 'Needs attention' {
  if (typeof value === 'string') {
    if (value === 'Validated') return 'Validated';
    return 'Needs attention';
  }

  return value === 1 ? 'Validated' : 'Needs attention';
}

function mapSyncStatus(value: unknown): SyncRun['status'] {
  if (typeof value === 'string') {
    if (value === 'Queued' || value === 'Running' || value === 'Cancelled' || value === 'Succeeded' || value === 'Failed') {
      return value;
    }
  }

  switch (value) {
    case 0:
      return 'Queued';
    case 1:
      return 'Running';
    case 2:
      return 'Cancelled';
    case 3:
      return 'Succeeded';
    default:
      return 'Failed';
  }
}

function mapAuthUser(user: ApiUser): PlatformUser {
  return {
    id: String(user.id),
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    status: mapUserStatus(user.status),
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    isEmailVerified: Boolean(user.isEmailVerified),
  };
}

function mapOrganization(org: ApiOrganization): Organization {
  return {
    id: String(org.id),
    name: org.name ?? '',
    ownerUserId: String(org.ownerUserId ?? ''),
    currentUserRole: mapOptionalRole(org.currentUserRole),
    currentUserAccountAccessMode: mapOptionalAccountAccessMode(org.currentUserAccountAccessMode),
    currentUserMarketplaceConnectionIds: org.currentUserMarketplaceConnectionIds ?? [],
    createdAt: org.createdAt ?? new Date().toISOString(),
  };
}

function mapMember(member: ApiMember): OrganizationMember {
  return {
    id: String(member.userId ?? member.id ?? createId('member')),
    firstName: member.firstName ?? '',
    lastName: member.lastName ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    status: mapUserStatus(member.status),
    emailVerifiedAt: null,
    isEmailVerified: false,
    role: mapRole(member.role),
    accountAccessMode: mapAccountAccessMode(member.accountAccessMode),
    marketplaceConnectionIds: member.marketplaceConnectionIds ?? [],
  };
}

function mapInvitation(invitation: ApiInvitation): Invitation {
  return {
    id: String(invitation.id),
    email: invitation.email ?? '',
    role: mapRole(invitation.role),
    accountAccessMode: mapAccountAccessMode(invitation.accountAccessMode),
    marketplaceConnectionIds: invitation.marketplaceConnectionIds ?? [],
    status: mapInvitationStatus(invitation.status),
  };
}

function mapInvitationStatus(value: unknown): Invitation['status'] {
  if (typeof value === 'string') {
    if (value === 'Pending' || value === 'Accepted' || value === 'Revoked') return value;
    if (value === 'Active') return 'Accepted';
    if (value === 'Inactive' || value === 'Expired' || value === 'Cancelled') return 'Revoked';
  }
  return value === 1 ? 'Accepted' : value === 2 || value === 3 ? 'Revoked' : 'Pending';
}

function mapInvitationPreview(preview: ApiInvitationPreview): InvitationPreview {
  return {
    email: preview.email ?? '',
    role: mapRole(preview.role),
    accountAccessMode: mapAccountAccessMode(preview.accountAccessMode),
    marketplaceConnectionIds: preview.marketplaceConnectionIds ?? [],
    status: mapInvitationStatus(preview.status),
    expiresAt: preview.expiresAt ?? '',
    organizationName: preview.organizationName ?? '',
    isExpired: Boolean(preview.isExpired),
  };
}

function mapConnection(connection: ApiConnection): MarketplaceConnection {
  const marketplace = mapMarketplace(connection.marketplace);
  const fallbackDisplayName = connection.displayName ?? connection.externalAccountId ?? `${marketplace} shop`;
  return {
    id: String(connection.id),
    organizationId: String(connection.organizationId),
    marketplace,
    displayName: fallbackDisplayName,
    credentialSummary: connection.externalAccountId ?? 'connected',
    validationState: mapConnectionStatus(connection.status),
    latestSyncRunId: connection.latestSyncRun?.id ? String(connection.latestSyncRun.id) : undefined,
  };
}

function resolveConnectionUpdateResponse(response: ApiConnectionUpdateResponse | void) {
  if (!response) return null;
  if ('data' in response) {
    const data = response.data;
    if (!data) return null;
    return 'connection' in data ? data.connection ?? null : data;
  }
  return 'connection' in response ? response.connection ?? null : response;
}

function mapSyncRun(syncRun: ApiSyncRun): SyncRun {
  return {
    id: String(syncRun.id),
    connectionId: String(syncRun.marketplaceConnectionId),
    status: mapSyncStatus(syncRun.status),
    dateFrom: syncRun.dateFrom ?? '',
    dateTo: syncRun.dateTo ?? '',
    syncKinds: syncRun.syncKind ? [String(syncRun.syncKind)] : [],
    requestedByUserId: syncRun.requestedByUserId ?? undefined,
    progressPercent: Number(syncRun.progressPercent ?? 0),
    progressMessage: syncRun.progressMessage ?? '',
    error: syncRun.error ?? undefined,
    canRetry: Boolean(syncRun.canRetry),
    canCancel: Boolean(syncRun.canCancel),
    attemptCount: Number(syncRun.attemptCount ?? 0),
    maxAttempts: Number(syncRun.maxAttempts ?? 0),
    nextAttemptAt: syncRun.nextAttemptAt ?? undefined,
    enqueuedAt: syncRun.requestedAt ?? syncRun.enqueuedAt ?? new Date().toISOString(),
  };
}

function mapCustomMetric(metric: ApiCustomMetric): CustomMetric {
  return {
    id: String(metric.id),
    name: metric.name ?? '',
    formula: metric.formula ?? '',
    unitLabel: metric.unitLabel ?? '',
    active: Boolean(metric.active),
  };
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const sessionRef = useRef<AuthSession | null>(session);
  const [isWorkspaceHydrated, setIsWorkspaceHydrated] = useState(() => loadStoredSession() === null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [actionHistory, setActionHistory] = useState<ActionRecord[]>(() => loadStoredActionHistory());
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [apiError, setApiError] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<MarketplaceConnectorDefinition[]>(() => createFallbackConnectors());

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refreshOrganizationConnections = useCallback(
    async (organizationId: string) => {
      if (!session?.accessToken || !organizationId) return [] as MarketplaceConnection[];

      const connectionsResponse = await apiRequest<ApiConnection[]>(`/organizations/${organizationId}/marketplace-connections`, {
        token: session.accessToken,
      });
      const mappedConnections = (connectionsResponse ?? []).map(mapConnection);
      setConnections(current => {
        const remaining = current.filter(connection => connection.organizationId !== organizationId);
        return [...mappedConnections, ...remaining];
      });
      setSyncRuns(current => {
        const connectionIds = new Set(mappedConnections.map(connection => connection.id));
        const remaining = current.filter(run => !connectionIds.has(run.connectionId));
        const nextRuns = (connectionsResponse ?? [])
          .map(connection => connection.latestSyncRun)
          .filter((run): run is ApiSyncRun => Boolean(run))
          .map(mapSyncRun);
        return [...nextRuns, ...remaining].sort((left, right) => Date.parse(right.enqueuedAt) - Date.parse(left.enqueuedAt));
      });
      return mappedConnections;
    },
    [session?.accessToken]
  );

  const refreshConnectionSyncRuns = useCallback(
    async (connectionId: string) => {
      if (!session?.accessToken) return [] as SyncRun[];

      const response = await apiRequest<ApiSyncRun[]>(`/marketplace-connections/${connectionId}/sync-runs`, {
        token: session.accessToken,
      });
      const nextRuns = (response ?? []).map(mapSyncRun);

      setSyncRuns(current => {
        const remaining = current.filter(run => run.connectionId !== connectionId);
        return [...nextRuns, ...remaining].sort((left, right) => Date.parse(right.enqueuedAt) - Date.parse(left.enqueuedAt));
      });

      setConnections(current =>
        current.map(connection =>
          connection.id === connectionId
            ? { ...connection, latestSyncRunId: nextRuns[0]?.id ?? connection.latestSyncRunId }
            : connection
        )
      );

      return nextRuns;
    },
    [session?.accessToken]
  );

  useEffect(() => {
    saveStoredSession(session);
  }, [session]);

  useEffect(() => {
    saveStoredActionHistory(actionHistory);
  }, [actionHistory]);

  useEffect(() => {
    if (!session?.accessToken) return;

    let cancelled = false;
    setIsWorkspaceHydrated(false);

    const bootstrap = async () => {
      try {
        const [me, orgs] = await Promise.all([
          apiRequest<ApiUser>('/auth/me', { token: session.accessToken }),
          apiRequest<ApiOrganization[]>('/users/me/organizations', { token: session.accessToken }),
        ]);

        if (cancelled) return;

        setSession(current =>
          current
            ? {
                ...current,
                user: mapAuthUser(me),
              }
            : current
        );

        const nextOrganizations = (orgs ?? []).map(mapOrganization);
        setOrganizations(nextOrganizations);
        setSelectedOrganizationId(nextOrganizations[0]?.id ?? '');

        setApiError(null);
        setIsWorkspaceHydrated(true);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setSession(null);
          setApiError('Your session expired. Please sign in again.');
          setIsWorkspaceHydrated(true);
          return;
        }
        setSession(null);
        setApiError(null);
        setIsWorkspaceHydrated(true);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const recordAction: PlatformContextValue['recordAction'] = useCallback(action => {
    const nextAction: ActionRecord = {
      id: createId('action'),
      timestamp: new Date().toISOString(),
      ...action,
    };
    setActionHistory(current => [nextAction, ...current].slice(0, 100));
  }, []);

  const dismissNotification: PlatformContextValue['dismissNotification'] = id => {
    setNotifications(current => current.filter(notification => notification.id !== id));
  };

  const enqueueNotification: PlatformContextValue['enqueueNotification'] = notification => {
    const nextNotification: NotificationItem = {
      id: createId('note'),
      timestamp: new Date().toISOString(),
      ...notification,
    };
    setNotifications(current => [nextNotification, ...current].slice(0, NOTIFICATION_LIMIT));
  };

  const register: PlatformContextValue['register'] = async input => {
    setOrganizations([]);
    setSelectedOrganizationId('');
    setMembers([]);
    setInvitations([]);
    setConnections([]);
    setSyncRuns([]);
    setCustomMetrics([]);
    setConnectors(createFallbackConnectors());
    setIsWorkspaceHydrated(false);
    try {
      const response = await apiRequest<ApiRegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!response.user) {
        throw new Error('Backend returned incomplete registration payload.');
      }
      const nextUser = mapAuthUser(response.user);
      const result: RegisterResult = {
        user: nextUser,
        requiresEmailVerification: Boolean(response.requiresEmailVerification),
        nextAction: response.nextAction ?? null,
      };
      setUsers(current => [...current.filter(item => item.email !== nextUser.email), nextUser]);
      setSession(null);
      setIsWorkspaceHydrated(true);
      setApiError(null);
      recordAction({
        kind: 'auth',
        title: 'Registered account',
        description: `${nextUser.email} registered through the backend API.`,
      });
      return result;
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to register.');
      setIsWorkspaceHydrated(true);
      throw error;
    }
  };

  const login: PlatformContextValue['login'] = async input => {
    setOrganizations([]);
    setSelectedOrganizationId('');
    setMembers([]);
    setInvitations([]);
    setConnections([]);
    setSyncRuns([]);
    setCustomMetrics([]);
    setConnectors(createFallbackConnectors());
    setIsWorkspaceHydrated(false);
    try {
      const response = await apiRequest<ApiAuthTokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!response.accessToken || !response.expiresAt || !response.user) {
        throw new Error('Backend returned incomplete login payload.');
      }
      const nextSession: AuthSession = {
        accessToken: response.accessToken,
        tokenType: response.tokenType === 'Bearer' ? 'Bearer' : 'Bearer',
        expiresAt: response.expiresAt,
        user: mapAuthUser(response.user),
        refreshToken: response.refreshToken ?? undefined,
      };
      setUsers(current => [...current.filter(item => item.email !== nextSession.user.email), nextSession.user]);
      setSession(nextSession);
      setIsWorkspaceHydrated(false);
      setApiError(null);
      recordAction({
        kind: 'auth',
        title: 'Logged in',
        description: `${nextSession.user.email} signed in successfully via the backend API.`,
      });
      return nextSession;
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to login.');
      setIsWorkspaceHydrated(true);
      throw error;
    }
  };

  const logout = useCallback(() => {
    setSession(null);
    sessionRef.current = null;
    setIsWorkspaceHydrated(true);
    setOrganizations([]);
    setSelectedOrganizationId('');
    setMembers([]);
    setInvitations([]);
    setConnections([]);
    setSyncRuns([]);
    setCustomMetrics([]);
    setConnectors(createFallbackConnectors());
    recordAction({
      kind: 'auth',
      title: 'Logged out',
      description: 'Current session was cleared.',
    });
  }, [recordAction]);

  const refreshAccessToken = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return null;
    if (!currentSession.refreshToken) {
      logout();
      setApiError('Your session expired. Please sign in again.');
      return null;
    }

    try {
      const response = await apiRequest<ApiAuthTokenResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
        skipAuthRefresh: true,
      });

      if (!response.accessToken || !response.expiresAt) {
        throw new Error('Backend returned incomplete refresh payload.');
      }

      const nextSession: AuthSession = {
        ...currentSession,
        accessToken: response.accessToken,
        tokenType: response.tokenType === 'Bearer' ? 'Bearer' : 'Bearer',
        expiresAt: response.expiresAt,
        user: response.user ? mapAuthUser(response.user) : currentSession.user,
        refreshToken: response.refreshToken ?? currentSession.refreshToken,
      };

      sessionRef.current = nextSession;
      setSession(nextSession);
      setApiError(null);
      return nextSession.accessToken;
    } catch {
      logout();
      setApiError('Your session expired. Please sign in again.');
      return null;
    }
  }, [logout]);

  useEffect(() => {
    configureApiAuthHandlers(
      session
        ? {
            getAccessToken: () => sessionRef.current?.accessToken ?? null,
            getExpiresAt: () => sessionRef.current?.expiresAt ?? null,
            refreshAccessToken,
            onUnauthorized: () => {
              logout();
              setApiError('Your session expired. Please sign in again.');
            },
          }
        : null
    );

    return () => {
      configureApiAuthHandlers(null);
    };
  }, [logout, refreshAccessToken, session]);

  const requestEmailVerification: PlatformContextValue['requestEmailVerification'] = async email => {
    await apiRequest<void>('/auth/request-email-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setApiError(null);
    recordAction({
      kind: 'auth',
      title: 'Requested email verification',
      description: `Email verification requested for ${email}.`,
    });
  };

  const verifyEmail: PlatformContextValue['verifyEmail'] = async input => {
    await apiRequest<void>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUsers(current =>
      current.map(user =>
        user.email === input.email
          ? { ...user, emailVerifiedAt: new Date().toISOString(), isEmailVerified: true }
          : user
      )
    );
    setApiError(null);
    recordAction({
      kind: 'auth',
      title: 'Verified email',
      description: `${input.email} verified email through the backend API.`,
    });
  };

  const createOrganization: PlatformContextValue['createOrganization'] = name => {
    const optimistic: Organization = {
      id: createId('org'),
      name,
      ownerUserId: session?.user.id ?? '',
      currentUserRole: 'Owner',
      currentUserAccountAccessMode: 'Full',
      currentUserMarketplaceConnectionIds: [],
      createdAt: new Date().toISOString(),
    };
    setOrganizations(current => [...current, optimistic]);
    setSelectedOrganizationId(optimistic.id);
    void apiRequest<ApiOrganization>('/organizations', {
      method: 'POST',
      token: session?.accessToken,
      body: JSON.stringify({ name }),
    })
      .then(response => {
        const next = mapOrganization(response);
        setOrganizations(current => [next, ...current.filter(item => item.id !== optimistic.id)]);
        setSelectedOrganizationId(next.id);
        recordAction({
          kind: 'organization',
          title: 'Created organization',
          description: `${next.name} was created through the backend API.`,
        });
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : 'Failed to create organization.';
        setApiError(message);
        enqueueNotification({ tone: 'error', title: 'Не удалось создать организацию', message });
      });
    return optimistic;
  };

  const renameOrganization: PlatformContextValue['renameOrganization'] = async (organizationId, name) => {
    const response = await apiRequest<ApiOrganization>(`/organizations/${organizationId}`, {
      method: 'PATCH',
      token: session?.accessToken,
      body: JSON.stringify({ name }),
    });
    const next = mapOrganization(response);
    setOrganizations(current => current.map(org => (org.id === organizationId ? next : org)));
    recordAction({
      kind: 'organization',
      title: 'Renamed organization',
      description: `${next.name} was saved through the backend API.`,
    });
    return next;
  };

  const selectOrganization = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    const organization = organizations.find(item => item.id === organizationId);
    recordAction({
      kind: 'organization',
      title: 'Selected organization',
      description: organization ? `Switched to ${organization.name}.` : `Switched to organization ${organizationId}.`,
    });
  };

  const inviteMember: PlatformContextValue['inviteMember'] = input => {
    const access = resolveAccountAccessInput(input.role, input.accountAccessMode, input.marketplaceConnectionIds);
    const optimistic: Invitation = {
      id: createId('inv'),
      email: input.email,
      role: input.role,
      accountAccessMode: access.accountAccessMode,
      marketplaceConnectionIds: access.marketplaceConnectionIds,
      status: 'Pending',
    };
    setInvitations(current => [optimistic, ...current]);
    void apiRequest<ApiInvitation>(`/organizations/${selectedOrganizationId}/invitations`, {
      method: 'POST',
      token: session?.accessToken,
      body: JSON.stringify({
        email: input.email,
        role: toApiRole(input.role),
        accountAccessMode: access.accountAccessMode,
        marketplaceConnectionIds: access.marketplaceConnectionIds,
      }),
    })
      .then(response => {
        const next = mapInvitation(response);
        setInvitations(current => [next, ...current.filter(item => item.id !== optimistic.id)]);
        recordAction({
          kind: 'invitation',
          title: 'Invited member',
          description: `${next.email} invited with ${next.role} role through the backend API.`,
        });
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : 'Failed to invite member.';
        setApiError(message);
        enqueueNotification({ tone: 'error', title: 'Не удалось отправить приглашение', message });
      });
    return optimistic;
  };

  const acceptInvitation: PlatformContextValue['acceptInvitation'] = async token => {
    await apiRequest<void>('/invitations/accept', {
      method: 'POST',
      token: session?.accessToken,
      body: JSON.stringify({ token }),
    });
    if (session?.accessToken) {
      const orgs = await apiRequest<ApiOrganization[]>('/users/me/organizations', { token: session.accessToken });
      const nextOrganizations = (orgs ?? []).map(mapOrganization);
      setOrganizations(nextOrganizations);
      setSelectedOrganizationId(nextOrganizations[0]?.id ?? '');
    }
    recordAction({
      kind: 'invitation',
      title: 'Accepted invitation',
      description: `Invitation token ${token} was accepted through the backend API.`,
    });
  };

  const previewInvitation: PlatformContextValue['previewInvitation'] = async token => {
    const response = await apiRequest<ApiInvitationPreview>('/invitations/preview', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return mapInvitationPreview(response);
  };

  const updateMemberRole: PlatformContextValue['updateMemberRole'] = async input => {
    const access = resolveAccountAccessInput(input.role, input.accountAccessMode, input.marketplaceConnectionIds);
    await apiRequest<void>(`/organizations/${selectedOrganizationId}/members/${input.memberId}/role`, {
      method: 'PATCH',
      token: session?.accessToken,
      body: JSON.stringify({
        role: toApiRole(input.role),
        accountAccessMode: access.accountAccessMode,
        marketplaceConnectionIds: access.marketplaceConnectionIds,
      }),
    });
    setMembers(current =>
      current.map(member =>
        member.id === input.memberId
          ? {
              ...member,
              role: input.role,
              accountAccessMode: access.accountAccessMode,
              marketplaceConnectionIds: access.marketplaceConnectionIds,
            }
          : member
      )
    );
    recordAction({
      kind: 'organization',
      title: 'Updated member role',
      description: `Member ${input.memberId} now has ${input.role} role.`,
    });
  };

  const removeMember: PlatformContextValue['removeMember'] = async memberId => {
    await apiRequest<void>(`/organizations/${selectedOrganizationId}/members/${memberId}`, {
      method: 'DELETE',
      token: session?.accessToken,
    });
    setMembers(current => current.filter(member => member.id !== memberId));
    recordAction({
      kind: 'organization',
      title: 'Removed member',
      description: `Member ${memberId} was removed from the organization.`,
    });
  };

  const transferOrganizationOwnership: PlatformContextValue['transferOrganizationOwnership'] = async newOwnerUserId => {
    await apiRequest<void>(`/organizations/${selectedOrganizationId}/transfer-ownership`, {
      method: 'POST',
      token: session?.accessToken,
      body: JSON.stringify({ newOwnerUserId }),
    });
    setOrganizations(current =>
      current.map(org =>
        org.id === selectedOrganizationId ? { ...org, ownerUserId: newOwnerUserId } : org
      )
    );
    setMembers(current =>
      current.map(member =>
        member.id === newOwnerUserId
          ? { ...member, role: 'Owner', accountAccessMode: 'Full', marketplaceConnectionIds: [] }
          : member.role === 'Owner'
            ? { ...member, role: 'Admin', accountAccessMode: 'Full', marketplaceConnectionIds: [] }
            : member
      )
    );
    recordAction({
      kind: 'organization',
      title: 'Transferred ownership',
      description: `Organization ownership moved to ${newOwnerUserId}.`,
    });
  };

  const revokeInvitation: PlatformContextValue['revokeInvitation'] = async invitationId => {
    await apiRequest<void>(`/invitations/${invitationId}/revoke`, {
      method: 'POST',
      token: session?.accessToken,
    });
    setInvitations(current => current.filter(invitation => invitation.id !== invitationId));
    recordAction({
      kind: 'invitation',
      title: 'Revoked invitation',
      description: `Invitation ${invitationId} was revoked through the backend API.`,
    });
  };

  const connectShop: PlatformContextValue['connectShop'] = input => {
    const optimisticDisplayName = input.displayName?.trim() || `${input.marketplace} shop`;
    const optimisticConnection: MarketplaceConnection = {
      id: createId('conn'),
      organizationId: selectedOrganizationId,
      marketplace: input.marketplace,
      displayName: optimisticDisplayName,
      credentialSummary: Object.keys(input.credentials).join(', '),
      validationState: 'Validated',
    };
    setConnections(current => [optimisticConnection, ...current]);
    void apiRequest<{ connection: ApiConnection; validation: ApiConnectionValidationResult; initialSync?: { syncRunIds?: string[]; enqueuedAt: string } }>('/marketplace-connections/connect-shop', {
      method: 'POST',
      token: session?.accessToken,
      body: JSON.stringify({
        organizationId: selectedOrganizationId,
        marketplace: input.marketplace,
        displayName: input.displayName?.trim() || undefined,
        credentials: input.credentials,
        startInitialSync: input.startInitialSync,
        initialSyncDays: input.initialSyncDays,
        initialSyncKinds: input.initialSyncKinds,
      }),
    })
      .then(response => {
        const nextConnection = mapConnection(response.connection);
        setConnections(current => [nextConnection, ...current.filter(item => item.id !== optimisticConnection.id)]);
        if (response.initialSync?.syncRunIds?.length) {
          void refreshConnectionSyncRuns(nextConnection.id).catch(() => {});
        }
        recordAction({
          kind: 'connection',
          title: 'Connected marketplace shop',
          description: `${nextConnection.marketplace} shop ${nextConnection.displayName} was connected through the backend API.`,
        });
      })
      .catch(error => setApiError(error instanceof Error ? error.message : 'Failed to connect shop.'));
    return optimisticConnection;
  };

  const updateConnection: PlatformContextValue['updateConnection'] = async input => {
    const response = await apiRequest<ApiConnectionUpdateResponse | void>(`/marketplace-connections/${input.connectionId}`, {
      method: 'PATCH',
      token: session?.accessToken,
      body: JSON.stringify({
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.credentials ? { credentials: input.credentials } : {}),
      }),
    });
    const responseConnection = resolveConnectionUpdateResponse(response);
    const refreshedConnection = responseConnection
      ? mapConnection(responseConnection)
      : (await refreshOrganizationConnections(selectedOrganizationId)).find(connection => connection.id === input.connectionId);

    if (!refreshedConnection) {
      throw new ApiError('Updated connection was not returned by the backend.', 500);
    }

    setConnections(current => current.map(connection => (connection.id === refreshedConnection.id ? refreshedConnection : connection)));
    recordAction({
      kind: 'connection',
      title: 'Updated marketplace shop',
      description: `${refreshedConnection.displayName} settings were updated through the backend API.`,
    });
    return refreshedConnection;
  };

  const deleteConnection: PlatformContextValue['deleteConnection'] = async connectionId => {
    const source = connections.find(connection => connection.id === connectionId);
    await apiRequest<void>(`/marketplace-connections/${connectionId}`, {
      method: 'DELETE',
      token: session?.accessToken,
    });
    setConnections(current => current.filter(connection => connection.id !== connectionId));
    setSyncRuns(current => current.filter(run => run.connectionId !== connectionId));
    recordAction({
      kind: 'connection',
      title: 'Deleted marketplace shop',
      description: `${source?.displayName ?? connectionId} was deleted through the backend API.`,
    });
  };

  const validateConnection = async (connectionId: string) => {
    await apiRequest<void>(`/marketplace-connections/${connectionId}/validate`, {
      method: 'POST',
      token: session?.accessToken,
    });
    const refreshedConnections = await refreshOrganizationConnections(selectedOrganizationId);
    const nextConnection = refreshedConnections.find(connection => connection.id === connectionId);
    if (!nextConnection) {
      throw new ApiError('Validated connection was not returned by the backend.', 500);
    }
    recordAction({
      kind: 'connection',
      title: 'Validated connection',
      description: `${nextConnection.displayName} validation was refreshed through the backend API.`,
    });
    return nextConnection;
  };

  const enqueueSync: PlatformContextValue['enqueueSync'] = input => {
    void apiRequest<{ syncRunIds?: string[]; enqueuedAt?: string }>(`/marketplace-connections/${input.connectionId}/sync`, {
      method: 'POST',
      token: session?.accessToken,
      body: JSON.stringify(input),
    })
      .then(() => {
        void refreshConnectionSyncRuns(input.connectionId).catch(() => {});
        recordAction({
          kind: 'sync',
          title: 'Enqueued sync',
          description: `${input.syncKinds.join(', ')} sync queued for ${input.dateFrom} → ${input.dateTo} through the backend API.`,
        });
      })
      .catch(error => setApiError(error instanceof Error ? error.message : 'Failed to enqueue sync.'));
    return null;
  };

  const retrySync: PlatformContextValue['retrySync'] = syncRunId => {
    const source = syncRuns.find(run => run.id === syncRunId);
    if (!source) return null;
    void apiRequest<{ syncRunIds?: string[]; enqueuedAt?: string }>(`/marketplace-sync-runs/${syncRunId}/retry`, {
      method: 'POST',
      token: session?.accessToken,
    })
      .then(() => {
        void refreshConnectionSyncRuns(source.connectionId).catch(() => {});
        recordAction({
          kind: 'sync',
          title: 'Retried sync',
          description: `Sync ${syncRunId} was retried through the backend API.`,
        });
      })
      .catch(error => setApiError(error instanceof Error ? error.message : 'Failed to retry sync.'));
    return source;
  };

  const cancelSync: PlatformContextValue['cancelSync'] = syncRunId => {
    const source = syncRuns.find(run => run.id === syncRunId);
    void apiRequest<ApiSyncRun>(`/marketplace-sync-runs/${syncRunId}/cancel`, {
      method: 'POST',
      token: session?.accessToken,
    })
      .then(() => {
        if (source) {
          void refreshConnectionSyncRuns(source.connectionId).catch(() => {});
        }
        recordAction({
          kind: 'sync',
          title: 'Cancelled sync',
          description: `Sync ${syncRunId} was cancelled through the backend API.`,
        });
      })
      .catch(error => setApiError(error instanceof Error ? error.message : 'Failed to cancel sync.'));
    return source ?? null;
  };

  const addCustomMetric = (metric: CustomMetric) => {
    setCustomMetrics(current => [metric, ...current.filter(item => item.id !== metric.id)]);
    void apiRequest<ApiCustomMetric>('/config/custom-metrics', {
      method: 'POST',
      token: session?.accessToken,
      body: JSON.stringify({
        name: metric.name,
        formula: metric.formula,
        unit: 0,
        unitLabel: metric.unitLabel,
        active: metric.active,
      }),
    }).catch(error => setApiError(error instanceof Error ? error.message : 'Failed to save custom metric.'));
  };

  const updateCustomMetric = addCustomMetric;

  const updateProfile: PlatformContextValue['updateProfile'] = async input => {
    const response = await apiRequest<ApiProfileResponse>('/users/me', {
      method: 'PUT',
      token: session?.accessToken,
      body: JSON.stringify(input),
    });
    const nextUser = mapAuthUser(response);
    setSession(current =>
      current
        ? {
            ...current,
            user: nextUser,
          }
        : current
    );
    setUsers(current => [nextUser, ...current.filter(item => item.id !== nextUser.id && item.email !== nextUser.email)]);
    recordAction({
      kind: 'auth',
      title: 'Updated profile',
      description: `${nextUser.email} profile updated through the backend API.`,
    });
    return nextUser;
  };

  const changePassword: PlatformContextValue['changePassword'] = async input => {
    await apiRequest<void>('/users/me/change-password', {
      method: 'POST',
      token: session?.accessToken,
      body: JSON.stringify(input),
    });
    recordAction({
      kind: 'auth',
      title: 'Changed password',
      description: 'Current account password was updated through the backend API.',
    });
  };

  const requestPasswordReset: PlatformContextValue['requestPasswordReset'] = async email => {
    await apiRequest<void>('/users/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    recordAction({
      kind: 'auth',
      title: 'Requested password reset',
      description: `Password reset requested for ${email}.`,
    });
  };

  const resetPassword: PlatformContextValue['resetPassword'] = async input => {
    await apiRequest<void>('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setApiError(null);
    recordAction({
      kind: 'auth',
      title: 'Reset password',
      description: 'Password was reset using a recovery token.',
    });
  };

  const loadSettingsTabData = useCallback<PlatformContextValue['loadSettingsTabData']>(async tab => {
    if (!session?.accessToken || !selectedOrganizationId) return;

    try {
      if (tab === 'shops') {
        const [connectionsResponse, connectorCatalog] = await Promise.all([
          apiRequest<ApiConnection[]>(`/organizations/${selectedOrganizationId}/marketplace-connections`, { token: session.accessToken }),
          apiRequest<ApiConnector[]>('/marketplaces/connectors', { token: session.accessToken }),
        ]);

        const mappedConnections = (connectionsResponse ?? []).map(mapConnection);
        setConnections(mappedConnections);
        setSyncRuns(
          (connectionsResponse ?? [])
            .map(connection => connection.latestSyncRun)
            .filter((run): run is ApiSyncRun => Boolean(run))
            .map(mapSyncRun)
        );
        setConnectors(
          (connectorCatalog ?? []).map((connector: ApiConnector) => ({
            marketplace: mapMarketplace(connector.marketplace),
            label: connector.label ?? mapMarketplace(connector.marketplace),
            supportedSyncKinds: connector.supportedSyncKinds ?? [],
            credentialFields: (connector.credentialFields ?? []).map(field => ({
              key: String(field.key),
              label: field.label ?? String(field.key),
              secret: Boolean(field.secret),
              required: field.required !== false,
            })),
          }))
        );
      }

      if (tab === 'users') {
        const [membersResponse, invitationsResponse, connectionsResponse] = await Promise.all([
          apiRequest<ApiMember[]>(`/organizations/${selectedOrganizationId}/members`, { token: session.accessToken }),
          apiRequest<ApiInvitation[]>(`/organizations/${selectedOrganizationId}/invitations`, { token: session.accessToken }),
          apiRequest<ApiConnection[]>(`/organizations/${selectedOrganizationId}/marketplace-connections`, { token: session.accessToken }),
        ]);

        setMembers((membersResponse ?? []).map(mapMember));
        setInvitations((invitationsResponse ?? []).map(mapInvitation));
        setConnections((connectionsResponse ?? []).map(mapConnection));
      }

      if (tab === 'metrics') {
        const metricCatalog = await apiRequest<ApiCustomMetric[]>('/config/custom-metrics', { token: session.accessToken });
        setCustomMetrics((metricCatalog ?? []).map(mapCustomMetric));
      }

      setApiError(null);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to load requested settings data.');
      throw error;
    }
  }, [session?.accessToken, selectedOrganizationId]);

  const deleteCurrentUser: PlatformContextValue['deleteCurrentUser'] = async () => {
    await apiRequest<void>('/users/me', {
      method: 'DELETE',
      token: session?.accessToken,
    });
    setSession(null);
    setIsWorkspaceHydrated(true);
    setUsers([]);
    setOrganizations([]);
    setSelectedOrganizationId('');
    setMembers([]);
    setInvitations([]);
    setConnections([]);
    setSyncRuns([]);
    setCustomMetrics([]);
    setConnectors(createFallbackConnectors());
    recordAction({
      kind: 'auth',
      title: 'Deleted account',
      description: 'Current user account was deleted through the backend API.',
    });
  };

  const value: PlatformContextValue = {
    session,
    isWorkspaceHydrated,
    users,
    organizations,
    selectedOrganizationId,
    members,
    invitations,
    connectors,
    connections,
    syncRuns,
    customMetrics,
    actionHistory,
    notifications,
    apiError,
    register,
    login,
    logout,
    requestEmailVerification,
    verifyEmail,
    createOrganization,
    renameOrganization,
    selectOrganization,
    inviteMember,
    previewInvitation,
    acceptInvitation,
    updateMemberRole,
    removeMember,
    transferOrganizationOwnership,
    revokeInvitation,
    connectShop,
    updateConnection,
    deleteConnection,
    validateConnection,
    enqueueSync,
    retrySync,
    cancelSync,
    addCustomMetric,
    updateCustomMetric,
    updateProfile,
    changePassword,
    requestPasswordReset,
    resetPassword,
    deleteCurrentUser,
    loadSettingsTabData,
    recordAction,
    dismissNotification,
    enqueueNotification,
  };

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error('usePlatform must be used within PlatformProvider');
  return context;
}
