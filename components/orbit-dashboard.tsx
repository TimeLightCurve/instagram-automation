'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import Image from 'next/image';
import {
  Activity,
  ArrowUpRight,
  AtSign,
  Bell,
  Bot,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  CircleUserRound,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Heart,
  Home,
  Link2,
  LockKeyhole,
  MessageCircle,
  MousePointer2,
  PanelLeft,
  PencilLine,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  WandSparkles,
  Workflow,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { defaultLocalAiSettings } from '@/lib/local-ai/types';
import { generateLocalCaption, localAiModels } from '@/lib/local-ai/browser';
import type { LocalAiProvider, LocalAiSettings } from '@/lib/local-ai/types';
import type {
  InstagramAccountView,
  MonitoringSnapshot,
} from '@/lib/instagram/types';

type ViewKey =
  | 'overview'
  | 'content'
  | 'inbox'
  | 'approvals'
  | 'audience'
  | 'automations'
  | 'activity'
  | 'settings';
type ContentStatus = 'Draft' | 'Ready' | 'Needs media';
type ApprovalState = 'pending' | 'done' | 'skipped';

type ContentItem = {
  id: string;
  title: string;
  format: 'Post' | 'Carousel' | 'Reel' | 'Story';
  status: ContentStatus;
  scheduled: string;
  caption: string;
  mediaUrl?: string;
};

type InboxConversation = {
  id: string;
  updatedAt: string | null;
  participants: Array<{ id: string; username?: string; name?: string }>;
};

type InboxMessage = {
  id: string;
  text: string;
  createdAt: string | null;
  from: { id: string; username?: string } | null;
  attachments: Array<{ type: string; url: string | null }>;
};

type ApprovalItem = {
  id: string;
  initials: string;
  handle: string;
  action: 'Comment' | 'Follow' | 'Like';
  context: string;
  draft: string;
  age: string;
  url: string;
  tone: string;
  state: ApprovalState;
};

const navItems: Array<{
  label: string;
  value: ViewKey;
  icon: typeof Home;
  count?: number;
}> = [
  { label: 'Overview', value: 'overview', icon: Home },
  { label: 'Content', value: 'content', icon: FileText },
  { label: 'Inbox', value: 'inbox', icon: MessageCircle },
  { label: 'Approvals', value: 'approvals', icon: MousePointer2 },
  { label: 'Audience', value: 'audience', icon: Users },
  { label: 'Automations', value: 'automations', icon: WandSparkles },
  { label: 'Activity', value: 'activity', icon: Activity },
];

const nabzlabDraft: ContentItem = {
  id: 'nabzlab-nava-consent-concept-2026',
  title: 'Nava · pocket recorder study',
  format: 'Post',
  status: 'Draft',
  scheduled: 'Unscheduled',
  mediaUrl: '/nava-concept-ripple-v1.png',
  caption:
    'Meet Nava: a pocket recorder study for turning conversations into useful memory, on your terms.\n\nWe are exploring a simple idea: keep the source, review the transcript, and choose what becomes searchable. Consent and human control guide the experience.\n\nJoin the Nava pilot list at nabzlab.com. No payment today.\n\nConcept study, not final hardware. Specifications, price and delivery window follow Rev-A validation.\n\n#NabzLab #Nava #PrivateAI',
};

const demoContentIds = new Set(['c1', 'c2', 'c3', 'c4']);
const demoApprovalIds = new Set(['a1', 'a2', 'a3', 'a4']);
const demoWatchlist = new Set([
  '@lumen.studio',
  '@northstar.design',
  '@atelier.kanso',
]);

const workflowItems = [
  {
    id: 'content-prep',
    title: 'Caption validation',
    description: 'Validate caption text before saving a draft.',
    nodes: ['Validate'],
    locked: false,
    enabled: true,
  },
  {
    id: 'manual-engagement',
    title: 'Manual engagement approval',
    description:
      'Approval UI is available. Automatic discovery and queue creation are not connected.',
    nodes: ['Discover', 'Draft', 'Approve'],
    locked: true,
    enabled: false,
  },
  {
    id: 'official-publish',
    title: 'Official Meta publishing',
    description: 'Publish approved posts, reels, and carousels.',
    nodes: ['Validate', 'Approve', 'Publish'],
    locked: true,
    enabled: false,
  },
  {
    id: 'comment-inbox',
    title: 'Comment & inbox routing',
    description: 'Read owned-post comments and route eligible messages.',
    nodes: ['Webhook', 'Classify', 'Reply'],
    locked: true,
    enabled: false,
  },
];

/* oxlint-disable react/react-compiler -- hydrate device-local drafts after SSR */
function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        setValue(JSON.parse(stored) as T);
      } catch {
        window.localStorage.removeItem(key);
      }
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(key, JSON.stringify(value));
  }, [hydrated, key, value]);

  return [value, setValue, hydrated] as const;
}
/* oxlint-enable react/react-compiler */

function ActionIcon({ action }: { action: ApprovalItem['action'] }) {
  if (action === 'Comment') return <MessageCircle className="size-3" />;
  if (action === 'Follow') return <UserPlus className="size-3" />;
  return <Heart className="size-3" />;
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="border-l border-white/10 pl-5 first:border-l-0 first:pl-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <strong className="text-2xl font-semibold tracking-[-0.04em] text-white">
          {value}
        </strong>
        <span className="pb-0.5 text-xs text-white/45">{note}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const classes =
    status === 'Ready'
      ? 'border-[#56c7aa]/20 bg-[#56c7aa]/10 text-[#83dcc5]'
      : status === 'Needs media'
        ? 'border-[#e5aa56]/20 bg-[#e5aa56]/10 text-[#f0c477]'
        : 'border-[#a990e9]/20 bg-[#a990e9]/10 text-[#c8b6f5]';
  return (
    <Badge variant="outline" className={classes}>
      {status}
    </Badge>
  );
}

