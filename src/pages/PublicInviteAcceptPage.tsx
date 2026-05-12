import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { usePlatform, type InvitationPreview } from '../context/PlatformContext';

interface PublicInviteAcceptPageProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  onGoToRegister: () => void;
}

const PENDING_INVITE_TOKEN_KEY = 'aistats-pending-invite-token';
const PENDING_INVITE_EMAIL_KEY = 'aistats-pending-invite-email';

export function PublicInviteAcceptPage({ onSuccess, onGoToLogin, onGoToRegister }: PublicInviteAcceptPageProps) {
  const { acceptInvitation, previewInvitation, session, enqueueNotification } = usePlatform();
  const acceptInvitationRef = useRef(acceptInvitation);
  const previewInvitationRef = useRef(previewInvitation);
  const enqueueNotificationRef = useRef(enqueueNotification);
  const onSuccessRef = useRef(onSuccess);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [preview, setPreview] = useState<InvitationPreview | null>(null);

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
    previewInvitationRef.current = previewInvitation;
    enqueueNotificationRef.current = enqueueNotification;
    onSuccessRef.current = onSuccess;
  }, [acceptInvitation, enqueueNotification, onSuccess, previewInvitation]);

  useEffect(() => {
    if (!inviteToken) {
      setNotice('Ссылка приглашения недействительна или устарела. Попросите отправить приглашение еще раз.');
      return;
    }

    let cancelled = false;
    const loadInvite = async () => {
      setIsSubmitting(true);
      setNotice('Проверяем приглашение...');
      setNeedsAuth(false);

      try {
        const nextPreview = await previewInvitationRef.current(inviteToken);
        if (cancelled) return;
        setPreview(nextPreview);
        if (nextPreview.isExpired || nextPreview.status !== 'Pending') {
          setNotice('Это приглашение больше не активно. Попросите отправить новое приглашение.');
          return;
        }
        window.sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, inviteToken);
        window.sessionStorage.setItem(PENDING_INVITE_EMAIL_KEY, nextPreview.email);
        if (!session?.accessToken) {
          setNeedsAuth(true);
          setNotice('Войдите или создайте аккаунт, чтобы присоединиться к команде.');
          return;
        }

        await acceptInvitationRef.current(inviteToken);
        if (cancelled) return;
        window.sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
        window.sessionStorage.removeItem(PENDING_INVITE_EMAIL_KEY);
        setNotice('Приглашение принято. Открываем рабочее пространство.');
        onSuccessRef.current();
      } catch (error) {
        if (cancelled) return;
        window.sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, inviteToken);
        setNeedsAuth(true);
        if (session) {
          enqueueNotificationRef.current({
            tone: 'error',
            title: 'Не удалось принять приглашение',
            message: getErrorMessage(error, 'Не удалось принять приглашение.'),
          });
          setNotice('Попробуйте снова или запросите новое приглашение.');
        } else {
          setNotice('Войдите или создайте аккаунт, чтобы присоединиться к команде.');
        }
      } finally {
        if (!cancelled) {
          setIsSubmitting(false);
        }
      }
    };

    void loadInvite();

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

      <div className="relative mx-auto flex min-h-screen max-w-xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <section className="w-full">
          <div className="w-full rounded-[2.25rem] border border-white/80 bg-white/92 p-6 text-slate-900 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 text-sm font-semibold">
              <div className="rounded-xl bg-white px-4 py-2 text-slate-950 shadow-sm">Приглашение</div>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-semibold text-slate-950">
                Подтвердите приглашение
              </h2>
            </div>

            {notice && (
              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                {notice}
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              {preview && (
                <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Команда</span>
                    <span className="font-semibold text-slate-900">{preview.organizationName || 'Команда AiStats'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Email</span>
                    <span className="font-semibold text-slate-900">{preview.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Роль</span>
                    <span className="font-semibold text-slate-900">{preview.role}</span>
                  </div>
                </div>
              )}
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
