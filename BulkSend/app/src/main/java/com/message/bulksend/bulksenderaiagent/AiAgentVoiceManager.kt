package com.message.bulksend.bulksenderaiagent

import android.content.Context
import android.media.MediaPlayer
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.Locale

data class AiAgentVoicePlaybackState(
    val loadingMessageId: String? = null,
    val playingMessageId: String? = null,
    val lastError: String? = null
)

class AiAgentVoiceManager(context: Context) {
    private val appContext = context.applicationContext
    private val client = OkHttpClient()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val audioDir = File(appContext.filesDir, "bulksender_ai_agent_voice").apply { mkdirs() }

    private var playbackJob: Job? = null
    private var mediaPlayer: MediaPlayer? = null

    private val _playbackState = MutableStateFlow(AiAgentVoicePlaybackState())
    val playbackState: StateFlow<AiAgentVoicePlaybackState> = _playbackState.asStateFlow()

    fun speak(messageId: String, request: ChatVoiceRequest, forceRefresh: Boolean = false) {
        playbackJob?.cancel()
        playbackJob = scope.launch {
            stopCurrentPlayback(clearState = false)
            _playbackState.value = AiAgentVoicePlaybackState(loadingMessageId = messageId)

            try {
                val audioFile = withContext(Dispatchers.IO) {
                    getOrFetchAudioFile(request = request, forceRefresh = forceRefresh)
                }

                if (!audioFile.exists() || audioFile.length() == 0L) {
                    throw IllegalStateException("Voice audio file is empty.")
                }

                playFile(messageId = messageId, file = audioFile)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                Log.e(TAG, "Voice playback failed: ${error.message}", error)
                _playbackState.value = AiAgentVoicePlaybackState(
                    lastError = error.message ?: "Voice playback failed."
                )
            }
        }
    }

    fun stop() {
        playbackJob?.cancel()
        stopCurrentPlayback(clearState = true)
    }

    fun release() {
        stop()
    }

    private suspend fun getOrFetchAudioFile(
        request: ChatVoiceRequest,
        forceRefresh: Boolean
    ): File {
        val cacheKey = buildCacheKey(request)
        val audioFile = File(audioDir, "$cacheKey.wav")

        if (!forceRefresh && audioFile.exists() && audioFile.length() > 0L) {
            return audioFile
        }

        val endpoint = if (!request.templateKey.isNullOrBlank()) {
            "${BulksenderAiAgentWorkerConfig.VOICE_BASE_URL}${BulksenderAiAgentWorkerConfig.SPEECH_TEMPLATE_ENDPOINT}"
        } else {
            "${BulksenderAiAgentWorkerConfig.VOICE_BASE_URL}${BulksenderAiAgentWorkerConfig.SPEECH_ENDPOINT}"
        }

        val requestJson = JSONObject().apply {
            put("language", request.language.workerValue())
            put("forceRefresh", forceRefresh)

            if (request.text != null) {
                put("text", request.text)
            }
            if (!request.templateKey.isNullOrBlank()) {
                put("templateKey", request.templateKey)
            }
            if (request.templateData.isNotEmpty()) {
                put("templateData", JSONObject(request.templateData.toSortedMap()))
            }
            if (request.speechStyle.isNotBlank()) {
                put("speechStyle", request.speechStyle)
            }
        }

        val requestBuilder = Request.Builder()
            .url(endpoint)
            .post(requestJson.toString().toRequestBody(JSON_MEDIA_TYPE))
            .header("Content-Type", "application/json")

        BulksenderAiAgentWorkerConfig.VOICE_CLIENT_TOKEN
            .takeIf { it.isNotBlank() }
            ?.let { token ->
                requestBuilder.header("X-ChatsPromo-Client-Token", token)
            }

        val response = client.newCall(requestBuilder.build()).execute()
        val responseBody = response.body?.string().orEmpty()

        if (!response.isSuccessful) {
            throw IllegalStateException(parseErrorMessage(responseBody).ifBlank {
                "Voice worker request failed with ${response.code}."
            })
        }

        val json = JSONObject(responseBody)
        if (!json.optBoolean("success")) {
            throw IllegalStateException(json.optString("error").ifBlank { "Voice worker returned failure." })
        }

        val audioBase64 = json.optString("audio")
        if (audioBase64.isBlank()) {
            throw IllegalStateException("Voice worker returned no audio.")
        }

        val audioBytes = Base64.decode(audioBase64, Base64.DEFAULT)
        audioFile.writeBytes(audioBytes)
        return audioFile
    }

    private fun playFile(messageId: String, file: File) {
        stopCurrentPlayback(clearState = false)

        val player = MediaPlayer().apply {
            setDataSource(file.absolutePath)
            setOnPreparedListener {
                _playbackState.value = AiAgentVoicePlaybackState(playingMessageId = messageId)
                start()
            }
            setOnCompletionListener {
                stopCurrentPlayback(clearState = true)
            }
            setOnErrorListener { _, _, _ ->
                _playbackState.value = AiAgentVoicePlaybackState(
                    lastError = "Voice playback could not be completed."
                )
                stopCurrentPlayback(clearState = false)
                true
            }
            prepareAsync()
        }

        mediaPlayer = player
    }

    private fun stopCurrentPlayback(clearState: Boolean) {
        mediaPlayer?.runCatching {
            stop()
        }
        mediaPlayer?.runCatching {
            reset()
        }
        mediaPlayer?.release()
        mediaPlayer = null

        if (clearState) {
            _playbackState.value = AiAgentVoicePlaybackState()
        }
    }

    private fun buildCacheKey(request: ChatVoiceRequest): String {
        val base = buildString {
            append(request.language.name)
            append("|")
            append(normalize(request.text))
            append("|")
            append(request.templateKey.orEmpty())
            append("|")
            append(request.templateData.toSortedMap().entries.joinToString("&") { "${it.key}=${it.value}" })
            append("|")
            append(request.speechStyle.trim())
        }

        val digest = MessageDigest.getInstance("SHA-256").digest(base.toByteArray())
        return digest.joinToString("") { byte -> "%02x".format(Locale.US, byte) }
    }

    private fun normalize(text: String?): String {
        return text.orEmpty()
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    private fun parseErrorMessage(responseBody: String): String {
        if (responseBody.isBlank()) return ""
        return runCatching {
            JSONObject(responseBody).optString("error")
        }.getOrNull().orEmpty()
    }

    private fun ChatLanguage.workerValue(): String {
        return when (this) {
            ChatLanguage.ENGLISH -> "english"
            ChatLanguage.HINGLISH -> "hinglish"
        }
    }

    companion object {
        private const val TAG = "AiAgentVoiceManager"
        private val JSON_MEDIA_TYPE = "application/json".toMediaType()
    }
}
