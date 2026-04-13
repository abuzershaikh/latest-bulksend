import { useMemo, useState } from 'react';
import { EmptyState, ScreenTitle } from './AdminUi';
import { UserList } from './UserDisplay';

export default function UsersScreen({
    queryText,
    activeQuery,
    onQueryChange,
    onSearchSubmit,
    results,
    isLoading,
    error,
    onOpenUser,
}) {
    const [pasteBusy, setPasteBusy] = useState(false);
    const hasQuery = activeQuery.trim().length >= 2;
    const emailSuggestions = useMemo(() => buildEmailSuggestions(queryText), [queryText]);

    const handleSubmit = (event) => {
        event.preventDefault();
        onSearchSubmit?.(queryText);
    };

    const handlePaste = async () => {
        if (!navigator?.clipboard?.readText) {
            return;
        }

        try {
            setPasteBusy(true);
            const clipboardText = await navigator.clipboard.readText();
            onQueryChange?.(clipboardText);
            onSearchSubmit?.(clipboardText);
        } catch {
            onQueryChange?.(queryText);
        } finally {
            setPasteBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <ScreenTitle
                eyebrow="Customer search"
                title="Find A User"
                description="Search by exact email, phone, user ID, name or business. Results are fetched securely from the worker, so the full user list never loads in the browser."
            />

            <section className="rounded-[28px] border border-white/10 bg-dark-800 p-4">
                <form className="flex flex-col gap-3 md:flex-row md:items-center" onSubmit={handleSubmit}>
                    <div className="relative w-full">
                        <input
                            list="manager-email-suggestions"
                            value={queryText}
                            onChange={(event) => onQueryChange(event.target.value)}
                            placeholder="Search exact email, phone, user ID..."
                            className="w-full rounded-2xl border border-white/10 bg-dark-900 px-4 py-4 pr-16 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
                        />
                        <button
                            type="button"
                            onClick={handlePaste}
                            disabled={pasteBusy || !navigator?.clipboard?.readText}
                            className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Paste from clipboard"
                            aria-label="Paste from clipboard"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                                <path d="M9 4h6" />
                                <path d="M9 2h6a2 2 0 0 1 2 2v2H7V4a2 2 0 0 1 2-2Z" />
                                <path d="M8 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8" />
                                <path d="M14 10h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h4Z" />
                            </svg>
                        </button>
                        <datalist id="manager-email-suggestions">
                            {emailSuggestions.map((suggestion) => (
                                <option key={suggestion} value={suggestion} />
                            ))}
                        </datalist>
                    </div>

                    <button
                        type="submit"
                        className="rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-bold text-slate-950 transition hover:brightness-105 md:shrink-0"
                    >
                        Search
                    </button>

                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 md:shrink-0">
                        Minimum 2 characters
                    </div>
                </form>

                <p className="mt-3 text-xs text-slate-500">
                    Gmail suggestion will appear while typing email. Paste button can directly import an email from clipboard.
                </p>
            </section>

            {!hasQuery ? (
                <EmptyState message="Type at least 2 characters and tap search. No full customer list is loaded here." />
            ) : isLoading ? (
                <EmptyState message="Searching secure results..." />
            ) : error ? (
                <EmptyState message={error} />
            ) : results.length ? (
                <UserList users={results} onOpenUser={onOpenUser} />
            ) : (
                <EmptyState message="No user matched this exact search." />
            )}
        </div>
    );
}

function buildEmailSuggestions(queryText) {
    const cleanQuery = typeof queryText === 'string' ? queryText.trim() : '';
    if (!cleanQuery || cleanQuery.length < 2) {
        return [];
    }

    const compactQuery = cleanQuery.replace(/\s+/g, '');
    if (!compactQuery) {
        return [];
    }

    if (compactQuery.includes('@')) {
        const [localPart, domainPart = ''] = compactQuery.split('@');
        if (!localPart) {
            return [];
        }

        const suggestions = [`${localPart}@gmail.com`];
        if (domainPart && 'gmail.com'.startsWith(domainPart.toLowerCase())) {
            suggestions.unshift(`${localPart}@gmail.com`);
        }

        return [...new Set(suggestions)];
    }

    return [`${compactQuery}@gmail.com`];
}
