import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

interface PublicResetPasswordPageProps {
  onSuccess: () => void;
}

export function PublicResetPasswordPage({ onSuccess }: PublicResetPasswordPageProps) {
  const { resetPassword, requestPasswordReset, apiError } = usePlatform();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });

  const tokenFromQuery = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('resetToken') ?? params.get('token');
    if (queryToken) return queryToken;
    const pathMatch = window.location.pathname.match(/^\/reset-password\/([^/?#]+)\/?$/);
    return pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : '';
  }, []);

  const hasLinkToken = Boolean(tokenFromQuery);

  useEffect(() => {
    if (tokenFromQuery) {
      setStep(2);
    }
  }, [tokenFromQuery]);

  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRequestingCode(true);
    setNotice(null);

    try {
      await requestPasswordReset(form.email.trim());
      setNotice('Мы отправили письмо для восстановления. Проверьте почту и продолжите.');
      setStep(2);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось отправить письмо.');
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      setNotice('Пароль и подтверждение не совпадают.');
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      await resetPassword({
        resetToken: form.code.trim() || tokenFromQuery,
        newPassword: form.newPassword,
      });
      setNotice('Пароль успешно обновлен.');
      onSuccess();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось обновить пароль.');
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
              Восстановление
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Верните доступ за два простых шага
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Сначала получите письмо, затем задайте новый пароль и продолжайте работу в AiStats.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <StepCard index="1" title="Получить письмо" text="Введите email и мы отправим ссылку для восстановления." />
              <StepCard index="2" title="Задать пароль" text="Введите код из письма и создайте новый пароль." />
            </div>
          </div>
        </section>

        <section className="flex items-start">
          <div className="w-full rounded-[2.25rem] border border-white/80 bg-white/92 p-6 text-slate-900 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8 lg:min-h-[calc(100vh-4rem)]">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 text-sm font-semibold">
              <div className={`rounded-xl px-4 py-2 ${step === 1 ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
                Шаг 1
              </div>
              <div className={`rounded-xl px-4 py-2 ${step === 2 ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}>
                Шаг 2
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-semibold text-slate-950">
                {step === 1 ? 'Получить письмо' : 'Новый пароль'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {step === 1
                  ? 'Введите адрес почты, чтобы отправить письмо для восстановления.'
                  : hasLinkToken
                    ? 'Ссылка подтверждена. Задайте новый пароль для аккаунта.'
                    : 'Введите код из письма и задайте новый пароль для аккаунта.'}
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

            {step === 1 ? (
              <form className="mt-5 space-y-4" onSubmit={handleSendCode}>
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={value => setForm(current => ({ ...current, email: value }))}
                  placeholder="you@company.com"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isRequestingCode || !form.email.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isRequestingCode ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Отправляем письмо...
                    </>
                  ) : (
                    <>
                      Получить письмо
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={handleReset}>
                {!hasLinkToken && (
                  <Field
                    label="Код из письма"
                    value={form.code}
                    onChange={value => setForm(current => ({ ...current, code: value }))}
                    placeholder="Введите код из письма"
                    autoFocus
                  />
                )}
                <Field
                  label="Новый пароль"
                  type="password"
                  value={form.newPassword}
                  onChange={value => setForm(current => ({ ...current, newPassword: value }))}
                  placeholder="••••••••"
                  autoFocus={hasLinkToken}
                />
                <Field
                  label="Подтвердите пароль"
                  type="password"
                  value={form.confirmPassword}
                  onChange={value => setForm(current => ({ ...current, confirmPassword: value }))}
                  placeholder="••••••••"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={hasLinkToken}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {hasLinkToken ? 'Ссылка получена' : 'Назад'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !(form.code.trim() || tokenFromQuery) || !form.newPassword}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Обновляем пароль...
                      </>
                    ) : (
                      <>
                        Сохранить новый пароль
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StepCard({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">{index}</div>
      <div className="mt-3 text-sm font-semibold text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>
      <input
        autoFocus={autoFocus}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}
