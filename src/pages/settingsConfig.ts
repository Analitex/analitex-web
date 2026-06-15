import { Plus, ReceiptText, Store, UserCog, Users } from 'lucide-react';

export type SettingsTabId = 'profile' | 'shops' | 'users' | 'taxes' | 'metrics';
export type SettingsRole = 'Owner' | 'Admin' | 'Manager' | null | undefined;

export const SETTINGS_TABS = [
  { id: 'profile', label: 'Профиль', icon: UserCog, description: 'Личные данные и доступ' },
  { id: 'shops', label: 'Магазины', icon: Store, description: 'Подключенные кабинеты' },
  { id: 'users', label: 'Пользователи', icon: Users, description: 'Доступы' },
  { id: 'taxes', label: 'Налоги', icon: ReceiptText, description: 'Режимы и квартальные ставки' },
  { id: 'metrics', label: 'Метрики', icon: Plus, description: 'Пользовательские метрики' },
] satisfies {
  id: SettingsTabId;
  label: string;
  icon: typeof UserCog;
  description: string;
}[];

export function canAccessSettingsTab(tabId: SettingsTabId, role: SettingsRole) {
  if (tabId === 'profile') return true;
  return role === 'Owner' || role === 'Admin';
}

export function getVisibleSettingsTabs(role: SettingsRole) {
  return SETTINGS_TABS.filter(tab => canAccessSettingsTab(tab.id, role));
}
