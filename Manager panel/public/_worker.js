const API_ORIGIN = 'https://refer-earn-worker.aawuazer.workers.dev';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/health/')) {
            const upstreamUrl = new URL(`${url.pathname}${url.search}`, API_ORIGIN);
            const headers = new Headers(request.headers);
            headers.set('x-forwarded-host', url.host);
            headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

            const init = {
                method: request.method,
                headers,
                redirect: 'manual',
            };

            if (request.method !== 'GET' && request.method !== 'HEAD') {
                init.body = await request.arrayBuffer();
            }

            return fetch(upstreamUrl, init);
        }

        return env.ASSETS.fetch(request);
    },
};
