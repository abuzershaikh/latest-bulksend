/**
 * Cloudflare Worker for BulkSender AI Agent.
 * Accepts chat requests from the Android app and proxies them to Gemini.
 */

const ALLOWED_ACTIONS = new Set(["ADD_CONTACT", "SHOW_CHIPS", "SHOW_GROUPS", "NONE"]);
const BULK_SEND_CHAT_MODEL = "gemini-2.0-flash";
const CHATSPROMO_DEFAULT_MODEL = "gemini-2.5-flash";
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-ChatsPromo-Client-Token"
};

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
        }
    });
}

function rawJsonResponse(body, status = 200) {
    return new Response(body, {
        status,
        headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json"
        }
    });
}

function getGeminiApiKey(env) {
    return typeof env.GEMINI_API_KEY === "string" ? env.GEMINI_API_KEY.trim() : "";
}

function getChatsPromoClientToken(env) {
    return typeof env.CHATSPROMO_WORKER_CLIENT_TOKEN === "string"
        ? env.CHATSPROMO_WORKER_CLIENT_TOKEN.trim()
        : "";
}

function isChatsPromoAuthorized(request, env) {
    const requiredToken = getChatsPromoClientToken(env);
    if (!requiredToken) {
        return true;
    }

    return request.headers.get("X-ChatsPromo-Client-Token") === requiredToken;
}

function resolveChatsPromoModel(env, requestedModel) {
    const configuredModel = typeof env.CHATSPROMO_GEMINI_MODEL === "string"
        ? env.CHATSPROMO_GEMINI_MODEL.trim()
        : "";
    const cleanRequestedModel = typeof requestedModel === "string"
        ? requestedModel.trim()
        : "";

    if (!cleanRequestedModel || cleanRequestedModel.toLowerCase() === "chatspromo-v1") {
        return configuredModel || CHATSPROMO_DEFAULT_MODEL;
    }

    return cleanRequestedModel.replace(/^models\//, "");
}

async function callGeminiGenerateContent({ apiKey, model, payload }) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }
    );
    const responseText = await response.text();
    return rawJsonResponse(responseText, response.status);
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .slice(-10)
        .map((item) => {
            const role = item?.role === "model" ? "model" : "user";
            const text = Array.isArray(item?.parts)
                ? item.parts
                    .map((part) => (typeof part?.text === "string" ? part.text.trim() : ""))
                    .filter(Boolean)
                    .join("\n")
                : "";

            if (!text) {
                return null;
            }

            return {
                role,
                parts: [{ text }]
            };
        })
        .filter(Boolean);
}

function extractJsonObject(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error("No JSON object found in Gemini response.");
    }

    return JSON.parse(match[0]);
}

function normalizeAction(action) {
    return ALLOWED_ACTIONS.has(action) ? action : "NONE";
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const geminiApiKey = getGeminiApiKey(env);

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
            return jsonResponse({
                ok: true,
                service: "bulksender-ai-agent",
                endpoint: "/chat"
            });
        }

        if (request.method === "GET" && url.pathname === "/chatspromo/status") {
            if (!isChatsPromoAuthorized(request, env)) {
                return jsonResponse(
                    {
                        success: false,
                        model: resolveChatsPromoModel(env),
                        message: "Unauthorized"
                    },
                    401
                );
            }

            const model = resolveChatsPromoModel(env);
            return jsonResponse({
                success: Boolean(geminiApiKey),
                model,
                message: geminiApiKey
                    ? "ChatsPromo worker ready"
                    : "GEMINI_API_KEY is not configured."
            });
        }

        if (request.method !== "POST") {
            return jsonResponse({ error: "Method Not Allowed" }, 405);
        }

        if (url.pathname === "/chatspromo/generate-content") {
            if (!isChatsPromoAuthorized(request, env)) {
                return jsonResponse({ error: "Unauthorized" }, 401);
            }

            if (!geminiApiKey) {
                return jsonResponse({ error: "GEMINI_API_KEY is not configured." }, 500);
            }

            try {
                const body = await request.json();
                const payload = body?.payload && typeof body.payload === "object"
                    ? body.payload
                    : null;

                if (!payload) {
                    return jsonResponse({ error: "payload is required." }, 400);
                }

                return await callGeminiGenerateContent({
                    apiKey: geminiApiKey,
                    model: resolveChatsPromoModel(env, body?.model),
                    payload
                });
            } catch (error) {
                return jsonResponse(
                    {
                        error: error instanceof Error ? error.message : "Unknown worker error."
                    },
                    500
                );
            }
        }

        if (url.pathname !== "/" && url.pathname !== "/chat") {
            return jsonResponse({ error: "Not Found" }, 404);
        }

        if (!geminiApiKey) {
            return jsonResponse({ error: "GEMINI_API_KEY is not configured." }, 500);
        }

        try {
            const body = await request.json();
            const message = typeof body?.message === "string" ? body.message.trim() : "";
            const history = sanitizeHistory(body?.history);
            const plan = body?.plan === "premium" ? "premium" : "free";

            if (!message) {
                return jsonResponse({ error: "Message is required." }, 400);
            }

            const systemPrompt = [
                "You are the AI assistant for the BulkSend WhatsApp marketing app.",
                "Always reply in simple Hinglish.",
                "Guide the user step-by-step to create or continue a WhatsApp bulk messaging campaign.",
                "If contacts are not added yet, ask the user to use the Add Contact Now button first.",
                "After contacts are added, ask whether they want Proceed with Old Contacts or Create New Group.",
                `Current user plan: ${plan}.`,
                "If the plan is free, remind them they can send up to 10 messages.",
                "If the plan is premium, remind them they have unlimited sending.",
                "Do not give technical details unless the user asks.",
                "Return valid JSON only with keys reply, action, and context.",
                "Allowed action values are ADD_CONTACT, SHOW_CHIPS, SHOW_GROUPS, and NONE."
            ].join("\n");

            const geminiPayload = {
                contents: [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    ...history,
                    { role: "user", parts: [{ text: message }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            };

            const model = BULK_SEND_CHAT_MODEL;
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(geminiPayload)
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                return jsonResponse(
                    {
                        error: "Gemini API request failed.",
                        details: errorText
                    },
                    502
                );
            }

            const data = await response.json();
            const aiText = data?.candidates?.[0]?.content?.parts
                ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
                .join("")
                .trim();

            if (!aiText) {
                return jsonResponse({ error: "Gemini returned an empty response." }, 502);
            }

            let result;
            try {
                result = JSON.parse(aiText);
            } catch {
                try {
                    result = extractJsonObject(aiText);
                } catch {
                    result = {
                        reply: aiText,
                        action: "NONE",
                        context: null
                    };
                }
            }

            return jsonResponse({
                reply: typeof result?.reply === "string" && result.reply.trim()
                    ? result.reply.trim()
                    : aiText,
                action: normalizeAction(result?.action),
                context: typeof result?.context === "string" ? result.context : null
            });
        } catch (error) {
            return jsonResponse(
                {
                    error: error instanceof Error ? error.message : "Unknown worker error."
                },
                500
            );
        }
    }
};
