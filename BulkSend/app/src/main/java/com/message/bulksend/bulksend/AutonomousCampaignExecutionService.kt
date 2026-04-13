package com.message.bulksend.bulksend

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import com.message.bulksend.R
import com.message.bulksend.bulksend.textcamp.computeNextRetryPlan
import com.message.bulksend.db.AppDatabase
import com.message.bulksend.db.AutonomousSendQueueEntity
import com.message.bulksend.db.Campaign
import com.message.bulksend.utils.CampaignAutoSendManager
import com.message.bulksend.utils.isAccessibilityServiceEnabled
import com.message.bulksend.utils.isPackageInstalled
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URLEncoder
import java.util.Collections
import kotlin.math.abs

class AutonomousCampaignExecutionService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + Job())
    private var wakeLock: PowerManager.WakeLock? = null

    @Suppress("DEPRECATION")
    private var keyguardLock: KeyguardManager.KeyguardLock? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        val campaignId = intent?.getStringExtra(EXTRA_CAMPAIGN_ID)
        val source = intent?.getStringExtra(EXTRA_TRIGGER_SOURCE).orEmpty().ifBlank { SOURCE_UNKNOWN }

        if (action != ACTION_EXECUTE_AUTONOMOUS_CAMPAIGN || campaignId.isNullOrBlank()) {
            stopSelf(startId)
            return START_NOT_STICKY
        }

        if (!acquireExecutionSlot(campaignId)) {
            Log.w(TAG, "Duplicate autonomous execution ignored for campaign=$campaignId source=$source")
            stopSelf(startId)
            return START_NOT_STICKY
        }

        startForeground(
            notificationIdFor(campaignId),
            createNotification(campaignId, "Preparing autonomous campaign...")
        )

        serviceScope.launch {
            try {
                executeCampaign(campaignId)
            } finally {
                cleanupAutomationState()
                releaseWakeLock()
                releaseExecutionSlot(campaignId)
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf(startId)
            }
        }

        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        cleanupAutomationState()
        releaseWakeLock()
        super.onDestroy()
    }

    private suspend fun executeCampaign(campaignId: String) {
        val appContext = applicationContext
        val database = AppDatabase.getInstance(appContext)
        val campaignDao = database.campaignDao()
        val queueDao = database.autonomousSendQueueDao()
        val scheduler = AutonomousCampaignScheduler(appContext)

        val campaign = campaignDao.getCampaignById(campaignId)
        if (campaign == null) {
            Log.e(TAG, "Campaign not found: $campaignId")
            scheduler.cancel(campaignId)
            AutonomousCampaignConfigStore.clearConfig(appContext, campaignId)
            return
        }

        if (campaign.isStopped) {
            Log.d(TAG, "Campaign already stopped: $campaignId")
            scheduler.cancel(campaignId)
            return
        }

        val nextEntry = queueDao.getNextQueued(campaignId)
        if (nextEntry == null) {
            markCampaignCompleted(campaignDao, scheduler, campaign)
            return
        }

        val now = System.currentTimeMillis()
        if (nextEntry.plannedTimeMillis > now + SEND_WINDOW_GRACE_MS) {
            scheduler.scheduleNextExecution(campaignId, nextEntry.plannedTimeMillis)
            updateNotification(campaignId, "Next send scheduled at ${formatTime(nextEntry.plannedTimeMillis)}")
            return
        }

        val config = AutonomousCampaignConfigStore.getConfig(appContext, campaignId)
        if (config == null) {
            pauseCampaign(
                campaignDao = campaignDao,
                scheduler = scheduler,
                campaign = campaign,
                reason = "Campaign configuration is missing"
            )
            return
        }

        if (!isAccessibilityServiceEnabled(appContext)) {
            pauseCampaign(
                campaignDao = campaignDao,
                scheduler = scheduler,
                campaign = campaign,
                reason = "Accessibility permission is off"
            )
            return
        }

        val resolvedPackage = resolveTargetPackage(config.whatsAppPreference)
        if (resolvedPackage == null) {
            pauseCampaign(
                campaignDao = campaignDao,
                scheduler = scheduler,
                campaign = campaign,
                reason = "WhatsApp app is not installed"
            )
            return
        }

        var currentEntry: AutonomousSendQueueEntity = nextEntry
        var sendsHandledInRun = 0

        while (true) {
            val entryNow = System.currentTimeMillis()
            if (currentEntry.plannedTimeMillis > entryNow) {
                delay(currentEntry.plannedTimeMillis - entryNow)
            }

            val updatedCampaign = (campaignDao.getCampaignById(campaignId) ?: campaign).copy(
                isRunning = true,
                isStopped = false
            )
            campaignDao.upsertCampaign(updatedCampaign)
            updateNotification(campaignId, "Sending to ${currentEntry.contactName}")

            val sendSucceeded = sendQueuedMessage(
                campaign = updatedCampaign,
                queueEntry = currentEntry,
                config = config,
                targetPackage = resolvedPackage,
                campaignDao = campaignDao,
                queueDao = queueDao
            )
            sendsHandledInRun++
            bringCampaignScreenToForeground(
                campaignId = campaignId,
                reason = if (sendSucceeded) "autonomous-send-confirmed" else "autonomous-send-updated"
            )

            val finalCampaign = campaignDao.getCampaignById(campaignId) ?: updatedCampaign
            val nextQueuedAfterAttempt = queueDao.getNextQueued(campaignId)

            if (nextQueuedAfterAttempt == null) {
                markCampaignCompleted(campaignDao, scheduler, finalCampaign)
                return
            }

            if (finalCampaign.isStopped) {
                CampaignAutoSendManager.onCampaignStopped(finalCampaign)
                return
            }

            val nextTriggerAt = nextQueuedAfterAttempt.plannedTimeMillis
                .coerceAtLeast(System.currentTimeMillis() + 1_000L)
            val shouldContinueInline = sendsHandledInRun < MAX_INLINE_SENDS_PER_RUN &&
                nextTriggerAt <= System.currentTimeMillis() + INLINE_FOLLOWUP_WINDOW_MS

            if (shouldContinueInline) {
                updateNotification(campaignId, "Preparing next launch send...")
                currentEntry = nextQueuedAfterAttempt
                continue
            }

            scheduler.scheduleNextExecution(campaignId, nextTriggerAt)
            updateNotification(
                campaignId,
                if (sendSucceeded) {
                    "Queued next send at ${formatTime(nextTriggerAt)}"
                } else {
                    "Retry scheduled at ${formatTime(nextTriggerAt)}"
                }
            )
            return
        }
    }

    private suspend fun sendQueuedMessage(
        campaign: Campaign,
        queueEntry: AutonomousSendQueueEntity,
        config: AutonomousCampaignRuntimeConfig,
        targetPackage: String,
        campaignDao: com.message.bulksend.db.CampaignDao,
        queueDao: com.message.bulksend.db.AutonomousSendQueueDao
    ): Boolean {
        CampaignState.isSendActionSuccessful = null
        CampaignState.sendFailureReason = null
        CampaignState.isAutoSendEnabled = true
        WhatsAppAutoSendService.activateService()

        acquireWakeLock()

        return try {
            val finalNumber = buildFinalNumber(queueEntry.contactNumber, config.countryCode)
            val cleanNumber = finalNumber.replace("+", "")
            val personalizedMessage = campaign.message.replace(
                "#name#",
                queueEntry.contactName,
                ignoreCase = true
            )

            withContext(Dispatchers.Main) {
                if (campaign.mediaPath.isNullOrBlank()) {
                    val encodedMessage = URLEncoder.encode(personalizedMessage, "UTF-8")
                    startActivity(
                        Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://wa.me/$cleanNumber?text=$encodedMessage")
                        ).apply {
                            setPackage(targetPackage)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                    )
                } else {
                    launchTextAndMediaFlow(
                        cleanNumber = cleanNumber,
                        message = personalizedMessage,
                        mediaPath = campaign.mediaPath,
                        targetPackage = targetPackage
                    )
                }
            }

            val confirmationReceived = waitForSendConfirmation()
            val failureReason = when {
                confirmationReceived -> null
                CampaignState.sendFailureReason == CampaignState.FAILURE_NOT_ON_WHATSAPP -> "not_on_whatsapp"
                else -> CampaignState.sendFailureReason ?: "send_failed"
            }

            if (confirmationReceived) {
                campaignDao.updateContactStatus(campaign.id, queueEntry.contactNumber, "sent", null)
                queueDao.updateDeliveryStatus(
                    id = queueEntry.id,
                    status = "sent",
                    retryCount = queueEntry.retryCount,
                    lastError = null,
                    sentTimeMillis = System.currentTimeMillis()
                )
                true
            } else if (queueEntry.retryCount < MAX_RETRY_COUNT) {
                val (nextTime, nextHour) = computeNextRetryPlan(System.currentTimeMillis())
                queueDao.requeueWithNewPlan(
                    id = queueEntry.id,
                    retryCount = queueEntry.retryCount + 1,
                    plannedTimeMillis = nextTime,
                    hourOfDay = nextHour,
                    lastError = failureReason
                )
                false
            } else {
                campaignDao.updateContactStatus(
                    campaign.id,
                    queueEntry.contactNumber,
                    "failed",
                    failureReason
                )
                queueDao.updateDeliveryStatus(
                    id = queueEntry.id,
                    status = "failed",
                    retryCount = queueEntry.retryCount + 1,
                    lastError = failureReason,
                    sentTimeMillis = null
                )
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send queued autonomous message: ${e.message}", e)
            if (queueEntry.retryCount < MAX_RETRY_COUNT) {
                val (nextTime, nextHour) = computeNextRetryPlan(System.currentTimeMillis())
                queueDao.requeueWithNewPlan(
                    id = queueEntry.id,
                    retryCount = queueEntry.retryCount + 1,
                    plannedTimeMillis = nextTime,
                    hourOfDay = nextHour,
                    lastError = e.message ?: "launch_failed"
                )
            } else {
                campaignDao.updateContactStatus(
                    campaign.id,
                    queueEntry.contactNumber,
                    "failed",
                    e.message ?: "launch_failed"
                )
                queueDao.updateDeliveryStatus(
                    id = queueEntry.id,
                    status = "failed",
                    retryCount = queueEntry.retryCount + 1,
                    lastError = e.message ?: "launch_failed",
                    sentTimeMillis = null
                )
            }
            false
        } finally {
            CampaignState.isSendActionSuccessful = null
            CampaignState.sendFailureReason = null
            cleanupAutomationState()
        }
    }

    private suspend fun waitForSendConfirmation(): Boolean {
        val startedAt = System.currentTimeMillis()
        while (System.currentTimeMillis() - startedAt < SEND_CONFIRMATION_TIMEOUT_MS) {
            when (CampaignState.isSendActionSuccessful) {
                true -> return true
                false -> return false
                null -> delay(SEND_CONFIRMATION_POLL_MS)
            }
        }
        return false
    }

    private suspend fun pauseCampaign(
        campaignDao: com.message.bulksend.db.CampaignDao,
        scheduler: AutonomousCampaignScheduler,
        campaign: Campaign,
        reason: String
    ) {
        Log.w(TAG, "Pausing autonomous campaign ${campaign.id}: $reason")
        scheduler.cancel(campaign.id)
        val pausedCampaign = campaign.copy(isRunning = false, isStopped = true)
        campaignDao.upsertCampaign(pausedCampaign)
        CampaignAutoSendManager.onCampaignStopped(pausedCampaign)
        updateNotification(campaign.id, reason)
    }

    private suspend fun markCampaignCompleted(
        campaignDao: com.message.bulksend.db.CampaignDao,
        scheduler: AutonomousCampaignScheduler,
        campaign: Campaign
    ) {
        scheduler.cancel(campaign.id)
        AutonomousCampaignConfigStore.clearConfig(applicationContext, campaign.id)
        val completedCampaign = campaign.copy(isRunning = false, isStopped = false)
        campaignDao.upsertCampaign(completedCampaign)
        CampaignAutoSendManager.onCampaignCompleted(completedCampaign)
        updateNotification(campaign.id, "Autonomous campaign finished")
    }

    private fun resolveTargetPackage(preference: String): String? {
        val preferredPackage = when (preference) {
            "WhatsApp Business" -> "com.whatsapp.w4b"
            else -> "com.whatsapp"
        }

        return when {
            isPackageInstalled(this, preferredPackage) -> preferredPackage
            isPackageInstalled(this, "com.whatsapp.w4b") -> "com.whatsapp.w4b"
            isPackageInstalled(this, "com.whatsapp") -> "com.whatsapp"
            else -> null
        }
    }

    private fun buildFinalNumber(number: String, countryCode: String): String {
        return if (number.startsWith("+")) {
            number.replace(Regex("[^\\d+]"), "")
        } else {
            val cleanCode = countryCode.replace(Regex("[^\\d+]"), "")
            val cleanNum = number.replace(Regex("[^\\d]"), "")
            "$cleanCode$cleanNum"
        }
    }

    private suspend fun launchTextAndMediaFlow(
        cleanNumber: String,
        message: String,
        mediaPath: String,
        targetPackage: String
    ) {
        val mediaUri = resolveShareUri(mediaPath)
            ?: error("Attached media file is missing or inaccessible.")
        val mimeType = resolveMediaMimeType(mediaPath)
        val encodedMessage = URLEncoder.encode(message, "UTF-8")

        grantUriPermission(targetPackage, mediaUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)

        val textIntent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse("https://wa.me/$cleanNumber?text=$encodedMessage")
        ).apply {
            setPackage(targetPackage)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val mediaIntent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_STREAM, mediaUri)
            type = mimeType
            putExtra("jid", "$cleanNumber@s.whatsapp.net")
            setPackage(targetPackage)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            clipData = ClipData.newRawUri("autonomous_media", mediaUri)
        }

        startActivity(textIntent)
        withContext(Dispatchers.IO) {
            delay(TEXT_TO_MEDIA_DELAY_MS)
        }
        startActivity(mediaIntent)
        withContext(Dispatchers.IO) {
            delay(postShareDelayFor(mimeType))
        }
    }

    private fun resolveShareUri(mediaPath: String): Uri? {
        return try {
            when {
                mediaPath.startsWith("content://", ignoreCase = true) -> Uri.parse(mediaPath)
                mediaPath.startsWith("file://", ignoreCase = true) -> {
                    val filePath = Uri.parse(mediaPath).path ?: return null
                    val file = File(filePath)
                    if (!file.exists()) return null
                    FileProvider.getUriForFile(this, "${packageName}.provider", file)
                }
                else -> {
                    val file = File(mediaPath)
                    if (!file.exists()) return null
                    FileProvider.getUriForFile(this, "${packageName}.provider", file)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Unable to resolve autonomous media uri: ${e.message}", e)
            null
        }
    }

    private fun resolveMediaMimeType(mediaPath: String): String {
        return when (mediaPath.substringAfterLast('.', "").lowercase()) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            "mp4" -> "video/mp4"
            "3gp", "3gpp" -> "video/3gpp"
            "mkv" -> "video/x-matroska"
            "avi" -> "video/x-msvideo"
            "mov" -> "video/quicktime"
            "pdf" -> "application/pdf"
            "doc" -> "application/msword"
            "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            "xls" -> "application/vnd.ms-excel"
            "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            "ppt" -> "application/vnd.ms-powerpoint"
            "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            "txt" -> "text/plain"
            else -> "*/*"
        }
    }

    private fun postShareDelayFor(mimeType: String): Long {
        return if (mimeType.startsWith("video/")) {
            VIDEO_POST_SHARE_DELAY_MS
        } else {
            DEFAULT_POST_SHARE_DELAY_MS
        }
    }

    @Suppress("DEPRECATION")
    private fun acquireWakeLock() {
        try {
            if (wakeLock?.isHeld != true) {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                val flags = PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP
                wakeLock = powerManager.newWakeLock(flags, "BulkSend:AutonomousCampaignExecution").apply {
                    acquire(WAKE_LOCK_TIMEOUT_MS)
                }
            }

            try {
                val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
                keyguardLock = keyguardManager.newKeyguardLock("BulkSend:AutonomousCampaignExecution")
                keyguardLock?.disableKeyguard()
            } catch (e: Exception) {
                Log.w(TAG, "Keyguard dismiss failed: ${e.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire wake lock: ${e.message}", e)
        }
    }

    @Suppress("DEPRECATION")
    private fun releaseWakeLock() {
        try {
            keyguardLock?.reenableKeyguard()
            keyguardLock = null
        } catch (e: Exception) {
            Log.w(TAG, "Failed to re-enable keyguard: ${e.message}")
        }

        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.w(TAG, "Failed to release wake lock: ${e.message}")
        }
    }

    private fun cleanupAutomationState() {
        CampaignState.isAutoSendEnabled = false
        WhatsAppAutoSendService.deactivateService()
    }

    private fun bringCampaignScreenToForeground(campaignId: String, reason: String) {
        try {
            Log.d(TAG, "Returning autonomous screen to foreground ($reason)")
            val launchIntent = AutonomousCampaignProgressActivity.createIntent(this, campaignId).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(launchIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to return autonomous screen to foreground: ${e.message}", e)
        }
    }

    private fun createNotification(campaignId: String, message: String): Notification {
        val launchIntent = AutonomousCampaignProgressActivity.createIntent(this, campaignId).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            abs(campaignId.hashCode()),
            launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.logo)
            .setContentTitle("Autonomous campaign running")
            .setContentText(message)
            .setContentIntent(pendingIntent)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(campaignId: String, message: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(notificationIdFor(campaignId), createNotification(campaignId, message))
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Autonomous Campaigns",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Background autonomous WhatsApp campaign execution"
        }
        manager.createNotificationChannel(channel)
    }

    companion object {
        private const val TAG = "AutoCampaignExecSvc"
        private const val CHANNEL_ID = "autonomous_campaign_channel"
        private const val SEND_CONFIRMATION_TIMEOUT_MS = 12_000L
        private const val SEND_CONFIRMATION_POLL_MS = 150L
        private const val SEND_WINDOW_GRACE_MS = 15_000L
        private const val INLINE_FOLLOWUP_WINDOW_MS = 2 * 60 * 1000L
        private const val WAKE_LOCK_TIMEOUT_MS = 2 * 60 * 1000L
        private const val MAX_INLINE_SENDS_PER_RUN = 3
        private const val MAX_RETRY_COUNT = 2
        private const val TEXT_TO_MEDIA_DELAY_MS = 4_000L
        private const val DEFAULT_POST_SHARE_DELAY_MS = 3_000L
        private const val VIDEO_POST_SHARE_DELAY_MS = 5_000L

        const val ACTION_EXECUTE_AUTONOMOUS_CAMPAIGN = "com.message.bulksend.action.EXECUTE_AUTONOMOUS_CAMPAIGN"
        const val EXTRA_CAMPAIGN_ID = "autonomous_campaign_id"
        const val EXTRA_TRIGGER_SOURCE = "trigger_source"
        const val SOURCE_ALARM_RECEIVER = "alarm_receiver"
        const val SOURCE_RESTORE_RECOVERY = "restore_recovery"
        const val SOURCE_ACTIVITY_START = "activity_start"
        const val SOURCE_UNKNOWN = "unknown"

        private val activeExecutions = Collections.synchronizedSet(mutableSetOf<String>())

        fun startForCampaign(
            context: Context,
            campaignId: String,
            source: String = SOURCE_UNKNOWN
        ) {
            val intent = Intent(context, AutonomousCampaignExecutionService::class.java).apply {
                action = ACTION_EXECUTE_AUTONOMOUS_CAMPAIGN
                putExtra(EXTRA_CAMPAIGN_ID, campaignId)
                putExtra(EXTRA_TRIGGER_SOURCE, source)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        private fun acquireExecutionSlot(campaignId: String): Boolean =
            activeExecutions.add(campaignId)

        private fun releaseExecutionSlot(campaignId: String) {
            activeExecutions.remove(campaignId)
        }

        private fun notificationIdFor(campaignId: String): Int =
            42000 + abs(campaignId.hashCode() % 10000)

        private fun formatTime(timestamp: Long): String {
            return java.text.SimpleDateFormat("dd MMM, hh:mm a", java.util.Locale.getDefault())
                .format(java.util.Date(timestamp))
        }
    }
}
