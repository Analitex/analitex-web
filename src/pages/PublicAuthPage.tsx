import { forwardRef, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

export type AuthMode = 'login' | 'register';

interface PublicAuthPageProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onResetPassword: () => void;
  onAcceptInvite: () => void;
}

export function PublicAuthPage({ mode, onModeChange, onResetPassword, onAcceptInvite }: PublicAuthPageProps) {
  const { register, login, requestPasswordReset, apiError } = usePlatform();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [showExtraRegistration, setShowExtraRegistration] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const [registerForm, setRegisterForm] = useState({
    email: 'owner@company.com',
    password: 'secret',
    firstName: 'Anna',
    lastName: 'Ivanova',
    phone: '+79990000000',
  });

  const [loginForm, setLoginForm] = useState({
    email: 'owner@company.com',
    password: 'secret',
  });

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, [mode]);

  const passwordStrength = useMemo(() => {
    const value = mode === 'register' ? registerForm.password : loginForm.password;
    const score =
      Number(value.length >= 8) +
      Number(/[A-ZА-Я]/.test(value)) +
      Number(/\d/.test(value)) +
      Number(/[^A-Za-zА-Яа-я0-9]/.test(value));

    if (value.length === 0) return { label: 'Введите пароль', tone: 'slate' as const, width: '0%' };
    if (score <= 1) return { label: 'Слабый пароль', tone: 'rose' as const, width: '25%' };
    if (score === 2) return { label: 'Надёжность средняя', tone: 'amber' as const, width: '50%' };
    if (score === 3) return { label: 'Хороший пароль', tone: 'blue' as const, width: '75%' };
    return { label: 'Отличный пароль', tone: 'emerald' as const, width: '100%' };
  }, [loginForm.password, mode, registerForm.password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'register' && !privacyConsent) {
      setConsentError('Подтвердите согласие с политикой и обработкой данных.');
      return;
    }

    setConsentError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        await register(registerForm);
      } else {
        await login(loginForm);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsRequestingReset(true);
    setResetNotice(null);

    try {
      const email = loginForm.email || registerForm.email;
      await requestPasswordReset(email);
      setResetNotice(`Мы отправили ссылку на ${email}.`);
    } catch (error) {
      setResetNotice(error instanceof Error ? error.message : 'Не удалось отправить ссылку.');
    } finally {
      setIsRequestingReset(false);
    }
  };

  const firstActionLabel = mode === 'login' ? 'Войти' : 'Зарегистрироваться';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fc_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.10),transparent_28%),radial-gradient(circle_at_84%_22%,rgba(99,102,241,0.09),transparent_30%),radial-gradient(circle_at_68%_86%,rgba(16,185,129,0.07),transparent_26%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute left-[-8rem] top-16 h-[24rem] w-[24rem] rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-[22rem] w-[22rem] rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[26%] h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] p-8 shadow-[0_30px_100px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-10 lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-start">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.08),transparent_30%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />

          <div className="relative flex w-full flex-col gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                <ShieldCheck size={14} />
                AiStats
              </div>

              <h1 className="mt-5 max-w-xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-2xl lg:text-2xl">
                Увеличьте прибыль на Wildberries и Ozon с помощью данных
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Глубокая аналитика, оцифровка продаж и рост эффективности бизнеса
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <BenefitCard
                icon={<Check size={16} />}
                title="Убыточные товары"
                text="Найдите позиции, которые тянут прибыль вниз"
              />
              <BenefitCard
                icon={<TrendingUp size={16} />}
                title="Маржинальность"
                text="Поймите, где зарабатывать больше уже сейчас"
              />
              <BenefitCard
                icon={<Sparkles size={16} />}
                title="Конкуренты"
                text="Отслеживайте рынок и реагируйте быстрее"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="text-sm text-slate-600">1000+ продавцов уже используют AiStats</div>
            </div>
          </div>
        </section>

        <section className="flex items-start">
          <div className="relative w-full rounded-[2.25rem] border border-white/80 bg-white/92 p-6 text-slate-900 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8 lg:min-h-[calc(100vh-4rem)]">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />

            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => onModeChange('login')}
                  className={`rounded-xl px-4 py-2 transition-colors ${
                    mode === 'login' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('register')}
                  className={`rounded-xl px-4 py-2 transition-colors ${
                    mode === 'register' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Регистрация
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-semibold text-slate-950">
                {mode === 'login' ? 'Войти в AiStats' : 'Создать аккаунт'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mode === 'login'
                  ? 'Нет аккаунта? Зарегистрироваться.'
                  : 'Уже есть аккаунт? Войти.'}
              </p>
            </div>

            {apiError && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {apiError}
              </div>
            )}

            {resetNotice && (
              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                {resetNotice}
              </div>
            )}

            {consentError && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {consentError}
              </div>
            )}

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              

              {mode === 'register' && (
                <div>
                  
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <Field
                    label="Имя"
                    value={registerForm.firstName}
                    onChange={value => setRegisterForm(current => ({ ...current, firstName: value }))}
                    autoComplete="given-name"
                    placeholder="Алина"
                  />
                  <Field
                    label="Фамилия"
                    value={registerForm.lastName}
                    onChange={value => setRegisterForm(current => ({ ...current, lastName: value }))}
                    autoComplete="family-name"
                    placeholder="Иванова"
                  />
                </div>
                
                  <Field
                    label="Телефон"
                    value={registerForm.phone}
                    onChange={value => setRegisterForm(current => ({ ...current, phone: value }))}
                    autoComplete="tel"
                    placeholder="+7 999 123-45-67"
                  />
                </div>
              )}
              
              <Field
                ref={firstFieldRef}
                label="Email"
                type="email"
                value={mode === 'register' ? registerForm.email : loginForm.email}
                onChange={value =>
                  mode === 'register'
                    ? setRegisterForm(current => ({ ...current, email: value }))
                    : setLoginForm(current => ({ ...current, email: value }))
                }
                autoComplete="email"
                placeholder="you@company.com"
              />

              <div className="space-y-2">
                <Field
                  label="Пароль"
                  type={showPassword ? 'text' : 'password'}
                  value={mode === 'register' ? registerForm.password : loginForm.password}
                  onChange={value =>
                    mode === 'register'
                      ? setRegisterForm(current => ({ ...current, password: value }))
                      : setLoginForm(current => ({ ...current, password: value }))
                  }
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword(current => !current)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-1.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />

                {mode === 'register' && (
                  <PasswordStrengthBar
                    tone={passwordStrength.tone}
                    label={passwordStrength.label}
                    width={passwordStrength.width}
                  />
                )}
              </div>
              

              <button
                type="submit"
                disabled={isSubmitting || (mode === 'register' && !privacyConsent)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {mode === 'login' ? 'Входим...' : 'Создаем аккаунт...'}
                  </>
                ) : (
                  <>
                    {firstActionLabel}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {mode === 'register' && (
                <div>
                  <ConsentLine
                    checked={privacyConsent}
                    onChange={setPrivacyConsent}
                    required
                    label="Я ознакомлен(-на) с Политикой конфиденциальности, ООО «Настоящая статистика», публичной офертой на использование программного продукта и даю согласие на обработку моих персональных данных. Я уведомлен(-а) о праве отозвать согласие в любой момент."
                  />
                  <ConsentLine
                    checked={marketingConsent}
                    onChange={setMarketingConsent}
                    label="Я согласен(-на) на получение информационных и маркетинговых сообщений от ООО «Настоящая статистика»."
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm">
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isRequestingReset}
                    className="font-medium text-sky-700 transition-colors hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isRequestingReset ? 'Отправляем ссылку...' : 'Забыли пароль?'}
                  </button>
                )}
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500">
              {mode === 'login' && (
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={onResetPassword}
                    className="font-medium text-slate-500 transition-colors hover:text-slate-900"
                  >
                    У меня уже есть код сброса
                  </button>
                  <button
                    type="button"
                    onClick={onAcceptInvite}
                    className="font-medium text-slate-500 transition-colors hover:text-slate-900"
                  >
                    У меня есть код приглашения
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function BenefitCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        {icon}
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function PasswordStrengthBar({
  tone,
  label,
  width,
}: {
  tone: 'slate' | 'rose' | 'amber' | 'blue' | 'emerald';
  label: string;
  width: string;
}) {
  const toneClasses = {
    slate: 'bg-slate-400',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    blue: 'bg-sky-500',
    emerald: 'bg-emerald-500',
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>Надежность пароля</span>
        <span>{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${toneClasses[tone]}`} style={{ width }} />
      </div>
    </div>
  );
}

function ConsentLine({
  checked,
  onChange,
  label,
  required = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:border-slate-300">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white'
        }`}
      >
        {checked && <Check size={14} strokeWidth={3} />}
      </span>

      <span className="text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          className="sr-only"
          required={required}
        />
        {label}
      </span>
    </label>
  );
}

const Field = forwardRef<
  HTMLInputElement,
  {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
    rightSlot?: ReactNode;
  }
>(function Field({ label, value, onChange, type = 'text', autoComplete, placeholder, rightSlot }, ref) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>
      <div className="relative">
        <input
          ref={ref}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={event => onChange(event.target.value)}
          className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 ${
            rightSlot ? 'pr-32' : ''
          }`}
        />
        {rightSlot && <div className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</div>}
      </div>
    </label>
  );
});
