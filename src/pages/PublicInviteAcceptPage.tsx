import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

interface PublicInviteAcceptPageProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  onGoToRegister: () => void;
}

const PENDING_INVITE_TOKEN_KEY = 'aistats-pending-invite-token';

export function PublicInviteAcceptPage({ onSuccess, onGoToLogin, onGoToRegister }: PublicInviteAcceptPageProps) {
  const { acceptInvitation, session, apiError } = usePlatform();
  const acceptInvitationRef = useRef(acceptInvitation);
  const onSuccessRef = useRef(onSuccess);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const inviteToken = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token') ?? params.get('inviteToken');
    if (queryToken) return queryToken;
    const pathMatch = window.location.pathname.match(/^\/accept-invite\/([^/?#]+)\/?$/);
    if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);
    return window.sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY) ?? '';
  }, []);

  useEffect(() => {
    acceptInvitationRef.current = acceptInvitation;
    onSuccessRef.current = onSuccess;
  }, [acceptInvitation, onSuccess]);

  useEffect(() => {
    if (!inviteToken) {
      setNotice('Ссылка приглашения недействительна или устарела. Попросите отправить приглашение еще раз.');
      return;
    }

    let cancelled = false;
    const accept = async () => {
      setIsSubmitting(true);
      setNotice('Проверяем приглашение...');
      setNeedsAuth(false);

      try {
        await acceptInvitationRef.current(inviteToken);
        if (cancelled) return;
        window.sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
        setNotice('Приглашение принято. Открываем рабочее пространство.');
        onSuccessRef.current();
      } catch (error) {
        if (cancelled) return;
        window.sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, inviteToken);
        setNeedsAuth(true);
        setNotice(
          session
            ? error instanceof Error ? error.message : 'Не удалось принять приглашение.'
            : 'Войдите или создайте аккаунт, чтобы присоединиться к команде.'
        );
      } finally {
        if (!cancelled) {
          setIsSubmitting(false);
        }
      }
    };

    void accept();

    return () => {
      cancelled = true;
    };
  }, [inviteToken, session]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fc_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.10),transparent_24%),radial-gradient(circle_at_84%_24%,rgba(129,140,248,0.09),transparent_24%),radial-gradient(circle_at_68%_84%,rgba(16,185,129,0.07),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute left-[-8rem] top-16 h-[24rem] w-[24rem] rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-[22rem] w-[22rem] rounded-full bg-indigo-300/25 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] p-8 shadow-[0_30px_100px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-10 lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-start">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.08),transparent_30%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />

          <div className="relative max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              <ShieldCheck size={14} />
              Приглашение
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Вас пригласили в команду
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Подтвердите приглашение, чтобы открыть доступ к отчетам, магазинам и настройкам вашей организации.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <InviteCard title="Рабочее пространство" text="Вы попадете в организацию, куда вас пригласил владелец или администратор." />
              <InviteCard title="Доступ к данным" text="После подтверждения откроются разделы, доступные для вашей роли." />
            </div>
          </div>
        </section>

        <section className="flex items-start">
          <div className="w-full rounded-[2.25rem] border border-white/80 bg-white/92 p-6 text-slate-900 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8 lg:min-h-[calc(100vh-4rem)]">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 text-sm font-semibold">
              <div className="rounded-xl bg-white px-4 py-2 text-slate-950 shadow-sm">Приглашение</div>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-semibold text-slate-950">Подтвердите приглашение</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Если вы открыли ссылку из письма, приглашение уже подставлено. Остается только подтвердить вход в команду.
              </p>
            </div>

            {apiError && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {apiError}
              </div>
            )}
            {notice && (
              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                {notice}
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              {isSubmitting ? (
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <Loader2 size={18} className="animate-spin text-sky-700" />
                  Проверяем доступ к команде...
                </div>
              ) : needsAuth ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={onGoToRegister}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Создать аккаунт
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={onGoToLogin}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    У меня уже есть аккаунт
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-600">Ожидаем подтверждение приглашения.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InviteCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
