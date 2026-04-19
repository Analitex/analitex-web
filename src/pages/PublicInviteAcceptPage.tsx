import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

interface PublicInviteAcceptPageProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
}

export function PublicInviteAcceptPage({ onSuccess, onGoToLogin }: PublicInviteAcceptPageProps) {
  const { acceptInvitation, apiError } = usePlatform();
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const tokenFromQuery = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('token') ?? '';
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const inviteToken = token.trim() || tokenFromQuery;
    if (!inviteToken) {
      setNotice('Укажите токен приглашения.');
      return;
    }

    setIsSubmitting(true);
    setNotice(null);
    try {
      await acceptInvitation(inviteToken);
      setNotice('Приглашение принято. Теперь можно продолжить работу.');
      onSuccess();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось принять приглашение.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Присоединитесь к рабочему пространству в один клик
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Подтвердите приглашение и получите доступ к организации без лишних шагов.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <InviteCard title="Быстрое подключение" text="Введите токен или используйте ссылку из письма." />
              <InviteCard title="Без лишних шагов" text="После подтверждения вы сразу продолжите работу." />
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
                Введите токен из письма или используйте параметр token из ссылки.
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

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <Field
                label="Токен приглашения"
                value={token || tokenFromQuery}
                onChange={value => setToken(value)}
                placeholder="Введите токен приглашения"
                autoFocus
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Подтверждаем...
                  </>
                ) : (
                  <>
                    Принять приглашение
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={onGoToLogin}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Перейти к входу
            </button>
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}
