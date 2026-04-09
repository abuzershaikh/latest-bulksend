import { Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const MANAGER_COLLECTION = 'affiliateManagers';

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function normalizeManagerEmail(value) {
    return cleanText(value).toLowerCase();
}

export function getManagerDocId(email) {
    return normalizeManagerEmail(email);
}

export function getManagerRef(email) {
    const docId = getManagerDocId(email);
    return docId ? doc(db, MANAGER_COLLECTION, docId) : null;
}

export async function saveManagerAccount({ name, email, enabled = true }, actor = {}) {
    const normalizedEmail = normalizeManagerEmail(email);
    if (!normalizedEmail) {
        throw new Error('Manager email is required.');
    }

    const now = Timestamp.now();
    const displayName = cleanText(name) || normalizedEmail.split('@')[0] || 'Manager';
    const ref = doc(db, MANAGER_COLLECTION, normalizedEmail);

    await setDoc(
        ref,
        {
            name: displayName,
            email: normalizedEmail,
            enabled: Boolean(enabled),
            createdAt: now,
            createdByName: cleanText(actor.name),
            createdByEmail: normalizeManagerEmail(actor.email),
            createdByUid: cleanText(actor.uid),
            updatedAt: now,
            updatedByName: cleanText(actor.name),
            updatedByEmail: normalizeManagerEmail(actor.email),
            updatedByUid: cleanText(actor.uid),
        },
        { merge: true },
    );

    return {
        id: normalizedEmail,
        name: displayName,
        email: normalizedEmail,
        enabled: Boolean(enabled),
    };
}

export async function setManagerAccess(manager, enabled, actor = {}) {
    return saveManagerAccount(
        {
            name: manager.name,
            email: manager.email,
            enabled,
        },
        actor,
    );
}

export async function markManagerLastLogin(manager) {
    const normalizedEmail = normalizeManagerEmail(manager.email);
    if (!normalizedEmail) return;

    await setDoc(
        doc(db, MANAGER_COLLECTION, normalizedEmail),
        {
            email: normalizedEmail,
            name: cleanText(manager.name) || normalizedEmail.split('@')[0] || 'Manager',
            lastLoginAt: Timestamp.now(),
            lastLoginName: cleanText(manager.name),
            lastLoginEmail: normalizedEmail,
            lastLoginUid: cleanText(manager.uid),
            updatedAt: Timestamp.now(),
        },
        { merge: true },
    );
}
