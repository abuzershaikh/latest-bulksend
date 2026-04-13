import { auth } from '../firebase';
import { buildUsers } from './adminData';

const API_BASE_URL = (import.meta.env.VITE_MANAGER_API_BASE_URL || '').replace(/\/+$/, '');

export class ManagerApiError extends Error {
    constructor(message, status = 0, details = null) {
        super(message);
        this.name = 'ManagerApiError';
        this.status = status;
        this.details = details;
    }
}

function getRequestUrl(path) {
    return `${API_BASE_URL}${path}`;
}

function getCurrentUser(providedUser) {
    return providedUser || auth.currentUser;
}

async function getAuthToken(providedUser) {
    const currentUser = getCurrentUser(providedUser);
    if (!currentUser) {
        throw new ManagerApiError('Please sign in again.', 401, { code: 'auth_required' });
    }

    return currentUser.getIdToken();
}

async function request(path, { method = 'GET', body, user } = {}) {
    const token = await getAuthToken(user);
    const targetPath = getRequestUrl(path);

    const response = await fetch(targetPath, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok || payload?.success === false) {
        throw new ManagerApiError(
            payload?.error || `Manager API request failed with status ${response.status}.`,
            response.status,
            payload?.details || null,
        );
    }

    return payload || {};
}

function buildUsersFromPayload(payload) {
    return buildUsers(payload.emailDocs || [], payload.detailDocs || []);
}

export async function lookupManagerAccessByEmail(email) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) return null;

    try {
        const response = await fetch(
            getRequestUrl(`/health/manager-lookup?email=${encodeURIComponent(normalizedEmail)}`),
        );

        let payload = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok || payload?.success === false) {
            return null;
        }

        return {
            exists: Boolean(payload.directExists || payload.queryExists),
            enabled: payload.directEnabled ?? payload.queryEnabled ?? false,
            name: payload.directName || payload.queryName || normalizedEmail.split('@')[0] || 'Manager',
            email: normalizedEmail,
        };
    } catch {
        return null;
    }
}

export async function fetchManagerAccess(user) {
    const payload = await request('/api/manager/access', { user });
    return payload.manager || null;
}

export async function searchManagerUsers(queryText) {
    const cleanQuery = queryText.trim();
    if (cleanQuery.length < 2) return [];

    const payload = await request(`/api/manager/search?q=${encodeURIComponent(cleanQuery)}`);
    return buildUsersFromPayload(payload);
}

export async function fetchManagerCustomers() {
    const payload = await request('/api/manager/customers');
    return {
        manager: payload.manager || null,
        users: buildUsersFromPayload(payload),
    };
}

export async function fetchManagerAffiliateDashboard() {
    const payload = await request('/api/manager/affiliate');
    return {
        manager: payload.manager || null,
        affiliate: payload.affiliate || null,
        referredUsers: Array.isArray(payload.referredUsers) ? payload.referredUsers : [],
        installHistory: Array.isArray(payload.installHistory) ? payload.installHistory : [],
    };
}

export async function activateManagerUserPlan(user, { planType, paymentMethod, reference, customerPaymentReceived }) {
    const payload = await request('/api/manager/activate', {
        method: 'POST',
        body: {
            user,
            planType,
            paymentMethod,
            reference,
            customerPaymentReceived: customerPaymentReceived === true,
        },
    });

    return {
        manager: payload.manager || null,
        user: buildUsersFromPayload(payload)[0] || null,
        startMillis: payload.startMillis || null,
        endMillis: payload.endMillis || null,
        planPricePaise: payload.planPricePaise || 0,
        activationCostPaise: payload.activationCostPaise || 0,
    };
}

export async function createManagerWalletOrder({ amountPaise, planType, minimumAmountPaise, note }) {
    const payload = await request('/api/manager/wallet/order', {
        method: 'POST',
        body: {
            amountPaise,
            planType,
            minimumAmountPaise,
            note,
        },
    });

    return {
        manager: payload.manager || null,
        keyId: payload.razorpay?.keyId || '',
        order: payload.order || null,
    };
}

export async function verifyManagerWalletPayment({ orderId, paymentId, signature }) {
    const payload = await request('/api/manager/wallet/verify', {
        method: 'POST',
        body: {
            orderId,
            paymentId,
            signature,
        },
    });

    return {
        manager: payload.manager || null,
        order: payload.order || null,
        transaction: payload.transaction || null,
    };
}
