import { getPlanLabel, isKnownPlan } from './planConfig';

export const tabs = [
    { id: 'search', label: 'Search' },
    { id: 'customers', label: 'My Customers' },
];

const numberFormatter = new Intl.NumberFormat('en-IN');
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export function toMillis(value) {
    if (!value) return null;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return null;
}

export function formatDate(value, withTime = false) {
    const millis = typeof value === 'number' ? value : toMillis(value);
    if (!millis) return 'Not recorded';
    return (withTime ? dateTimeFormatter : dateFormatter).format(new Date(millis));
}

export function formatCount(value) {
    if (value === undefined || value === null || value === '') return '-';
    if (Number(value) >= 999999) return 'Unlimited';
    return numberFormatter.format(Number(value));
}

export function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function shortToken(value) {
    const token = cleanText(value);
    if (!token) return '';
    if (token.length <= 18) return token;
    return `${token.slice(0, 9)}...${token.slice(-6)}`;
}

function normalizeEmail(value) {
    return cleanText(value).toLowerCase();
}

function formatPlan(value) {
    const cleanValue = cleanText(value).toLowerCase();
    if (!cleanValue) return 'Free';
    if (isKnownPlan(cleanValue)) return getPlanLabel(cleanValue);

    return cleanValue
        .replace(/^aiagent/i, 'AI Agent ')
        .replace(/\bai\b/g, 'AI')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function resolvePaymentMethod(data) {
    const method = cleanText(data.paymentMethod || data.lastPaymentMethod).toLowerCase();

    if (method.includes('razor')) return { id: 'razorpay', label: 'Razorpay' };
    if (method.includes('google') || method.includes('play')) {
        return { id: 'google_play', label: 'Google Play' };
    }
    if (method.includes('manager')) {
        return { id: 'manager_panel', label: 'Manager Panel' };
    }
    if (method.includes('admin') || method.includes('manual')) {
        return { id: 'admin_panel', label: 'Admin Panel' };
    }
    if (data.lastPaymentId) return { id: 'razorpay', label: 'Razorpay' };
    if (data.lastOrderId || data.lastPurchaseToken) {
        return { id: 'google_play', label: 'Google Play' };
    }

    return { id: 'unknown', label: 'Not recorded' };
}

function resolveStatus(data) {
    const type = cleanText(data.subscriptionType).toLowerCase();
    const userStatus = cleanText(data.userStatus).toLowerCase();
    const plan = cleanText(data.planType || data.purchasedPlanType).toLowerCase();
    const hasPremiumClaim = type === 'premium' || userStatus === 'purchased';
    const endMillis = toMillis(data.subscriptionEndDate);
    const isLifetime = plan.includes('lifetime');
    const isExpired = hasPremiumClaim && !isLifetime && endMillis && endMillis < Date.now();

    if (isExpired) return 'expired';
    if (hasPremiumClaim) return 'paid';
    return 'free';
}

export function buildUsers(emailDocs, detailDocs) {
    const records = new Map();
    const keyByUserId = new Map();
    const keyByEmail = new Map();

    emailDocs.forEach(({ id, data }) => {
        const email = normalizeEmail(data.email || id);
        const userId = cleanText(data.userId);
        const key = userId || email || id;
        const previous = records.get(key) || {};

        records.set(key, { ...previous, emailDocId: id, emailData: data });
        if (userId) keyByUserId.set(userId, key);
        if (email) keyByEmail.set(email, key);
    });

    detailDocs.forEach(({ id, data }) => {
        const email = normalizeEmail(data.email);
        const userId = cleanText(data.userId || id);
        const key = keyByUserId.get(userId) || keyByEmail.get(email) || userId || email || id;
        const previous = records.get(key) || {};

        records.set(key, { ...previous, detailDocId: id, detailData: data });
        if (userId) keyByUserId.set(userId, key);
        if (email) keyByEmail.set(email, key);
    });

    return Array.from(records.entries()).map(([key, record]) => normalizeUser(key, record))
        .sort((a, b) => {
            const bDate = b.activationMillis || b.joinedMillis || 0;
            const aDate = a.activationMillis || a.joinedMillis || 0;
            return bDate - aDate;
        });
}

function normalizeUser(key, record) {
    const data = { ...(record.emailData || {}), ...(record.detailData || {}) };
    const emailData = record.emailData || {};
    const detailData = record.detailData || {};
    const paymentMethod = resolvePaymentMethod(data);
    const status = resolveStatus(data);
    const email = cleanText(detailData.email || emailData.email || record.emailDocId);
    const fallbackName = email ? email.split('@')[0] : 'User';

    return {
        id: key,
        userId: cleanText(data.userId || record.detailDocId),
        emailDocId: cleanText(record.emailDocId || email),
        detailDocId: cleanText(record.detailDocId || data.userId),
        name: cleanText(detailData.fullName || emailData.displayName || data.name) || fallbackName,
        email: email || 'No email',
        phone: cleanText(detailData.phoneNumber || data.phoneNumber || data.mobileNumber || data.phone) || 'No number',
        businessName: cleanText(detailData.businessName || data.businessName),
        country: cleanText(detailData.country || data.country),
        status,
        plan: formatPlan(data.planType || data.purchasedPlanType),
        rawPlan: cleanText(data.planType || data.purchasedPlanType),
        paymentMethod,
        activationMillis: toMillis(data.lastPaymentDate || data.subscriptionStartDate),
        joinedMillis: toMillis(data.firstSignupDate || data.timestamp || data.createdAt),
        endMillis: toMillis(data.subscriptionEndDate),
        lastSeenMillis: toMillis(data.lastSeen || data.lastLoginDate),
        accountState: cleanText(data.accountState || data.userStatus || 'active'),
        isActive: data.isActive !== false && data.accountState !== 'suspended',
        contactsUsed: data.currentContactsCount,
        contactsLimit: data.contactsLimit,
        groupsUsed: data.currentGroupsCount,
        groupsLimit: data.groupsLimit,
        lastOrderId: cleanText(data.lastOrderId),
        lastPaymentId: cleanText(data.lastPaymentId),
        lastPurchaseToken: cleanText(data.lastPurchaseToken),
        activatedByRole: cleanText(data.activatedByRole),
        activatedByName: cleanText(data.activatedByName),
        activatedByEmail: cleanText(data.activatedByEmail),
        managerName: cleanText(data.managerName),
        managerEmail: normalizeEmail(data.managerEmail),
        managerUid: cleanText(data.managerUid),
        managerActivatedMillis: toMillis(data.managerActivatedAt),
        sourceCollections: [
            record.emailData ? 'email_data' : '',
            record.detailData ? 'userDetails' : '',
        ].filter(Boolean).join(' + '),
    };
}

export function statusLabel(status) {
    if (status === 'paid') return 'Paid';
    if (status === 'expired') return 'Expired';
    return 'Free';
}

export function statusBadgeClass(status) {
    if (status === 'paid') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40';
    if (status === 'expired') return 'bg-amber-500/15 text-amber-100 border-amber-400/40';
    return 'bg-slate-500/15 text-slate-200 border-slate-400/30';
}

export function methodBadgeClass(methodId) {
    if (methodId === 'razorpay') return 'bg-orange-500/15 text-orange-100 border-orange-400/40';
    if (methodId === 'google_play') return 'bg-emerald-500/15 text-emerald-100 border-emerald-400/40';
    if (methodId === 'manager_panel') return 'bg-cyan-500/15 text-cyan-100 border-cyan-400/40';
    if (methodId === 'admin_panel') return 'bg-sky-500/15 text-sky-100 border-sky-400/40';
    return 'bg-slate-500/15 text-slate-200 border-slate-400/30';
}
