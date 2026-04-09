import { useMemo, useState } from 'react';
import { auth } from '../firebase';
import { EmptyState, ScreenTitle, StatCard } from './AdminUi';
import { formatDate } from './adminData';
import ManagerDetailPanel from './ManagerDetailPanel';
import { saveManagerAccount, setManagerAccess } from './managerAccess';

export default function ManagersScreen({ managers, isLoading, onOpenUser }) {
    const [form, setForm] = useState({ name: '', email: '', enabled: true });
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [saving, setSaving] = useState(false);
    const [busyManagerId, setBusyManagerId] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState('');

    const selectedManager = useMemo(
        () => managers.find((manager) => manager.id === selectedManagerId) || null,
        [managers, selectedManagerId],
    );

    const stats = useMemo(() => ({
        total: managers.length,
        enabled: managers.filter((manager) => manager.enabled).length,
        disabled: managers.filter((manager) => !manager.enabled).length,
        customers: managers.reduce((sum, manager) => sum + manager.totalCustomers, 0),
    }), [managers]);

    const actor = {
        name: auth.currentUser?.displayName || '',
        email: auth.currentUser?.email || '',
        uid: auth.currentUser?.uid || '',
    };

    const handleCreateOrUpdate = async (event) => {
        event.preventDefault();
        setSaving(true);
        setFeedback({ type: '', message: '' });

        try {
            const manager = await saveManagerAccount(form, actor);
            setForm({ name: '', email: '', enabled: true });
            setSelectedManagerId(manager.id);
            setFeedback({
                type: 'success',
                message: 'Manager saved successfully. They can now use the manager panel if access is enabled.',
            });
        } catch (error) {
            console.error('Failed to save manager:', error);
            setFeedback({
                type: 'error',
                message: error.message || 'Failed to save the manager.',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleAccess = async (manager, enabled) => {
        setBusyManagerId(manager.id);
        setFeedback({ type: '', message: '' });

        try {
            await setManagerAccess(manager, enabled, actor);
            setFeedback({
                type: 'success',
                message: enabled
                    ? `${manager.name} has been enabled for manager panel access.`
                    : `${manager.name} has been disabled. The panel will show contact your admin.`,
            });
        } catch (error) {
            console.error('Failed to update manager access:', error);
            setFeedback({
                type: 'error',
                message: error.message || 'Failed to update manager access.',
            });
        } finally {
            setBusyManagerId('');
        }
    };

    return (
        <div className="space-y-6">
            <ScreenTitle
                eyebrow="Manager access"
                title="Affiliate Managers"
                description="Create manager access, enable or disable the panel, and review each manager's customer activations."
            />

            <section className="grid gap-3 md:grid-cols-4">
                <StatCard label="Managers" value={stats.total} helper="All manager accounts" />
                <StatCard label="Enabled" value={stats.enabled} helper="Can access panel" tone="success" />
                <StatCard label="Disabled" value={stats.disabled} helper="Blocked on login" tone="warning" />
                <StatCard label="Customers" value={stats.customers} helper="Current attributed users" tone="primary" />
            </section>

            <section className="rounded-lg border border-white/10 bg-dark-800 p-5">
                <div className="mb-4">
                    <p className="text-sm font-semibold text-primary">Add or update manager</p>
                    <h3 className="text-xl font-bold text-white">Manager Access Form</h3>
                </div>

                <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleCreateOrUpdate}>
                    <input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Manager name"
                        className="rounded-lg border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-primary"
                    />
                    <input
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        placeholder="Manager email"
                        className="rounded-lg border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-primary"
                    />
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : 'Save Manager'}
                    </button>
                </form>

                <label className="mt-3 inline-flex items-center gap-3 text-sm text-slate-300">
                    <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                        className="h-4 w-4 rounded border-white/20 bg-dark-900 text-primary focus:ring-primary"
                    />
                    Enable this manager immediately
                </label>

                {feedback.message && (
                    <div className={`mt-4 rounded-lg border p-3 text-sm ${feedback.type === 'error'
                        ? 'border-rose-400/40 bg-rose-500/10 text-rose-100'
                        : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                        }`}
                    >
                        {feedback.message}
                    </div>
                )}
            </section>

            <section className="rounded-lg border border-white/10 bg-dark-800 p-4">
                <div className="mb-4">
                    <p className="text-sm font-semibold text-primary">Live manager list</p>
                    <h3 className="text-xl font-bold text-white">Performance and access</h3>
                </div>

                {isLoading ? (
                    <EmptyState message="Loading managers..." />
                ) : managers.length ? (
                    <div className="space-y-3">
                        {managers.map((manager) => (
                            <article key={manager.id} className="rounded-lg border border-white/10 bg-dark-900 p-4">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="truncate text-lg font-bold text-white">{manager.name}</h4>
                                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${manager.enabled
                                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                                                : 'border-rose-400/30 bg-rose-500/10 text-rose-100'
                                                }`}
                                            >
                                                {manager.enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                        <p className="mt-1 truncate text-sm text-slate-400">{manager.email}</p>
                                        <p className="mt-2 text-sm text-slate-300">
                                            {manager.totalCustomers} customers | Last activation {formatDate(manager.latestActivationMillis, true)}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Last login {formatDate(manager.lastLoginMillis, true)}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedManagerId(manager.id)}
                                            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
                                        >
                                            View Customers
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busyManagerId === manager.id}
                                            onClick={() => handleToggleAccess(manager, !manager.enabled)}
                                            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${manager.enabled
                                                ? 'border border-rose-400/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15'
                                                : 'bg-primary text-slate-950 hover:brightness-105'
                                                } disabled:cursor-not-allowed disabled:opacity-60`}
                                        >
                                            {busyManagerId === manager.id
                                                ? 'Saving...'
                                                : manager.enabled
                                                    ? 'Disable'
                                                    : 'Enable'}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <EmptyState message="No managers added yet." />
                )}
            </section>

            {selectedManager && (
                <ManagerDetailPanel
                    manager={selectedManager}
                    onClose={() => setSelectedManagerId('')}
                    onOpenUser={onOpenUser}
                    onToggleAccess={handleToggleAccess}
                    isBusy={busyManagerId === selectedManager.id}
                />
            )}
        </div>
    );
}
