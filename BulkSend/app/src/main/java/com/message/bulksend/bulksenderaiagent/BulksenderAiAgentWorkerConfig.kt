package com.message.bulksend.bulksenderaiagent

import com.message.bulksend.BuildConfig

object BulksenderAiAgentWorkerConfig {
    private val chatWorkerUrl = BuildConfig.CHATSPROMO_WORKER_URL.ifBlank {
        "https://bulksender-ai-agent.aawuazer.workers.dev"
    }
    private val voiceWorkerUrl = BuildConfig.VOICE_WORKER_URL.ifBlank {
        "https://gemini-voice-cache-worker.aawuazer.workers.dev"
    }

    const val CHAT_ENDPOINT = "chat"
    const val SPEECH_ENDPOINT = "speech"
    const val SPEECH_TEMPLATE_ENDPOINT = "speech/template"

    val BASE_URL = "$chatWorkerUrl/"
    val VOICE_BASE_URL = "$voiceWorkerUrl/"
    val CHAT_CLIENT_TOKEN = BuildConfig.CHATSPROMO_WORKER_CLIENT_TOKEN
    val VOICE_CLIENT_TOKEN = BuildConfig.VOICE_WORKER_CLIENT_TOKEN
}
