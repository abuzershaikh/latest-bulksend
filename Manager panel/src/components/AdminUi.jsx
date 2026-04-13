import { formatCount } from './adminData';

export function TopBar({ activeTab, tabs, onTabChange, onLogout, manager }) {
    return (
        <header className="sticky top-0 z-20 border-b border-cyan-400/10 bg-dark-900/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">OpenLeads Reseller Dashboard</p>
                        <h1 className="text-xl font-bold text-white md:text-2xl">Resell and Earn with OpenLeads</h1>
                        <p className="mt-1 text-xs text-slate-400">{manager.name} | {manager.email}</p>
                    </div>

                    <button
                        type="button"
                        onClick={onLogout}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                        Sign Out
                    </button>
                </div>

                <nav className="hidden max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/5 p-1 md:flex [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((tab) => (
                        tab.href ? (
                            <a
                                key={tab.id}
                                href={tab.href}
                                target={tab.external ? '_blank' : undefined}
                                rel={tab.external ? 'noreferrer' : undefined}
                                className="shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                            >
                                {tab.label}
                            </a>
                        ) : (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => onTabChange(tab.id)}
                                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id
                                    ? 'bg-cyan-300 text-slate-950'
                                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        )
                    ))}
                </nav>
            </div>
        </header>
    );
}

export function BottomNav({ activeTab, tabs, onTabChange }) {
    return (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-dark-800/95 px-3 py-3 backdrop-blur md:hidden">
            <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {tabs.map((tab) => (
                    tab.href ? (
                        <a
                            key={tab.id}
                            href={tab.href}
                            target={tab.external ? '_blank' : undefined}
                            rel={tab.external ? 'noreferrer' : undefined}
                            className="shrink-0 whitespace-nowrap rounded-lg bg-white/5 px-4 py-3 text-center text-sm font-bold text-slate-300 transition hover:bg-white/10"
                        >
                            {tab.label}
                        </a>
                    ) : (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-3 text-sm font-bold transition ${activeTab === tab.id
                                ? 'bg-cyan-300 text-slate-950'
                                : 'bg-white/5 text-slate-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    )
                ))}
            </div>
        </nav>
    );
}

export function StatusBanner({ errors, isLoading }) {
    if (isLoading) {
        return (
            <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                Loading your secure manager data...
            </div>
        );
    }

    if (!errors.length) return null;

    return (
        <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Some data could not be loaded.</p>
            <p className="mt-1 text-amber-50/80">{errors.join(' | ')}</p>
        </div>
    );
}

export function ScreenTitle({ eyebrow, title, description }) {
    return (
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-5">
            <p className="text-sm font-semibold text-cyan-200">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p>
        </section>
    );
}

export function StatCard({ label, value, helper, tone = 'default' }) {
    const toneClass = {
        default: 'text-white',
        primary: 'text-cyan-200',
        success: 'text-emerald-300',
        warning: 'text-amber-200',
        orange: 'text-orange-200',
    }[tone];

    return (
        <div className="rounded-2xl border border-white/10 bg-dark-800 p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <div className={`mt-3 text-3xl font-bold ${toneClass}`}>{formatCount(value)}</div>
            <p className="mt-1 text-xs text-slate-400">{helper}</p>
        </div>
    );
}

export function Badge({ children, className }) {
    return (
        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${className}`}>
            {children}
        </span>
    );
}

export function EmptyState({ message }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-dark-800 p-6 text-center text-sm text-slate-300">
            {message}
        </div>
    );
}
