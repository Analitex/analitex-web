import { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Plus } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

interface OrganizationSetupPageProps {
  onContinue: () => void;
}

export function OrganizationSetupPage({ onContinue }: OrganizationSetupPageProps) {
  const { organizations, selectedOrganizationId, createOrganization, selectOrganization, apiError } = usePlatform();
  const [name, setName] = useState('Acme');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const nextOrganization = createOrganization(name.trim() || 'Новая организация');
      selectOrganization(nextOrganization.id);
      onContinue();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              <Building2 size={14} />
              Настройка организации
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Создайте первую организацию, чтобы кабинет мог загрузить реальные данные.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              В документации указано, что первый вошедший владелец должен создать организацию до подключения магазинов
              и просмотра аналитики. Этот экран закрепляет именно такой сценарий.
            </p>
          </div>
        </section>

        {apiError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {apiError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-950">Создать организацию</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Создайте рабочее пространство компании, чтобы перейти к подключению магазинов и аналитике.
            </p>

            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Название организации</span>
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Альфа"
              />
            </label>

            <button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Plus size={16} />
              {isSubmitting ? 'Создаем...' : 'Создать организацию'}
            </button>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              После создания организации мы сразу перейдем в кабинет и выберем ее как активную.
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-950">Существующие организации</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Если пользователь уже состоит в компании, выберите ее здесь и продолжите.
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {organizations.length} всего
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {organizations.map(organization => {
                const active = organization.id === selectedOrganizationId;
                return (
                  <button
                    type="button"
                    key={organization.id}
                    onClick={() => selectOrganization(organization.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition-all ${
                      active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-950">{organization.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{active ? 'Выбрана' : 'Доступна'}</div>
                    </div>
                    {active ? <CheckCircle2 size={18} className="text-blue-600" /> : <ArrowRight size={18} className="text-slate-400" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Перейти в кабинет
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
