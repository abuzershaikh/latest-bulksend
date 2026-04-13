import { fetchManagerAccess } from './managerApi';

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function normalizeManagerEmail(value) {
    return cleanText(value).toLowerCase();
}

export { fetchManagerAccess };
