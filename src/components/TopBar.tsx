import { ArrowUpRight, Loader2, Play, UserCheck } from 'lucide-react';
import type { WorkspaceAccount } from '../types/harness';

export type WorkspaceTab = 'overview' | 'blueprint' | 'runner' | 'prospects' | 'export';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onPrimaryAction: () => void;
  onOpenAuthModal: () => void;
  account: WorkspaceAccount;
  isRunning: boolean;
  wholenessPassed: boolean;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'blueprint', label: 'Campaign' },
  { id: 'runner', label: 'Runner' },
  { id: 'prospects', label: 'Prospects' },
  { id: 'export', label: 'Export' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onPrimaryAction,
  onOpenAuthModal,
  account,
  isRunning,
  wholenessPassed,
}: TopBarProps) {
  const isOverview = activeTab === 'overview';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('overview')}
          className="text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded"
        >
          Sales<span className="text-sky-600">Gency</span>
        </button>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 rounded ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-900"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Account Portal & Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenAuthModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            <span className="max-w-[130px] truncate">{account.email}</span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              ({account.documents.length})
            </span>
          </button>

          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900"
          >
            {isOverview ? (
              <>
                <span>Start Campaign</span>
                <ArrowUpRight className="w-4 h-4" />
              </>
            ) : isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Loop</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{wholenessPassed ? 'Run Harness' : 'Complete Campaign'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Secondary Nav Row (only below md breakpoint) */}
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`text-xs font-medium whitespace-nowrap shrink-0 py-1 ${
              activeTab === item.id ? 'text-slate-900 underline underline-offset-4' : 'text-slate-500'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
}
