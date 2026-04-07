'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useTranslation, useLocaleStore } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TeamSettingsPage() {
  const { teamSlug } = useParams() as { teamSlug: string };
  const router = useRouter();
  const { t } = useTranslation();
  const { locale, setLocale } = useLocaleStore();
  const { data: team } = trpc.teams.getBySlug.useQuery({ slug: teamSlug });
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (team && !initialized) {
    setName(team.name);
    setDescription(team.description ?? '');
    setInitialized(true);
  }

  const updateTeam = trpc.teams.update.useMutation({
    onSuccess: () => {
      utils.teams.getBySlug.invalidate({ slug: teamSlug });
      utils.teams.list.invalidate();
    },
  });

  const deleteTeam = trpc.teams.delete.useMutation({
    onSuccess: () => {
      utils.teams.list.invalidate();
      router.push('/');
    },
  });

  return (
    <div className="flex h-full overflow-auto">
      <div className="w-full max-w-2xl mx-auto p-8 space-y-8">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (team) {
              updateTeam.mutate({ id: team.id, name: name.trim() || undefined, description: description.trim() || undefined });
            }
          }}
        >
          <div>
            <label className="text-sm font-medium">{t('settings.teamName')}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">{t('settings.description')}</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('settings.descPlaceholder')} />
          </div>
          <div>
            <label className="text-sm font-medium">{t('settings.slug')}</label>
            <Input value={team?.slug ?? ''} disabled className="opacity-50" />
            <p className="text-xs text-muted-foreground mt-1">{t('settings.slugHint')}</p>
          </div>
          <Button type="submit" disabled={updateTeam.isPending}>
            {updateTeam.isPending ? t('common.saving') : t('settings.saveChanges')}
          </Button>
        </form>

        {/* Language */}
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold">{t('settings.language')}</h2>
          <div className="flex gap-2">
            {(['en', 'zh'] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocale(loc)}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  locale === loc
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-input text-muted-foreground hover:bg-accent'
                }`}
              >
                {t(`locale.${loc}` as any)}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-red-500/20 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-red-400">{t('settings.dangerZone')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('settings.deleteTeamWarning')}
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (team && confirm(t('settings.deleteConfirm', { name: team.name }))) {
                deleteTeam.mutate({ id: team.id });
              }
            }}
          >
            {t('settings.deleteTeam')}
          </Button>
        </div>
      </div>
    </div>
  );
}
