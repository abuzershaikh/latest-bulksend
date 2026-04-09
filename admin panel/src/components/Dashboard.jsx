import { useEffect, useMemo, useState } from 'react';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import ActivationsScreen from './ActivationsScreen';
import { BottomNav, StatusBanner, TopBar } from './AdminUi';
import { buildManagers, buildStats, buildUsers, tabs } from './adminData';
import DashboardHome from './DashboardHome';
import ManagersScreen from './ManagersScreen';
import UserDetailPanel from './UserDetailPanel';
import UsersScreen from './UsersScreen';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [emailDocs, setEmailDocs] = useState([]);
    const [detailDocs, setDetailDocs] = useState([]);
    const [managerDocs, setManagerDocs] = useState([]);
    const [loading, setLoading] = useState({ email: true, details: true, managers: true });
    const [errors, setErrors] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        const unsubscribeEmailData = onSnapshot(
            collection(db, 'email_data'),
            (snapshot) => {
                setEmailDocs(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
                setErrors((current) => ({ ...current, email: '' }));
                setLoading((current) => ({ ...current, email: false }));
            },
            (error) => {
                console.error('Error fetching email_data:', error);
                setErrors((current) => ({ ...current, email: error.message }));
                setLoading((current) => ({ ...current, email: false }));
            },
        );

        const unsubscribeUserDetails = onSnapshot(
            collection(db, 'userDetails'),
            (snapshot) => {
                setDetailDocs(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
                setErrors((current) => ({ ...current, details: '' }));
                setLoading((current) => ({ ...current, details: false }));
            },
            (error) => {
                console.error('Error fetching userDetails:', error);
                setErrors((current) => ({ ...current, details: error.message }));
                setLoading((current) => ({ ...current, details: false }));
            },
        );

        const unsubscribeManagers = onSnapshot(
            collection(db, 'affiliateManagers'),
            (snapshot) => {
                setManagerDocs(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
                setErrors((current) => ({ ...current, managers: '' }));
                setLoading((current) => ({ ...current, managers: false }));
            },
            (error) => {
                console.error('Error fetching affiliateManagers:', error);
                setErrors((current) => ({ ...current, managers: error.message }));
                setLoading((current) => ({ ...current, managers: false }));
            },
        );

        return () => {
            unsubscribeEmailData();
            unsubscribeUserDetails();
            unsubscribeManagers();
        };
    }, []);

    const users = useMemo(() => buildUsers(emailDocs, detailDocs), [emailDocs, detailDocs]);
    const managers = useMemo(() => buildManagers(managerDocs, users), [managerDocs, users]);
    const stats = useMemo(() => buildStats(users), [users]);
    const selectedUser = useMemo(
        () => users.find((user) => user.id === selectedUserId) || null,
        [selectedUserId, users],
    );
    const isLoading = loading.email || loading.details || loading.managers;
    const visibleErrors = Object.values(errors).filter(Boolean);

    const handleLogout = () => {
        signOut(auth);
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white">
            <TopBar
                activeTab={activeTab}
                tabs={tabs}
                onTabChange={setActiveTab}
                onLogout={handleLogout}
            />

            <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
                <StatusBanner errors={visibleErrors} isLoading={isLoading} />

                {activeTab === 'dashboard' && (
                    <DashboardHome
                        stats={stats}
                        users={users}
                        isLoading={isLoading}
                        onOpenUser={(user) => setSelectedUserId(user.id)}
                        onOpenUsers={() => setActiveTab('users')}
                    />
                )}

                {activeTab === 'users' && (
                    <UsersScreen
                        users={users}
                        isLoading={isLoading}
                        onOpenUser={(user) => setSelectedUserId(user.id)}
                    />
                )}

                {activeTab === 'activations' && (
                    <ActivationsScreen
                        users={users}
                        isLoading={isLoading}
                        onOpenUser={(user) => setSelectedUserId(user.id)}
                    />
                )}

                {activeTab === 'managers' && (
                    <ManagersScreen
                        managers={managers}
                        isLoading={isLoading}
                        onOpenUser={(user) => setSelectedUserId(user.id)}
                    />
                )}
            </main>

            <BottomNav activeTab={activeTab} tabs={tabs} onTabChange={setActiveTab} />

            {selectedUser && (
                <UserDetailPanel
                    key={selectedUser.id}
                    user={selectedUser}
                    onClose={() => setSelectedUserId(null)}
                />
            )}
        </div>
    );
}
