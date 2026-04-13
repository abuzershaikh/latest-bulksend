import { useEffect, useState } from 'react';
import ActivationsScreen from './ActivationsScreen';
import AffiliateScreen from './AffiliateScreen';
import { BottomNav, StatusBanner, TopBar } from './AdminUi';
import { tabs } from './adminData';
import {
    fetchManagerAffiliateDashboard,
    fetchManagerCustomers,
    ManagerApiError,
    searchManagerUsers,
} from './managerApi';
import UserDetailPanel from './UserDetailPanel';
import UsersScreen from './UsersScreen';

export default function Dashboard({ manager, onLogout, onAccessRevoked }) {
    const [activeTab, setActiveTab] = useState('search');
    const [managerState, setManagerState] = useState(manager);
    const [selectedUser, setSelectedUser] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [customersLoading, setCustomersLoading] = useState(true);
    const [customersError, setCustomersError] = useState('');
    const [affiliate, setAffiliate] = useState(null);
    const [affiliateUsers, setAffiliateUsers] = useState([]);
    const [installHistory, setInstallHistory] = useState([]);
    const [affiliateLoading, setAffiliateLoading] = useState(true);
    const [affiliateError, setAffiliateError] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');

    useEffect(() => {
        setManagerState(manager);
    }, [manager]);

    useEffect(() => {
        let cancelled = false;

        async function loadCustomers() {
            setCustomersLoading(true);
            setCustomersError('');

            try {
                const payload = await fetchManagerCustomers();
                if (cancelled) return;

                if (payload.manager) {
                    setManagerState((current) => ({ ...(current || {}), ...payload.manager }));
                }

                setCustomers(sortUsers(payload.users || []));
            } catch (error) {
                if (cancelled) return;

                if (isAccessError(error)) {
                    onAccessRevoked?.(error);
                    return;
                }

                setCustomersError(error instanceof Error ? error.message : 'Unable to load your customers.');
            } finally {
                if (!cancelled) {
                    setCustomersLoading(false);
                }
            }
        }

        loadCustomers();

        return () => {
            cancelled = true;
        };
    }, [manager.email, onAccessRevoked]);

    useEffect(() => {
        let cancelled = false;

        async function loadAffiliateDashboard() {
            setAffiliateLoading(true);
            setAffiliateError('');

            try {
                const payload = await fetchManagerAffiliateDashboard();
                if (cancelled) return;

                if (payload.manager) {
                    setManagerState((current) => ({ ...(current || {}), ...payload.manager }));
                }

                setAffiliate(payload.affiliate || null);
                setAffiliateUsers(Array.isArray(payload.referredUsers) ? payload.referredUsers : []);
                setInstallHistory(Array.isArray(payload.installHistory) ? payload.installHistory : []);
            } catch (error) {
                if (cancelled) return;

                if (isAccessError(error)) {
                    onAccessRevoked?.(error);
                    return;
                }

                setAffiliate(null);
                setAffiliateUsers([]);
                setInstallHistory([]);
                setAffiliateError(error instanceof Error ? error.message : 'Unable to load affiliate stats.');
            } finally {
                if (!cancelled) {
                    setAffiliateLoading(false);
                }
            }
        }

        loadAffiliateDashboard();

        return () => {
            cancelled = true;
        };
    }, [manager.email, onAccessRevoked]);

    useEffect(() => {
        const cleanQuery = searchQuery.trim();
        if (cleanQuery.length < 2) {
            setSearchResults([]);
            setSearchError('');
            setSearchLoading(false);
            return undefined;
        }

        let cancelled = false;
        setSearchLoading(true);
        setSearchError('');

        async function runSearch() {
            try {
                const users = await searchManagerUsers(cleanQuery);
                if (cancelled) return;
                setSearchResults(sortUsers(users));
            } catch (error) {
                if (cancelled) return;

                if (isAccessError(error)) {
                    onAccessRevoked?.(error);
                    return;
                }

                setSearchResults([]);
                setSearchError(error instanceof Error ? error.message : 'Unable to search users right now.');
            } finally {
                if (!cancelled) {
                    setSearchLoading(false);
                }
            }
        }

        runSearch();

        return () => {
            cancelled = true;
        };
    }, [onAccessRevoked, searchQuery]);

    const handleUserUpdated = (updatedUser) => {
        if (!updatedUser) return;

        setSelectedUser(updatedUser);
        setSearchResults((current) => upsertUser(current, updatedUser));
        setCustomers((current) => {
            if (updatedUser.managerEmail !== managerState.email) {
                return current.filter((user) => user.id !== updatedUser.id);
            }

            return upsertUser(current, updatedUser);
        });
    };

    const handleManagerUpdated = (updatedManager) => {
        if (!updatedManager) return;
        setManagerState((current) => ({ ...(current || {}), ...updatedManager }));
    };

    const handleSearchSubmit = (queryValue = searchInput) => {
        const cleanQuery = queryValue.trim();
        setSearchInput(queryValue);
        setSearchError('');

        if (cleanQuery.length < 2) {
            setSearchQuery('');
            setSearchResults([]);
            return;
        }

        setSearchQuery(cleanQuery);
    };

    const visibleErrors = [customersError, affiliateError, searchError].filter(Boolean);

    return (
        <div className="min-h-screen bg-dark-900 text-white">
            <TopBar
                activeTab={activeTab}
                tabs={tabs}
                onTabChange={setActiveTab}
                onLogout={onLogout}
                manager={managerState}
            />

            <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-6 md:pb-10 md:pt-8">
                <StatusBanner errors={visibleErrors} isLoading={customersLoading || affiliateLoading} />
                {activeTab === 'affiliate' && (
                    <AffiliateScreen
                        manager={managerState}
                        affiliate={affiliate}
                        referredUsers={affiliateUsers}
                        installHistory={installHistory}
                        isLoading={affiliateLoading}
                    />
                )}

                {activeTab === 'search' && (
                    <UsersScreen
                        queryText={searchInput}
                        activeQuery={searchQuery}
                        onQueryChange={setSearchInput}
                        onSearchSubmit={handleSearchSubmit}
                        results={searchResults}
                        isLoading={searchLoading}
                        error={searchError}
                        onOpenUser={setSelectedUser}
                    />
                )}

                {activeTab === 'customers' && (
                    <ActivationsScreen
                        customers={customers}
                        isLoading={customersLoading}
                        onOpenUser={setSelectedUser}
                    />
                )}
            </main>

            <BottomNav activeTab={activeTab} tabs={tabs} onTabChange={setActiveTab} />

            {selectedUser && (
                <UserDetailPanel
                    key={selectedUser.id}
                    user={selectedUser}
                    manager={managerState}
                    onClose={() => setSelectedUser(null)}
                    onUserUpdated={handleUserUpdated}
                    onManagerUpdated={handleManagerUpdated}
                    onAccessRevoked={onAccessRevoked}
                />
            )}
        </div>
    );
}

function isAccessError(error) {
    return error instanceof ManagerApiError && (error.status === 401 || error.status === 403);
}

function upsertUser(users, updatedUser) {
    return sortUsers([
        updatedUser,
        ...users.filter((user) => user.id !== updatedUser.id),
    ]);
}

function sortUsers(users) {
    return [...users].sort((a, b) => {
        const bDate = b.managerActivatedMillis || b.activationMillis || b.joinedMillis || 0;
        const aDate = a.managerActivatedMillis || a.activationMillis || a.joinedMillis || 0;
        return bDate - aDate;
    });
}
