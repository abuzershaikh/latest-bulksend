import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { fetchManagerAccess, normalizeManagerEmail } from './components/managerAccess';
import { lookupManagerAccessByEmail, ManagerApiError } from './components/managerApi';

function App() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [accessLoading, setAccessLoading] = useState(false);
    const [managerProfile, setManagerProfile] = useState(null);
    const [blockedAccess, setBlockedAccess] = useState(null);
    const [accessError, setAccessError] = useState('');
    const [retryNonce, setRetryNonce] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setManagerProfile(null);
            setBlockedAccess(null);
            setAccessError('');
            setAccessLoading(Boolean(currentUser));
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) {
            setAccessLoading(false);
            return undefined;
        }

        let cancelled = false;

        async function loadManagerAccess() {
            setAccessLoading(true);
            setAccessError('');
            setBlockedAccess(null);

            try {
                const access = await fetchManagerAccess(user);
                if (cancelled) return;

                setManagerProfile({
                    ...access,
                    uid: user.uid,
                });
            } catch (error) {
                if (cancelled) return;

                const blocked = await buildBlockedAccess(error, user);
                if (blocked) {
                    setManagerProfile(null);
                    setBlockedAccess(blocked);
                } else {
                    setManagerProfile(null);
                    setAccessError(error instanceof Error ? error.message : 'Unable to verify manager access.');
                }
            } finally {
                if (!cancelled) {
                    setAccessLoading(false);
                }
            }
        }

        loadManagerAccess();

        return () => {
            cancelled = true;
        };
    }, [retryNonce, user]);

    const handleAccessRevoked = async (error) => {
        const blocked = await buildBlockedAccess(error, user);
        if (blocked) {
            setManagerProfile(null);
            setBlockedAccess(blocked);
            setAccessError('');
            return;
        }

        if (error instanceof Error) {
            setManagerProfile(null);
            setAccessError(error.message);
            return;
        }

        setRetryNonce((value) => value + 1);
    };

    if (authLoading || accessLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-dark-900">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent" />
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    if (accessError) {
        return (
            <AccessErrorScreen
                email={user.email}
                message={accessError}
                onRetry={() => setRetryNonce((value) => value + 1)}
                onLogout={() => signOut(auth)}
            />
        );
    }

    if (blockedAccess) {
        return (
            <AccessBlockedScreen
                email={user.email}
                hasRecord={Boolean(blockedAccess.exists)}
                onLogout={() => signOut(auth)}
            />
        );
    }

    if (!managerProfile) {
        return (
            <AccessErrorScreen
                email={user.email}
                message="We could not resolve your manager access state. Please retry once. If it still fails, contact admin."
                onRetry={() => setRetryNonce((value) => value + 1)}
                onLogout={() => signOut(auth)}
            />
        );
    }

    return (
        <Dashboard
            manager={managerProfile}
            onLogout={() => signOut(auth)}
            onAccessRevoked={handleAccessRevoked}
        />
    );
}

function AccessBlockedScreen({ email, hasRecord, onLogout }) {
    return (
        <div className="min-h-screen bg-dark-900 px-4 py-8 text-white">
            <div className="mx-auto flex min-h-[80vh] max-w-lg items-center justify-center">
                <div className="w-full rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-8 shadow-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">Manager Access</p>
                    <h1 className="mt-3 text-3xl font-bold text-white">Contact your admin</h1>
                    <p className="mt-4 text-sm leading-6 text-slate-300">
                        {hasRecord
                            ? 'Your manager panel access is currently disabled. Please contact your admin to enable it again.'
                            : 'Your Google account is not added as a manager yet. Please contact your admin to get access.'}
                    </p>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                        <p className="font-semibold text-white">Signed in as</p>
                        <p className="mt-1 break-all">{email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onLogout}
                        className="mt-6 w-full rounded-full bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-105"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

function AccessErrorScreen({ email, message, onRetry, onLogout }) {
    return (
        <div className="min-h-screen bg-dark-900 px-4 py-8 text-white">
            <div className="mx-auto flex min-h-[80vh] max-w-lg items-center justify-center">
                <div className="w-full rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.16),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-8 shadow-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-200">Manager Panel</p>
                    <h1 className="mt-3 text-3xl font-bold text-white">Unable to verify access</h1>
                    <p className="mt-4 text-sm leading-6 text-slate-300">{message}</p>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                        <p className="font-semibold text-white">Signed in as</p>
                        <p className="mt-1 break-all">{email}</p>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={onRetry}
                            className="rounded-full bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-105"
                        >
                            Retry
                        </button>
                        <button
                            type="button"
                            onClick={onLogout}
                            className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

async function buildBlockedAccess(error, user) {
    if (!(error instanceof ManagerApiError) || error.status !== 403) {
        if (error instanceof ManagerApiError && (error.status === 500 || error.status === 0)) {
            const fallback = await lookupManagerAccessByEmail(user?.email);
            if (!fallback) return null;
            if (fallback.exists && fallback.enabled) {
                return null;
            }

            return {
                id: fallback.email,
                email: fallback.email,
                name: fallback.name,
                enabled: false,
                exists: fallback.exists,
            };
        }

        return null;
    }

    const normalizedEmail = normalizeManagerEmail(error.details?.email || user?.email);
    const fallbackName = error.details?.name || user?.displayName || normalizedEmail.split('@')[0] || 'Manager';

    return {
        id: normalizedEmail,
        email: normalizedEmail,
        name: fallbackName,
        enabled: false,
        exists: error.details?.code !== 'manager_not_found',
    };
}

export default App;
