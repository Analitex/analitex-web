import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ReportMode = 'management' | 'financial';

interface ReportModeContextValue {
  reportMode: ReportMode;
  setReportMode: (mode: ReportMode) => void;
}

const REPORT_MODE_STORAGE_KEY = 'dashboard-report-mode';

const ReportModeContext = createContext<ReportModeContextValue | null>(null);

export function ReportModeProvider({ children }: { children: ReactNode }) {
  const [reportMode, setReportMode] = useState<ReportMode>(() => {
    if (typeof window === 'undefined') return 'management';
    const raw = window.localStorage.getItem(REPORT_MODE_STORAGE_KEY);
    return raw === 'financial' ? 'financial' : 'management';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(REPORT_MODE_STORAGE_KEY, reportMode);
  }, [reportMode]);

  return (
    <ReportModeContext.Provider value={{ reportMode, setReportMode }}>
      {children}
    </ReportModeContext.Provider>
  );
}

export function useReportMode() {
  const context = useContext(ReportModeContext);
  if (!context) throw new Error('useReportMode must be used within ReportModeProvider');
  return context;
}