/* oxlint-disable react/react-compiler, react-hooks/exhaustive-deps -- synchronize account and MongoDB state with external services */
export function OrbitDashboard() {
  const [view, setView] = useState<ViewKey>('overview');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [localAi, setLocalAi] = useStoredState<LocalAiSettings>(
    'orbit-local-ai',
    defaultLocalAiSettings,
  );
  const [localAiToken, setLocalAiToken] = useState('');
  const [contentDialog, setContentDialog] = useState(false);
  const [setupDialog, setSetupDialog] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const [workflowResult, setWorkflowResult] = useState('');
  const [account, setAccount] = useState<InstagramAccountView>({
    configured: false,
    connected: false,
  });
  const [accountLoading, setAccountLoading] = useState(true);
  const [monitoring, setMonitoring] = useState<MonitoringSnapshot | null>(null);
  const [serverStateAccount, setServerStateAccount] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void loadConnection();
    const result = new URLSearchParams(window.location.search).get('instagram');
    if (result) {
      setView('settings');
      showNotice(
        result === 'connected'
          ? 'Instagram account connected and secured.'
          : result === 'denied'
            ? 'Instagram authorization was cancelled.'
            : 'Instagram connection could not be completed.',
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!account.connected || !account.id) return;

    let cancelled = false;
    setServerStateAccount(null);
    setContent([]);
    setApprovals([]);
    setWatchlist([]);
    void fetch('/api/panel-state')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load MongoDB panel data.');
        return response.json() as Promise<{
          state: null | {
            content?: ContentItem[];
            approvals?: ApprovalItem[];
            watchlist?: string[];
            seededNabzlabDraft?: boolean;
          };
        }>;
      })
      .then(async ({ state }) => {
        if (cancelled) return;
        const storedContent = Array.isArray(state?.content)
          ? state.content.filter((item) => !demoContentIds.has(item.id))
          : [];
        const storedApprovals = Array.isArray(state?.approvals)
          ? state.approvals.filter((item) => !demoApprovalIds.has(item.id))
          : [];
        const storedWatchlist = Array.isArray(state?.watchlist)
          ? state.watchlist.filter((item) => !demoWatchlist.has(item))
          : [];
        const seedDraft =
          account.username?.toLowerCase() === 'nabzlabai' &&
          !state?.seededNabzlabDraft;
        if (
          seedDraft &&
          !storedContent.some((item) => item.id === nabzlabDraft.id)
        )
          storedContent.push(nabzlabDraft);
        setContent(storedContent);
        setApprovals(storedApprovals);
        setWatchlist(storedWatchlist);
        if (
          !state ||
          storedContent.length !== state.content?.length ||
          storedApprovals.length !== state.approvals?.length ||
          storedWatchlist.length !== state.watchlist?.length ||
          seedDraft
        ) {
          const saved = await fetch('/api/panel-state', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: storedContent,
              approvals: storedApprovals,
              watchlist: storedWatchlist,
              ...(seedDraft ? { seededNabzlabDraft: true } : {}),
            }),
          });
          if (!saved.ok) throw new Error('Could not save cleaned panel data.');
        }
        if (!cancelled) setServerStateAccount(account.id ?? null);
      })
      .catch(() => {
        if (!cancelled)
          showNotice(
            'MongoDB sync is temporarily unavailable. Changes may not be saved.',
          );
      });

    return () => {
      cancelled = true;
    };
  }, [account.connected, account.id, account.username]);

  useEffect(() => {
    if (!account.id || serverStateAccount !== account.id) return;
    const timeout = window.setTimeout(() => {
      void fetch('/api/panel-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, approvals, watchlist }),
      });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [account.id, approvals, content, serverStateAccount, watchlist]);

  const pending = useMemo(
    () => approvals.filter((item) => item.state === 'pending'),
    [approvals],
  );
  const readyCount = content.filter((item) => item.status === 'Ready').length;
  const activeLabel =
    navItems.find((item) => item.value === view)?.label ?? 'Settings';

  async function loadConnection() {
    setAccountLoading(true);
    try {
      const [accountResponse, monitoringResponse] = await Promise.all([
        fetch('/api/instagram/account', { cache: 'no-store' }),
        fetch('/api/monitoring', { cache: 'no-store' }),
      ]);
      setAccount((await accountResponse.json()) as InstagramAccountView);
      if (monitoringResponse.ok) {
        setMonitoring((await monitoringResponse.json()) as MonitoringSnapshot);
      }
    } finally {
      setAccountLoading(false);
    }
  }

  function connectInstagram() {
    window.location.assign('/api/instagram/start');
  }

  async function disconnectInstagram() {
    const response = await fetch('/api/instagram/disconnect', {
      method: 'POST',
    });
    if (!response.ok) {
      showNotice('Instagram could not be disconnected.');
      return;
    }
    setAccount({ configured: true, connected: false });
    setServerStateAccount(null);
    showNotice('Instagram disconnected. Job history remains in MongoDB.');
    await loadConnection();
  }

  async function refreshInstagram() {
    showNotice('Checking the Instagram connection…');
    const response = await fetch('/api/instagram/refresh', { method: 'POST' });
    const data = (await response.json()) as InstagramAccountView & {
      error?: string;
    };
    if (!response.ok) {
      showNotice(data.error || 'Instagram connection check failed.');
      return;
    }
    setAccount(data);
    showNotice('Instagram connection verified and token refreshed.');
    await loadConnection();
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  }

  function updateApproval(id: string, state: ApprovalState) {
    setApprovals((items) =>
      items.map((item) => (item.id === id ? { ...item, state } : item)),
    );
    showNotice(
      state === 'done'
        ? 'Marked complete. The action remained fully manual.'
        : 'Item removed from the active queue.',
    );
  }

  function openManualAction(item: ApprovalItem) {
    window.open(item.url, '_blank', 'noopener,noreferrer');
    showNotice(
      'Instagram opened in a new tab. Complete the action there, then mark it done.',
    );
  }

  async function runWorkflow(id: string) {
    setWorkflowResult('Running component pipeline…');
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: id,
          payload: { caption: 'Sample caption for validation' },
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        results?: Array<{ message: string }>;
      };
      const last =
        data.results && data.results.length > 0
          ? data.results[data.results.length - 1].message
          : 'Pipeline finished.';
      setWorkflowResult(`${data.status ?? 'completed'} · ${last}`);
    } catch {
      setWorkflowResult(
        'The local workflow service is temporarily unavailable.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0c0f] text-[#f6f3ee]">
      <div className="grid min-h-screen lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside
          className={`${mobileNav ? 'flex' : 'hidden'} fixed inset-0 z-40 flex-col border-r border-white/8 bg-[#0e0f13] px-4 py-5 lg:static lg:flex`}
        >
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#ff7a59] via-[#f24ca7] to-[#7257ff] shadow-[0_0_30px_rgba(242,76,167,.18)]">
              <Camera className="size-[18px] text-white" strokeWidth={2.2} />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">
                Orbit IG
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                Operations
              </div>
            </div>
            <Button
              aria-label="Close navigation"
              className="ml-auto lg:hidden"
              onClick={() => setMobileNav(false)}
              size="icon"
              variant="ghost"
            >
              <X />
            </Button>
          </div>

          <nav aria-label="Main navigation" className="mt-10 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const count =
                item.value === 'approvals' ? pending.length : item.count;
              return (
                <button
                  className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${view === item.value ? 'bg-white/9 text-white' : 'text-white/48 hover:bg-white/5 hover:text-white/85'}`}
                  key={item.value}
                  onClick={() => {
                    setView(item.value);
                    setMobileNav(false);
                  }}
                  type="button"
                >
                  <Icon className="size-[17px]" strokeWidth={1.8} />
                  <span>{item.label}</span>
                  {count ? (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <button
              className="flex w-full items-center gap-2.5 text-left"
              onClick={() => {
                setView('settings');
                setMobileNav(false);
              }}
              type="button"
            >
              <CircleUserRound
                className="size-8 text-white/45"
                strokeWidth={1.4}
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">
                  {account.connected && account.username
                    ? `@${account.username}`
                    : 'No Instagram account'}
                </div>
                <div className="text-[10px] text-white/35">
                  {account.connected ? 'Business connected' : 'Manual mode'}
                </div>
              </div>
              <Settings className="ml-auto size-4 text-white/30" />
            </button>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 flex h-[68px] items-center border-b border-white/8 bg-[#0b0c0f]/90 px-5 backdrop-blur-xl sm:px-8">
            <Button
              aria-label="Open navigation"
              className="mr-3 lg:hidden"
              onClick={() => setMobileNav(true)}
              size="icon"
              variant="ghost"
            >
              <PanelLeft />
            </Button>
            <div>
              <p
                suppressHydrationWarning
                className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35"
              >
                {new Intl.DateTimeFormat('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }).format(new Date())}
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight">
                {activeLabel}
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                aria-label="Notifications"
                className="hidden text-white/45 sm:inline-flex"
                size="icon"
                variant="ghost"
              >
                <Bell />
              </Button>
              <Badge
                className={`hidden sm:inline-flex ${account.connected ? 'border-[#56c7aa]/20 bg-[#56c7aa]/10 text-[#83dcc5]' : 'border-[#f2aa4c]/20 bg-[#f2aa4c]/10 text-[#f5bf70]'}`}
              >
                {account.connected ? `@${account.username}` : 'Manual account'}
              </Badge>
              <Button
                className="h-9 rounded-lg bg-[#f1ede6] px-3.5 text-[#15161a] hover:bg-white"
                onClick={() => setContentDialog(true)}
              >
                <Plus data-icon="inline-start" /> New content
              </Button>
            </div>
          </header>

          <div className="mx-auto max-w-[1420px] p-5 sm:p-8">
            {view === 'overview' && (
              <OverviewView
                account={account}
                content={content}
                monitoring={monitoring}
                onCreate={() => setContentDialog(true)}
                onConnect={connectInstagram}
                onOpenSetup={() => setSetupDialog(true)}
                onViewApprovals={() => setView('approvals')}
                pending={pending}
                readyCount={readyCount}
              />
            )}
            {view === 'content' && (
              <ContentView
                content={content}
                onCreate={() => setContentDialog(true)}
                onRemove={(id) =>
                  setContent((items) => items.filter((item) => item.id !== id))
                }
              />
            )}
            {view === 'inbox' && (
              <InboxView
                account={account}
                onOpenSetup={() => setSetupDialog(true)}
                onReconnect={connectInstagram}
              />
            )}
            {view === 'approvals' && (
              <ApprovalsView
                approvals={approvals}
                onOpen={openManualAction}
                onUpdate={updateApproval}
              />
            )}
            {view === 'audience' && (
              <AudienceView
                onChange={setWatchlist}
                showNotice={showNotice}
                watchlist={watchlist}
              />
            )}
            {view === 'automations' && (
              <AutomationsView
                account={account}
                onOpenSetup={() => setSetupDialog(true)}
                onRun={runWorkflow}
                result={workflowResult}
              />
            )}
            {view === 'activity' && (
              <ActivityView
                account={account}
                loading={accountLoading}
                monitoring={monitoring}
                onRefresh={loadConnection}
              />
            )}
            {view === 'settings' && (
              <SettingsView
                account={account}
                accountLoading={accountLoading}
                localAi={localAi}
                localAiToken={localAiToken}
                onChange={setLocalAi}
                onTokenChange={setLocalAiToken}
                onConnect={connectInstagram}
                onDisconnect={disconnectInstagram}
                onOpenSetup={() => setSetupDialog(true)}
                onRefresh={refreshInstagram}
              />
            )}
          </div>
        </section>
      </div>

      <NewContentDialog
        accountConnected={account.connected}
        content={content}
        localAi={localAi}
        localAiToken={localAiToken}
        onChange={setContent}
        onOpenChange={setContentDialog}
        open={contentDialog}
        showNotice={showNotice}
      />
      <SetupDialog onOpenChange={setSetupDialog} open={setupDialog} />

      {notice ? (
        <output
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-[#202126] px-4 py-3 text-xs text-white shadow-2xl"
        >
          <CheckCircle2 className="size-4 text-[#79d7be]" /> {notice}
        </output>
      ) : null}
    </main>
  );
}
/* oxlint-enable react/react-compiler, react-hooks/exhaustive-deps */

function UpgradeBanner({
  account,
  onConnect,
  onOpenSetup,
}: {
  account: InstagramAccountView;
  onConnect: () => void;
  onOpenSetup: () => void;
}) {
  if (account.connected) {
    return (
      <section className="overflow-hidden rounded-2xl border border-[#56c7aa]/20 bg-[#0f1816]">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#56c7aa]/12 text-[#83dcc5]">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-[#e9fff8]">
              @{account.username} is connected
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#94bdb2]">
              Connection details, panel data, and job history are stored in
              MongoDB.
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit border-[#56c7aa]/20 text-[#83dcc5]"
          >
            {account.accountType || 'Professional'}
          </Badge>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#f3ad53]/20 bg-[#17130f]">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f3ad53]/12 text-[#ffc56f]">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium text-[#fff6e8]">
              Connect an Instagram professional account
            </h2>
            <Badge
              variant="outline"
              className="border-[#f3ad53]/20 text-[#dca75f]"
            >
              Setup
            </Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#c8af8c]">
            Connect a Creator or Business account to review eligible messages
            and manage account-specific drafts. Publishing and automated
            engagement remain disabled.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-9 border-[#f3ad53]/20 bg-[#f3ad53]/5 text-[#ffd18f] hover:bg-[#f3ad53]/10"
            onClick={onOpenSetup}
          >
            Setup guide
          </Button>
          <Button
            className="h-9 bg-[#f1ede6] text-[#15161a]"
            disabled={!account.configured}
            onClick={onConnect}
          >
            Connect Instagram <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function OverviewView({
  account,
  content,
  monitoring,
  onCreate,
  onConnect,
  onOpenSetup,
  onViewApprovals,
  pending,
  readyCount,
}: {
  account: InstagramAccountView;
  content: ContentItem[];
  monitoring: MonitoringSnapshot | null;
  onCreate: () => void;
  onConnect: () => void;
  onOpenSetup: () => void;
  onViewApprovals: () => void;
  pending: ApprovalItem[];
  readyCount: number;
}) {
  return (
    <div className="space-y-5">
      <UpgradeBanner
        account={account}
        onConnect={onConnect}
        onOpenSetup={onOpenSetup}
      />
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(310px,.65fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111216]">
          <div className="grid grid-cols-2 gap-y-6 border-b border-white/8 p-5 sm:grid-cols-4 sm:p-6">
            <Metric
              label="Content"
              value={String(content.length)}
              note="items"
            />
            <Metric
              label="Awaiting you"
              value={String(pending.length)}
              note="actions"
            />
            <Metric
              label="Ready"
              value={String(readyCount)}
              note="to publish"
            />
            <Metric
              label="API jobs"
              value={String(monitoring?.totals.all ?? 0)}
              note={account.connected ? 'tracked' : 'offline'}
            />
          </div>
          <div className="flex items-center gap-3 px-5 pb-3 pt-5 sm:px-6">
            <div>
              <h2 className="font-medium tracking-tight">Approval queue</h2>
              <p className="mt-0.5 text-xs text-white/38">
                Nothing is performed without your click.
              </p>
            </div>
            <Button
              variant="ghost"
              className="ml-auto text-xs text-white/52 hover:bg-white/5 hover:text-white"
              onClick={onViewApprovals}
            >
              View all <ArrowUpRight data-icon="inline-end" />
            </Button>
          </div>
          <div className="divide-y divide-white/7">
            {pending.slice(0, 3).map((item) => (
              <article
                className="grid gap-3 px-5 py-4 sm:grid-cols-[44px_minmax(150px,.7fr)_minmax(220px,1.3fr)_auto] sm:items-center sm:px-6"
                key={item.id}
              >
                <div
                  className={`grid size-10 place-items-center rounded-full text-xs font-semibold ${item.tone}`}
                >
                  {item.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/88">
                      {item.handle}
                    </span>
                    <span className="text-[10px] text-white/28">
                      {item.age}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-white/38">
                    <ActionIcon action={item.action} />
                    {item.action} · {item.context}
                  </div>
                </div>
                <p className="text-xs leading-5 text-white/50">{item.draft}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 bg-white/4 text-white/70"
                  onClick={onViewApprovals}
                >
                  Review
                </Button>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#111216] p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/32">
                Upcoming
              </p>
              <h2 className="mt-1 text-base font-medium tracking-tight">
                Content flow
              </h2>
            </div>
            <CalendarDays className="size-5 text-white/25" />
          </div>
          <div className="mt-7 space-y-1">
            {content.slice(0, 3).map((item, index) => (
              <div className="grid grid-cols-[28px_1fr] gap-3" key={item.id}>
                <div className="flex flex-col items-center">
                  <span
                    className={`grid size-7 place-items-center rounded-lg ${item.status === 'Ready' ? 'bg-[#bceee4] text-[#174b43]' : item.status === 'Needs media' ? 'bg-[#f3dc9d] text-[#684f0d]' : 'bg-[#ddc7ff] text-[#44256d]'}`}
                  >
                    <FileText className="size-3.5" />
                  </span>
                  {index < 2 ? (
                    <span className="my-1 h-8 w-px bg-white/8" />
                  ) : null}
                </div>
                <div className="pt-0.5">
                  <p className="text-sm text-white/78">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-white/32">
                    {item.scheduled} · {item.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 border-t border-white/8 pt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/38">Readiness</span>
              <span className="font-medium text-white/72">
                {readyCount} of {content.length} ready
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/7">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ff7a59] to-[#f24ca7]"
                style={{
                  width: `${content.length ? (readyCount / content.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-5 w-full text-white/55 hover:bg-white/5 hover:text-white"
            onClick={onCreate}
          >
            <Plus /> Add to plan
          </Button>
        </div>
      </section>
    </div>
  );
}

function ContentView({
  content,
  onCreate,
  onRemove,
}: {
  content: ContentItem[];
  onCreate: () => void;
  onRemove: (id: string) => void;
}) {
  const [selected, setSelected] = useState<ContentItem | null>(null);
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Publishing workspace</p>
          <h2 className="page-title">Content calendar</h2>
          <p className="page-copy">
            Prepare captions and media now. Publishing will connect cleanly when
            Meta access is available.
          </p>
        </div>
        <Button
          className="bg-[#f1ede6] text-[#15161a] hover:bg-white"
          onClick={onCreate}
        >
          <Plus /> Create draft
        </Button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111216]">
        <div className="grid grid-cols-[1fr_auto] border-b border-white/8 px-5 py-4 sm:grid-cols-[1.4fr_.7fr_.8fr_.8fr_auto] sm:px-6">
          <span className="table-head">Content</span>
          <span className="table-head hidden sm:block">Format</span>
          <span className="table-head hidden sm:block">Status</span>
          <span className="table-head hidden sm:block">Schedule</span>
          <span />
        </div>
        <div className="divide-y divide-white/7">
          {content.map((item) => (
            <article
              className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[1.4fr_.7fr_.8fr_.8fr_auto] sm:px-6"
              key={item.id}
            >
              <div className="min-w-0">
                <button
                  className="truncate text-left text-sm font-medium text-white/85 hover:text-white"
                  onClick={() => setSelected(item)}
                  type="button"
                >
                  {item.title}
                </button>
                <p className="mt-1 truncate text-xs text-white/35">
                  {item.caption}
                </p>
              </div>
              <span className="hidden text-xs text-white/48 sm:block">
                {item.format}
              </span>
              <span className="hidden sm:block">
                <StatusBadge status={item.status} />
              </span>
              <span className="hidden text-xs text-white/48 sm:block">
                {item.scheduled}
              </span>
              <Button
                aria-label={`Delete ${item.title}`}
                className="text-white/28 hover:bg-[#e76c6c]/10 hover:text-[#ef9090]"
                onClick={() => onRemove(item.id)}
                size="icon-sm"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </article>
          ))}
          {content.length === 0 ? (
            <p className="px-5 py-8 text-sm text-white/40">
              No content drafts yet. Create one to start your plan.
            </p>
          ) : null}
        </div>
      </div>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-white/10 bg-[#17181d] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>
              Draft for review. Nothing has been published.
            </DialogDescription>
          </DialogHeader>
          {selected?.mediaUrl ? (
            <Image
              alt="Draft post artwork"
              className="w-full rounded-xl"
              height={752}
              src={selected.mediaUrl}
              width={1344}
            />
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-6 text-white/75">
            {selected?.caption}
          </p>
          <DialogFooter>
            <Button onClick={() => setSelected(null)} variant="outline">
              Close review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* oxlint-disable react/react-compiler -- load conversations when the connected account changes */
function InboxView({
  account,
  onOpenSetup,
  onReconnect,
}: {
  account: InstagramAccountView;
  onOpenSetup: () => void;
  onReconnect: () => void;
}) {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState('');
  const [diagnostics, setDiagnostics] = useState('');
  const [diagnosing, setDiagnosing] = useState(false);

  async function diagnoseInbox() {
    setDiagnosing(true);
    try {
      const response = await fetch('/api/instagram/inbox?diagnose=1', {
        cache: 'no-store',
      });
      const data = (await response.json()) as {
        identityMatches?: boolean;
        identifiersDiffer?: boolean;
        checks?: Array<{ route: string; count?: number; error?: string }>;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Could not inspect Meta inbox access.');
      const result =
        data.checks
          ?.map(
            (check) =>
              `${check.route}: ${check.error || `${check.count ?? 0} conversations`}`,
          )
          .join(' · ') || 'No checks returned';
      setDiagnostics(
        `Connected identity ${data.identityMatches ? 'matches' : 'differs from'} Meta profile${data.identifiersDiffer ? ' (Meta returned two ID formats)' : ''}. ${result}. If every route returns zero, check Meta app access, account webhook subscription, and whether the other person initiated the DM.`,
      );
    } catch (cause) {
      setDiagnostics(
        cause instanceof Error ? cause.message : 'Diagnostic request failed.',
      );
    } finally {
      setDiagnosing(false);
    }
  }

  async function loadConversations(after?: string) {
    setLoading(true);
    setError('');
    try {
      const query = after ? `?after=${encodeURIComponent(after)}` : '';
      const response = await fetch(`/api/instagram/inbox${query}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as {
        conversations?: InboxConversation[];
        nextCursor?: string | null;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Could not load conversations.');
      setConversations((current) =>
        after
          ? [...current, ...(data.conversations ?? [])]
          : (data.conversations ?? []),
      );
      setNextCursor(data.nextCursor ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not load conversations.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(id: string, after?: string) {
    setMessageLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ conversationId: id });
      if (after) query.set('after', after);
      const response = await fetch(`/api/instagram/inbox?${query}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as {
        messages?: InboxMessage[];
        nextCursor?: string | null;
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Could not load messages.');
      setMessages((current) =>
        after ? [...current, ...(data.messages ?? [])] : (data.messages ?? []),
      );
      setMessageCursor(data.nextCursor ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load messages.',
      );
    } finally {
      setMessageLoading(false);
    }
  }

  useEffect(() => {
    if (
      account.connected &&
      account.id &&
      account.scopes?.includes('instagram_business_manage_messages')
    ) {
      void loadConversations();
    }
  }, [account.connected, account.id, account.scopes]);

  const active = conversations.find((item) => item.id === selected);
  const participant = active?.participants[0];
  const hasPermission = account.scopes?.includes(
    'instagram_business_manage_messages',
  );
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Owned-account conversations</p>
        <h2 className="page-title">Instagram inbox</h2>
        <p className="page-copy">
          {account.connected
            ? 'Eligible conversations returned by Meta for this connected account. Older Requests and some history may be unavailable.'
            : 'Connect a professional Instagram account to view eligible conversations.'}
        </p>
      </div>
      <div className="grid min-h-[590px] overflow-hidden rounded-2xl border border-white/8 bg-[#111216] md:grid-cols-[310px_minmax(0,1fr)]">
        <section className="border-b border-white/8 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-white/8 p-4">
            <span className="text-xs text-white/55">Conversations</span>
            <Button
              aria-label="Refresh inbox"
              disabled={loading || !hasPermission}
              onClick={() => void loadConversations()}
              size="icon-sm"
              variant="ghost"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
          <div>
            {conversations.map((item) => {
              const person = item.participants[0];
              return (
                <button
                  className={`flex w-full gap-3 border-b border-white/6 p-4 text-left ${selected === item.id ? 'bg-white/6' : 'hover:bg-white/[0.025]'}`}
                  key={item.id}
                  onClick={() => {
                    setSelected(item.id);
                    setMessages([]);
                    void loadMessages(item.id);
                  }}
                  type="button"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#252730] text-[10px] font-medium text-white/60">
                    {(person?.username ?? person?.name ?? '?')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <span className="truncate text-xs font-medium text-white/80">
                        {person?.username
                          ? `@${person.username}`
                          : (person?.name ?? 'Instagram user')}
                      </span>
                      <span className="ml-auto text-[10px] text-white/28">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-white/38">
                      Open conversation
                    </p>
                  </div>
                </button>
              );
            })}
            {nextCursor ? (
              <Button
                className="m-3"
                disabled={loading}
                onClick={() => void loadConversations(nextCursor)}
                size="sm"
                variant="outline"
              >
                Load more
              </Button>
            ) : null}
          </div>
        </section>
        <section className="flex min-w-0 flex-col">
          <div className="flex items-center border-b border-white/8 p-4">
            <div>
              <p className="text-sm font-medium text-white/82">
                {participant?.username
                  ? `@${participant.username}`
                  : (participant?.name ?? 'Conversation')}
              </p>
              <p className="text-[11px] text-white/35">
                {active?.updatedAt
                  ? `Updated ${new Date(active.updatedAt).toLocaleString()}`
                  : 'Select a conversation'}
              </p>
            </div>
            {active ? (
              <Button
                className="ml-auto"
                disabled={messageLoading}
                onClick={() => void loadMessages(active.id)}
                size="sm"
                variant="ghost"
              >
                <RefreshCw className={messageLoading ? 'animate-spin' : ''} />{' '}
                Refresh
              </Button>
            ) : null}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200"
              >
                {error}
              </p>
            ) : null}
            {messages.map((item) => (
              <article
                className={`max-w-[85%] rounded-xl border border-white/8 p-3 text-sm ${item.from?.id === account.id ? 'ml-auto bg-[#17312b]' : 'bg-white/5'}`}
                key={item.id}
              >
                <p className="whitespace-pre-wrap text-white/85">
                  {item.text ||
                    (item.attachments.length
                      ? `[${item.attachments.map((attachment) => attachment.type).join(', ')}]`
                      : 'Non-text message')}
                </p>
                <p className="mt-2 text-[10px] text-white/35">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString()
                    : ''}
                </p>
              </article>
            ))}
            {messageCursor && selected ? (
              <Button
                disabled={messageLoading}
                onClick={() => void loadMessages(selected, messageCursor)}
                size="sm"
                variant="outline"
              >
                Older messages
              </Button>
            ) : null}
            {!messages.length && !messageLoading && !error ? (
              <p className="text-center text-sm text-white/40">
                {!account.connected
                  ? 'Connect Instagram to view messages.'
                  : !hasPermission
                    ? 'Reconnect Instagram and grant manage messages access.'
                    : loading
                      ? 'Loading conversations…'
                      : selected
                        ? 'No messages returned for this conversation.'
                        : conversations.length
                          ? 'Select a conversation.'
                          : 'No eligible conversations were returned by Meta.'}
              </p>
            ) : null}
          </div>
          <div className="border-t border-white/8 p-4 text-xs text-white/35">
            Read-only inbox. Replies require a separate reviewed action.
          </div>
        </section>
      </div>
      {account.connected && hasPermission ? (
        <div className="rounded-xl border border-white/8 bg-[#111216] p-4 text-xs text-white/55">
          <Button
            disabled={diagnosing}
            onClick={() => void diagnoseInbox()}
            size="sm"
            variant="outline"
          >
            {diagnosing ? 'Checking Meta…' : 'Diagnose empty inbox'}
          </Button>
          {diagnostics ? (
            <p aria-live="polite" className="mt-3 leading-5">
              {diagnostics}
            </p>
          ) : null}
        </div>
      ) : null}
      {!account.connected ? (
        <Button onClick={onOpenSetup} variant="outline">
          See connection path
        </Button>
      ) : null}
      {account.connected && !hasPermission ? (
        <Button onClick={onReconnect} variant="outline">
          Reconnect Instagram for messages
        </Button>
      ) : null}
    </div>
  );
}
/* oxlint-enable react/react-compiler */

function ApprovalsView({
  approvals,
  onOpen,
  onUpdate,
}: {
  approvals: ApprovalItem[];
  onOpen: (item: ApprovalItem) => void;
  onUpdate: (id: string, state: ApprovalState) => void;
}) {
  const pending = approvals.filter((item) => item.state === 'pending');
  const completed = approvals.filter((item) => item.state !== 'pending');
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Human control layer</p>
          <h2 className="page-title">Manual approvals</h2>
          <p className="page-copy">
            Review the suggestion, open Instagram yourself, then record the
            outcome here.
          </p>
        </div>
      </div>
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#111216] p-6 text-sm text-white/45">
          No actions await review. New approval requests will appear here.
        </div>
      ) : null}
      <div className="space-y-3">
        {pending.map((item) => (
          <article
            className="rounded-2xl border border-white/8 bg-[#111216] p-5"
            key={item.id}
          >
            <div className="grid gap-4 lg:grid-cols-[44px_minmax(180px,.65fr)_minmax(260px,1.35fr)_auto] lg:items-center">
              <div
                className={`grid size-10 place-items-center rounded-full text-xs font-semibold ${item.tone}`}
              >
                {item.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/88">
                    {item.handle}
                  </span>
                  <span className="text-[10px] text-white/28">{item.age}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-white/38">
                  <ActionIcon action={item.action} />
                  {item.action} · {item.context}
                </div>
              </div>
              <div className="rounded-xl border border-white/7 bg-black/15 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/28">
                  Suggested note
                </p>
                <p className="mt-1.5 text-xs leading-5 text-white/55">
                  {item.draft}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 bg-white/4 text-white/72"
                  onClick={() => onUpdate(item.id, 'skipped')}
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  className="bg-[#e9e4dc] text-[#15161a] hover:bg-white"
                  onClick={() => onOpen(item)}
                >
                  Open Instagram <ExternalLink data-icon="inline-end" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Mark done"
                  className="text-[#75d2ba]"
                  onClick={() => onUpdate(item.id, 'done')}
                >
                  <Check />
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {completed.length ? (
        <section className="pt-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-white/30">
            Recent decisions
          </h3>
          <div className="mt-3 divide-y divide-white/7 rounded-xl border border-white/8 bg-[#111216]">
            {completed.map((item) => (
              <div className="flex items-center gap-3 px-4 py-3" key={item.id}>
                <span className="text-xs text-white/55">{item.handle}</span>
                <span className="text-[11px] text-white/28">{item.action}</span>
                <Badge
                  variant="outline"
                  className="ml-auto border-white/8 text-white/40"
                >
                  {item.state}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AudienceView({
  onChange,
  showNotice,
  watchlist,
}: {
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  showNotice: (message: string) => void;
  watchlist: string[];
}) {
  const [handle, setHandle] = useState('');
  function add(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = handle.trim().replace(/^@?/, '@');
    if (!clean || clean === '@') return;
    onChange((items) => (items.includes(clean) ? items : [...items, clean]));
    setHandle('');
    showNotice(`${clean} added to your manual watchlist.`);
  }
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Research, not outreach</p>
        <h2 className="page-title">Audience watchlist</h2>
        <p className="page-copy">
          Organize accounts you want to review manually. Orbit never follows or
          engages automatically.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111216]">
          <div className="border-b border-white/8 px-5 py-4">
            <h3 className="text-sm font-medium">Monitored accounts</h3>
          </div>
          <div className="divide-y divide-white/7">
            {watchlist.map((item) => (
              <div className="flex items-center gap-3 px-5 py-4" key={item}>
                <div className="grid size-9 place-items-center rounded-full bg-white/6 text-[11px] text-white/45">
                  {item.slice(1, 3).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-white/80">{item}</p>
                  <p className="mt-0.5 text-[11px] text-white/32">
                    Manual reference
                  </p>
                </div>
                <Button
                  aria-label={`Remove ${item}`}
                  className="ml-auto text-white/25"
                  onClick={() =>
                    onChange((items) => items.filter((value) => value !== item))
                  }
                  size="icon-sm"
                  variant="ghost"
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-2xl border border-white/8 bg-[#111216] p-5">
          <div className="grid size-10 place-items-center rounded-xl bg-[#bceee4]/10 text-[#81d8c1]">
            <AtSign className="size-5" />
          </div>
          <h3 className="mt-4 font-medium">Add an account</h3>
          <p className="mt-1 text-xs leading-5 text-white/38">
            This saves a reference only. No profile data is scraped and no
            Instagram action is triggered.
          </p>
          <form className="mt-5 space-y-3" onSubmit={add}>
            <Input
              aria-label="Instagram handle"
              onChange={(event) => setHandle(event.target.value)}
              placeholder="@handle"
              value={handle}
            />
            <Button
              className="w-full bg-[#e9e4dc] text-[#15161a]"
              type="submit"
            >
              <Plus /> Add to watchlist
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function AutomationsView({
  account,
  onOpenSetup,
  onRun,
  result,
}: {
  account: InstagramAccountView;
  onOpenSetup: () => void;
  onRun: (id: string) => void;
  result: string;
}) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    'content-prep': true,
    'manual-engagement': true,
  });
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Code-first workflow engine</p>
        <h2 className="page-title">Automation components</h2>
        <p className="page-copy">
          Small typed components replace visual n8n nodes. Each pipeline is
          testable and guarded by account capabilities.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {workflowItems.map((item) => (
          <article
            className={`rounded-2xl border p-5 ${item.locked ? 'border-white/6 bg-[#0f1013] opacity-75' : 'border-white/8 bg-[#111216]'}`}
            key={item.id}
          >
            <div className="flex items-start gap-3">
              <div
                className={`grid size-10 place-items-center rounded-xl ${item.locked ? 'bg-white/5 text-white/28' : 'bg-[#d9c5ff]/10 text-[#c8adff]'}`}
              >
                {item.locked ? (
                  <LockKeyhole className="size-5" />
                ) : (
                  <Workflow className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white/84">{item.title}</h3>
                  {item.locked ? (
                    <Badge
                      variant="outline"
                      className="border-[#e3aa58]/20 text-[#dfb56e]"
                    >
                      {account.connected ? 'Provider pending' : 'Professional'}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-white/38">
                  {item.description}
                </p>
              </div>
              <Switch
                checked={item.locked ? false : Boolean(enabled[item.id])}
                disabled={item.locked}
                onCheckedChange={(checked) =>
                  setEnabled((current) => ({ ...current, [item.id]: checked }))
                }
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {item.nodes.map((node, index) => (
                <div className="flex items-center gap-2" key={node}>
                  <span className="rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-1.5 text-[10px] text-white/45">
                    {node}
                  </span>
                  {index < item.nodes.length - 1 ? (
                    <ChevronRight className="size-3 text-white/18" />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center border-t border-white/7 pt-4">
              <span className="flex items-center gap-1.5 text-[11px] text-white/32">
                <CircleDot
                  className={`size-3 ${item.locked ? 'text-[#e2ab5b]' : 'text-[#62cdb0]'}`}
                />
                {item.locked
                  ? account.connected
                    ? 'Account connected · provider step pending'
                    : 'Waiting for Meta connection'
                  : enabled[item.id]
                    ? 'Validation ready'
                    : 'Paused'}
              </span>
              {item.locked ? (
                <Button
                  className="ml-auto"
                  onClick={onOpenSetup}
                  size="sm"
                  variant="ghost"
                >
                  Setup path
                </Button>
              ) : (
                <Button
                  className="ml-auto"
                  onClick={() => onRun(item.id)}
                  size="sm"
                  variant="outline"
                >
                  Validate sample
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      {result ? (
        <output
          aria-live="polite"
          className="block rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3 font-mono text-[11px] text-white/48"
        >
          {result}
        </output>
      ) : null}
    </div>
  );
}

function ActivityView({
  account,
  loading,
  monitoring,
  onRefresh,
}: {
  account: InstagramAccountView;
  loading: boolean;
  monitoring: MonitoringSnapshot | null;
  onRefresh: () => void;
}) {
  const totals = monitoring?.totals ?? {
    all: 0,
    completed: 0,
    failed: 0,
    blocked: 0,
    last24Hours: 0,
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">MongoDB operations log</p>
          <h2 className="page-title">Activity & monitoring</h2>
          <p className="page-copy">
            Connection health and a durable history of workflows, local AI
            requests, and account maintenance.
          </p>
        </div>
        <Button disabled={loading} onClick={onRefresh} variant="outline">
          <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="All jobs" value={totals.all} tone="text-white" />
        <MetricCard
          label="Last 24 hours"
          value={totals.last24Hours}
          tone="text-[#c8b6f5]"
        />
        <MetricCard
          label="Completed"
          value={totals.completed}
          tone="text-[#83dcc5]"
        />
        <MetricCard
          label="Blocked"
          value={totals.blocked}
          tone="text-[#f0c477]"
        />
        <MetricCard
          label="Failed"
          value={totals.failed}
          tone="text-[#ef9a9a]"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/8 bg-[#111216] p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-white/5 text-white/45">
              <Database className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium">System health</h3>
              <p className="mt-0.5 text-[11px] text-white/35">
                Latest server check
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-xs">
            <HealthRow
              label="MongoDB"
              value={monitoring?.database ?? 'checking'}
              healthy={monitoring?.database === 'connected'}
            />
            <HealthRow
              label="Instagram"
              value={
                account.connected ? `@${account.username}` : 'not connected'
              }
              healthy={account.connected}
            />
            <HealthRow
              label="Token"
              value={account.status ?? 'not available'}
              healthy={account.status === 'connected'}
            />
          </div>
          {monitoring?.checkedAt ? (
            <p className="mt-5 border-t border-white/7 pt-4 text-[10px] text-white/28">
              Checked {new Date(monitoring.checkedAt).toLocaleString()}
            </p>
          ) : null}
        </aside>

        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111216]">
          <div className="border-b border-white/8 px-5 py-4">
            <h3 className="text-sm font-medium">Recent jobs</h3>
          </div>
          {monitoring?.recentJobs.length ? (
            <div className="divide-y divide-white/7">
              {monitoring.recentJobs.map((job) => (
                <article
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(150px,.7fr)_minmax(240px,1.5fr)_auto] sm:items-center"
                  key={job.id}
                >
                  <div>
                    <p className="font-mono text-[11px] text-white/58">
                      {job.kind}
                    </p>
                    <p className="mt-1 text-[10px] text-white/28">
                      {new Date(job.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-white/48">
                    {job.summary}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      job.status === 'completed'
                        ? 'w-fit border-[#56c7aa]/20 text-[#83dcc5]'
                        : job.status === 'failed'
                          ? 'w-fit border-[#e76c6c]/20 text-[#ef9a9a]'
                          : 'w-fit border-[#e5aa56]/20 text-[#f0c477]'
                    }
                  >
                    {job.status}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <Activity className="mx-auto size-6 text-white/22" />
                <p className="mt-3 text-sm text-white/50">
                  No recorded jobs yet
                </p>
                <p className="mt-1 text-xs text-white/28">
                  Run a workflow or connect Instagram to begin the history.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111216] p-4">
      <p className="text-[10px] uppercase tracking-[0.13em] text-white/30">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function HealthRow({
  healthy,
  label,
  value,
}: {
  healthy: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/7 bg-white/[0.025] px-3 py-2.5">
      <span
        className={`size-2 rounded-full ${healthy ? 'bg-[#56c7aa]' : 'bg-[#e5aa56]'}`}
      />
      <span className="text-white/42">{label}</span>
      <span className="ml-auto max-w-36 truncate text-white/68">{value}</span>
    </div>
  );
}

function SettingsView({
  account,
  accountLoading,
  localAi,
  localAiToken,
  onChange,
  onTokenChange,
  onConnect,
  onDisconnect,
  onOpenSetup,
  onRefresh,
}: {
  account: InstagramAccountView;
  accountLoading: boolean;
  localAi: LocalAiSettings;
  localAiToken: string;
  onChange: React.Dispatch<React.SetStateAction<LocalAiSettings>>;
  onTokenChange: (token: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenSetup: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-5">
      <AccountSettingsView account={account} onOpenSetup={onOpenSetup} />
      <InstagramConnectionCard
        account={account}
        loading={accountLoading}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onRefresh={onRefresh}
      />
      <section className="rounded-2xl border border-white/8 bg-[#111216] p-5 text-sm leading-6 text-white/55">
        <h3 className="font-medium text-white/85">Client account onboarding</h3>
        <p className="mt-2">
          Each client connects their own Instagram Business or Creator account
          through the Connect Instagram button. Their Instagram user ID appears
          above after authorization. Until Meta approves this app for public
          use, each account also needs its own accepted tester role in Meta App
          roles.
        </p>
        <p className="mt-2">
          Public client onboarding and non-tester inbox access depend on Meta
          App Review, required Advanced Access, and app publication. This panel
          does not grant those approvals.
        </p>
      </section>
      <LocalAiSettingsCard
        localAi={localAi}
        localAiToken={localAiToken}
        onChange={onChange}
        onTokenChange={onTokenChange}
      />
    </div>
  );
}

function InstagramConnectionCard({
  account,
  loading,
  onConnect,
  onDisconnect,
  onRefresh,
}: {
  account: InstagramAccountView;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  const expiry = account.tokenExpiresAt
    ? new Date(account.tokenExpiresAt).toLocaleDateString()
    : null;

  return (
    <section className="rounded-2xl border border-[#56c7aa]/18 bg-[#0f1615] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#56c7aa]/12 text-[#83dcc5]">
          <Link2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-white/88">
              Instagram Business connection
            </h3>
            <Badge
              variant="outline"
              className={
                account.connected
                  ? 'border-[#56c7aa]/20 text-[#83dcc5]'
                  : 'border-white/10 text-white/40'
              }
            >
              {loading
                ? 'Checking'
                : account.connected
                  ? 'Connected'
                  : 'Not connected'}
            </Badge>
          </div>
          {account.connected ? (
            <div className="mt-2 space-y-1 text-xs text-white/45">
              <p>
                <span className="text-white/75">@{account.username}</span> ·{' '}
                {account.accountType || 'Professional account'}
              </p>
              <p>
                Token encrypted in MongoDB
                {expiry ? ` · refresh due before ${expiry}` : ''}
              </p>
              <p>
                Instagram user ID:{' '}
                <code className="select-all text-white/70">{account.id}</code>
              </p>
              <p>
                {account.scopesVerified
                  ? 'Scopes granted by Meta'
                  : 'Scopes requested at connection (grant unverified)'}
                : {(account.scopes ?? []).join(', ') || 'Not reported'}
              </p>
              {!account.scopes?.includes(
                'instagram_business_manage_messages',
              ) ? (
                <p className="text-[#efbd73]">
                  Inbox access needs a fresh Instagram authorization with manage
                  messages enabled in Vercel settings.
                </p>
              ) : null}
            </div>
          ) : account.configured ? (
            <div className="mt-2 max-w-2xl space-y-3 text-xs leading-5 text-white/40">
              <p>
                Sign in on Instagram’s authorization page. Orbit never receives
                or stores your Instagram password.
              </p>
              {account.oauthRedirectUri ? (
                <div className="rounded-xl border border-white/8 bg-black/15 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/28">
                    Meta OAuth redirect URI
                  </p>
                  <code className="mt-1 block break-all text-[11px] text-[#83dcc5]">
                    {account.oauthRedirectUri}
                  </code>
                  <p className="mt-2 text-[11px] text-white/32">
                    In Meta Developers, open Instagram API → API setup with
                    Instagram login → Set up Instagram business login → Business
                    login settings. Add this exact value under OAuth redirect
                    URIs. The generated Embed URL may use your site root
                    instead. For an unpublished app, the connecting Instagram
                    account must also accept an Instagram tester invitation.
                  </p>
                </div>
              ) : null}
              {account.webhookCallbackUrl ? (
                <div className="rounded-xl border border-white/8 bg-black/15 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/28">
                    Meta webhook callback URL
                  </p>
                  <code className="mt-1 block break-all text-[11px] text-white/60">
                    {account.webhookCallbackUrl}
                  </code>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-xs text-[#efbd73]">
                Add the missing server configuration before connecting:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(account.missingConfiguration ?? []).map((item) => (
                  <code
                    className="rounded-md bg-black/20 px-2 py-1 text-[10px] text-white/48"
                    key={item}
                  >
                    {item}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {account.connected ? (
            <>
              {!account.scopes?.includes(
                'instagram_business_manage_messages',
              ) ? (
                <Button
                  disabled={loading}
                  onClick={onConnect}
                  size="sm"
                  variant="outline"
                >
                  Reconnect for inbox
                </Button>
              ) : null}
              <Button
                disabled={loading}
                onClick={onRefresh}
                size="sm"
                variant="outline"
              >
                <RefreshCw /> Verify & refresh
              </Button>
              <Button
                className="text-[#ef9a9a]"
                disabled={loading}
                onClick={onDisconnect}
                size="sm"
                variant="ghost"
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              className="bg-[#e9e4dc] text-[#15161a]"
              disabled={loading || !account.configured}
              onClick={onConnect}
            >
              Connect Instagram
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function LocalAiSettingsCard({
  localAi,
  localAiToken,
  onChange,
  onTokenChange,
}: {
  localAi: LocalAiSettings;
  localAiToken: string;
  onChange: React.Dispatch<React.SetStateAction<LocalAiSettings>>;
  onTokenChange: (token: string) => void;
}) {
  const [testState, setTestState] = useState<
    'idle' | 'testing' | 'connected' | 'error'
  >('idle');
  const [testMessage, setTestMessage] = useState('');

  function updateProvider(provider: LocalAiProvider) {
    onChange((current) => ({
      ...current,
      provider,
      baseUrl:
        current.baseUrl === 'http://127.0.0.1:11434' ||
        current.baseUrl === 'http://127.0.0.1:1234'
          ? provider === 'ollama'
            ? 'http://127.0.0.1:11434'
            : 'http://127.0.0.1:1234'
          : current.baseUrl,
    }));
    setTestState('idle');
    setTestMessage('');
  }

  async function testConnection() {
    setTestState('testing');
    setTestMessage('Checking the local server…');
    try {
      const data = await localAiModels(localAi, localAiToken);
      setTestState('connected');
      setTestMessage(`Connected. Using ${data.model}.`);
    } catch (error) {
      setTestState('error');
      setTestMessage(
        error instanceof Error
          ? error.message
          : 'Could not connect to the local AI server.',
      );
    }
  }

  return (
    <section className="rounded-2xl border border-[#a990e9]/18 bg-[#121117] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#a990e9]/12 text-[#cdbbff]">
          <Cpu className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-white/88">Local AI</h3>
            <Badge
              variant="outline"
              className="border-[#a990e9]/20 text-[#c7b3f6]"
            >
              Device only
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-white/40">
            Your browser connects directly to the model on this laptop,
            including when the panel is hosted on Vercel. The API token stays in
            this tab only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/42">
            {localAi.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            aria-label="Use local AI"
            checked={localAi.enabled}
            onCheckedChange={(enabled) =>
              onChange((current) => ({ ...current, enabled }))
            }
          />
        </div>
      </div>
      <Button
        className="mt-4 border-[#a990e9]/20 bg-[#a990e9]/8 text-[#d4c4ff]"
        onClick={() =>
          onChange({
            enabled: true,
            provider: 'openai-compatible',
            baseUrl: 'http://127.0.0.1:1234',
            model: 'qwen/qwen3.5-9b',
          })
        }
        size="sm"
        variant="outline"
      >
        Use local Qwen in LM Studio
      </Button>

      <div
        className={`mt-6 grid gap-4 transition-opacity sm:grid-cols-2 ${localAi.enabled ? 'opacity-100' : 'pointer-events-none opacity-45'}`}
      >
        <label
          className="block text-xs text-white/55"
          htmlFor="local-ai-provider"
        >
          API format
          <select
            className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-[#0e0f13] px-3 text-sm text-white/75 outline-none focus:border-[#a990e9]/45"
            disabled={!localAi.enabled}
            id="local-ai-provider"
            onChange={(event) =>
              updateProvider(event.target.value as LocalAiProvider)
            }
            value={localAi.provider}
          >
            <option value="ollama">Ollama</option>
            <option value="openai-compatible">
              OpenAI-compatible / LM Studio
            </option>
          </select>
        </label>

        <label className="block text-xs text-white/55" htmlFor="local-ai-model">
          Model name <span className="text-white/25">(optional)</span>
          <Input
            className="mt-2"
            disabled={!localAi.enabled}
            id="local-ai-model"
            onChange={(event) =>
              onChange((current) => ({ ...current, model: event.target.value }))
            }
            placeholder="qwen3:8b"
            value={localAi.model}
          />
        </label>

        <label
          className="block text-xs text-white/55 sm:col-span-2"
          htmlFor="local-ai-url"
        >
          Local server URL
          <Input
            className="mt-2 font-mono text-xs"
            disabled={!localAi.enabled}
            id="local-ai-url"
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                baseUrl: event.target.value,
              }))
            }
            placeholder={
              localAi.provider === 'ollama'
                ? 'http://127.0.0.1:11434'
                : 'http://127.0.0.1:1234'
            }
            type="url"
            value={localAi.baseUrl}
          />
        </label>
        {localAi.provider === 'openai-compatible' ? (
          <label
            className="block text-xs text-white/55 sm:col-span-2"
            htmlFor="local-ai-token"
          >
            LM Studio API token (if authentication is enabled)
            <Input
              autoComplete="off"
              className="mt-2"
              disabled={!localAi.enabled}
              id="local-ai-token"
              onChange={(event) => onTokenChange(event.target.value)}
              type="password"
              value={localAiToken}
            />
          </label>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-white/7 pt-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-white/32">
            Server settings save in this browser; the API token is kept only
            until this tab closes. Load Qwen in LM Studio and enable CORS for
            browser access.
          </p>
          {testMessage ? (
            <p
              aria-live="polite"
              className={`mt-1.5 text-xs ${testState === 'connected' ? 'text-[#72d4b9]' : testState === 'error' ? 'text-[#ef9a9a]' : 'text-white/45'}`}
            >
              {testMessage}
            </p>
          ) : null}
        </div>
        <Button
          className="border-[#a990e9]/20 bg-[#a990e9]/8 text-[#d4c4ff] hover:bg-[#a990e9]/14"
          disabled={!localAi.enabled || testState === 'testing'}
          onClick={testConnection}
          variant="outline"
        >
          <Bot className={testState === 'testing' ? 'animate-pulse' : ''} />
          {testState === 'testing' ? 'Testing…' : 'Test connection'}
        </Button>
      </div>
    </section>
  );
}

function AccountSettingsView({
  account,
  onOpenSetup,
}: {
  account: InstagramAccountView;
  onOpenSetup: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Configuration</p>
        <h2 className="page-title">Account & safety</h2>
        <p className="page-copy">
          Current limits are enforced in both the interface and workflow engine.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/8 bg-[#111216] p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#f3ad53]/10 text-[#efbb70]">
                <CircleUserRound className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium">
                  Instagram operating mode
                </h3>
                <p className="mt-0.5 text-xs text-white/35">
                  {account.connected
                    ? `@${account.username} is connected through the official API.`
                    : 'No Instagram account credentials are stored.'}
                </p>
              </div>
              <Badge
                variant="outline"
                className="ml-auto border-[#f3ad53]/20 text-[#dfb56e]"
              >
                {account.connected ? 'API connected' : 'Manual mode'}
              </Badge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="setting-row">
                <span>Content planning</span>
                <CheckCircle2 className="size-4 text-[#72d4b9]" />
              </div>
              <div className="setting-row">
                <span>Human approval queue</span>
                <CheckCircle2 className="size-4 text-[#72d4b9]" />
              </div>
              <div className="setting-row">
                <span>Automatic publishing</span>
                <LockKeyhole className="size-4 text-white/25" />
              </div>
              <div className="setting-row">
                <span>Comment / DM sync</span>
                <LockKeyhole className="size-4 text-white/25" />
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-white/8 bg-[#111216] p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-[#7ad6bd]" />
              <div>
                <h3 className="text-sm font-medium">Safety policy</h3>
                <p className="mt-0.5 text-xs text-white/35">
                  Unrelated account actions always stop at human approval.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-xs text-white/45">
              <p className="flex items-center gap-2">
                <Check className="size-3.5 text-[#78d1ba]" /> No password-based
                Instagram automation
              </p>
              <p className="flex items-center gap-2">
                <Check className="size-3.5 text-[#78d1ba]" /> No automatic
                likes, follows, or outbound comments
              </p>
              <p className="flex items-center gap-2">
                <Check className="size-3.5 text-[#78d1ba]" /> Official API
                actions remain capability-gated
              </p>
            </div>
          </section>
        </div>
        <aside className="rounded-2xl border border-white/8 bg-[#111216] p-5">
          <p className="eyebrow">Connection path</p>
          <h3 className="mt-2 font-medium">Instagram Login API</h3>
          <p className="mt-2 text-xs leading-5 text-white/38">
            Use your existing professional Instagram profile. This login method
            does not require linking a Facebook Page.
          </p>
          <ol className="mt-5 space-y-4">
            {[
              'Convert to Creator or Business',
              'Create a Meta business app',
              'Enable API setup with Instagram login',
              'Authorize requested scopes',
            ].map((item, index) => (
              <li className="flex gap-3 text-xs text-white/55" key={item}>
                <span className="grid size-5 shrink-0 place-items-center rounded-full border border-white/10 text-[10px] text-white/38">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <Button
            className="mt-6 w-full bg-[#e9e4dc] text-[#15161a]"
            onClick={onOpenSetup}
          >
            Open setup guide
          </Button>
        </aside>
      </div>
    </div>
  );
}

function NewContentDialog({
  accountConnected,
  content,
  localAi,
  localAiToken,
  onChange,
  onOpenChange,
  open,
  showNotice,
}: {
  accountConnected: boolean;
  content: ContentItem[];
  localAi: LocalAiSettings;
  localAiToken: string;
  onChange: React.Dispatch<React.SetStateAction<ContentItem[]>>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  showNotice: (message: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [format, setFormat] = useState<ContentItem['format']>('Post');
  const [generating, setGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  async function generateCaption() {
    setGenerating(true);
    setAiMessage('');
    try {
      const data = await generateLocalCaption(
        localAi,
        localAiToken,
        [
          'Write one concise, natural Instagram caption.',
          `Content format: ${format}.`,
          `Working title: ${title.trim() || 'Untitled content'}.`,
          caption.trim() ? `Improve this draft: ${caption.trim()}` : '',
          'Return only the finished caption. Do not add analysis or quotation marks.',
        ]
          .filter(Boolean)
          .join('\n'),
      );
      setCaption(data.text);
      setAiMessage(`Generated locally with ${data.model ?? 'your model'}.`);
    } catch (error) {
      setAiMessage(
        error instanceof Error
          ? error.message
          : 'Local caption generation failed.',
      );
    } finally {
      setGenerating(false);
    }
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountConnected) {
      showNotice('Connect Instagram before saving a durable draft.');
      return;
    }
    if (!title.trim() || !caption.trim()) return;
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId: 'content-prep',
        accountMode: 'personal',
        payload: { caption },
      }),
    });
    if (!response.ok) return;
    onChange([
      ...content,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        caption: caption.trim(),
        format,
        status: 'Draft',
        scheduled: 'Unscheduled',
      },
    ]);
    setTitle('');
    setCaption('');
    setFormat('Post');
    onOpenChange(false);
    showNotice('Draft validated and saved to your connected content plan.');
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/10 bg-[#17181d] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create content draft</DialogTitle>
          <DialogDescription>
            {accountConnected
              ? 'Prepare a draft for this connected account. Nothing will be published.'
              : 'Connect Instagram before saving a draft.'}
          </DialogDescription>
        </DialogHeader>
        <form id="content-form" className="space-y-4" onSubmit={submit}>
          <label
            className="block text-xs text-white/55"
            htmlFor="content-title"
          >
            Working title
          </label>
          <Input
            className="mt-2"
            id="content-title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="September product story"
            required
            value={title}
          />
          <label
            className="block text-xs text-white/55"
            htmlFor="content-format"
          >
            Format
          </label>
          <select
            className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-[#111216] px-3 text-sm text-white/75 outline-none"
            id="content-format"
            onChange={(event) =>
              setFormat(event.target.value as ContentItem['format'])
            }
            value={format}
          >
            <option>Post</option>
            <option>Carousel</option>
            <option>Reel</option>
            <option>Story</option>
          </select>
          <div className="flex items-center gap-2">
            <label
              className="block text-xs text-white/55"
              htmlFor="content-caption"
            >
              Caption
            </label>
            {localAi.enabled ? (
              <Badge
                variant="outline"
                className="border-[#a990e9]/20 text-[#c7b3f6]"
              >
                Local AI ready
              </Badge>
            ) : null}
          </div>
          <Textarea
            className="mt-2 min-h-32"
            id="content-caption"
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Write or paste the caption…"
            required
            value={caption}
          />
          {localAi.enabled ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                className="border-[#a990e9]/20 bg-[#a990e9]/8 text-[#d4c4ff]"
                disabled={generating}
                onClick={generateCaption}
                type="button"
                variant="outline"
              >
                <Bot className={generating ? 'animate-pulse' : ''} />
                {generating
                  ? 'Generating locally…'
                  : caption.trim()
                    ? 'Improve with local AI'
                    : 'Generate with local AI'}
              </Button>
              {aiMessage ? (
                <p aria-live="polite" className="text-[11px] text-white/40">
                  {aiMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
        <DialogFooter className="border-white/8 bg-white/[0.025]">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#e9e4dc] text-[#15161a]"
            disabled={!accountConnected}
            form="content-form"
            type="submit"
          >
            <PencilLine /> Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetupDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/10 bg-[#17181d] text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Professional account connection path</DialogTitle>
          <DialogDescription>
            You can use the panel now and connect official automation later
            without rebuilding it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {[
            {
              icon: CircleUserRound,
              title: 'Convert inside Instagram',
              copy: 'Choose Creator or Business. Your username, followers, and existing content remain on the same profile.',
            },
            {
              icon: Link2,
              title: 'Enable Instagram Login',
              copy: 'In the Meta App Dashboard, choose API setup with Instagram login. A linked Facebook Page is not required.',
            },
            {
              icon: ShieldCheck,
              title: 'Authorize only needed permissions',
              copy: 'Publishing, owned-post comments, insights, and eligible messages stay separately scoped.',
            },
            {
              icon: Workflow,
              title: 'Enable guarded pipelines',
              copy: 'Orbit will unlock only the components supported by the granted permissions.',
            },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                className="flex gap-4 rounded-xl border border-white/7 bg-white/[0.025] p-4"
                key={step.title}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-white/45">
                  <Icon className="size-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/28">
                      0{index + 1}
                    </span>
                    <h3 className="text-sm font-medium text-white/82">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-white/38">
                    {step.copy}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter className="border-white/8 bg-white/[0.025]">
          <Button
            className="bg-[#e9e4dc] text-[#15161a]"
            onClick={() => onOpenChange(false)}
          >
            Keep personal mode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
