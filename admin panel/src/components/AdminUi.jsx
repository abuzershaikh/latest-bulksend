import { auth } from '../firebase';
import { formatCount } from './adminData';

export function TopBar({ activeTab, tabs, onTabChange, onLogout }) {
    return (
        <header className="sticky top-0 z-20 border-b border-white/10 bg-dark-900/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin Panel</p>
                    <h1 className="text-xl font-bold text-white md:text-2xl">BulkSend Control</h1>
                </div>

                <nav className="hidden rounded-lg border border-white/10 bg-dark-800 p-1 md:flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id
                                ? 'bg-primary text-slate-950'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <div className="hidden text-right text-xs text-slate-400 lg:block">
                        <div>Signed in</div>
                        <div className="max-w-48 truncate text-slate-200">{auth.currentUser?.email}</div>
                    </div>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    );
}

export function BottomNav({ activeTab, tabs, onTabChange }) {
    return (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-dark-800/95 px-3 py-3 backdrop-blur md:hidden">
            <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onTabChange(tab.id)}
                        className={`rounded-lg px-3 py-3 text-sm font-bold transition ${activeTab === tab.id
                            ? 'bg-primary text-slate-950'
                            : 'bg-white/5 text-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </nav>
    );
}

export function StatusBanner({ errors, isLoading }) {
    if (isLoading) {
        return (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-sky-100">
                Loading live Firebase data...
            </div>
        );
    }

    if (!errors.length) return null;

    return (
        <div className="mb-6 rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Some data could not be loaded.</p>
            <p className="mt-1 text-amber-50/80">{errors.join(' | ')}</p>
        </div>
    );
}

export function ScreenTitle({ eyebrow, title, description }) {
    return (
        <section className="rounded-lg border border-white/10 bg-dark-800 p-5">
            <p className="text-sm font-semibold text-primary">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">{description}</p>
        </section>
    );
}

export function StatCard({ label, value, helper, tone = 'default' }) {
    const toneClass = {
        default: 'text-white',
        primary: 'text-primary',
        success: 'text-emerald-300',
        warning: 'text-amber-200',
        orange: 'text-orange-200',
    }[tone];

    return (
        <div className="rounded-lg border border-white/10 bg-dark-800 p-4 shadow-lg">
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
        <div className="rounded-lg border border-white/10 bg-dark-800 p-6 text-center text-sm text-slate-300">
            {message}
        </div>
    );
}
