package com.message.bulksend.bulksenderaiagent

enum class MessageType {
    TEXT_USER,
    TEXT_BOT,
    CARD_ADD_CONTACT,
    CHIPS_CONTACT_OPTIONS,
    CARD_GROUP_LIST,
    CARD_CAMPAIGN_TYPES,
    CARD_WHATSAPP_APPS,
    CARD_ATTACHMENT_REQUEST,
    CARD_PERMISSION_CHECKLIST,
    CARD_LAUNCH_CAMPAIGN
}

enum class AgentStep {
    INITIALIZING,
    SELECT_CONTACT_SOURCE,
    WAITING_FOR_CONTACTS,
    SELECT_GROUP,
    ENTER_CAMPAIGN_NAME,
    ENTER_MESSAGE,
    SELECT_CAMPAIGN_TYPE,
    SELECT_WHATSAPP_APP,
    PICK_MEDIA,
    PICK_SHEET,
    REVIEW_PERMISSIONS,
    READY_TO_LAUNCH
}

enum class CampaignType(
    val title: String,
    val shortTitle: String,
    val description: String
) {
    TEXT(
        title = "Text Campaign",
        shortTitle = "Text",
        description = "Sirf text message bhejo"
    ),
    CAPTION(
        title = "Caption Campaign",
        shortTitle = "Caption",
        description = "Image, video ya PDF ke saath caption bhejo"
    ),
    TEXT_MEDIA(
        title = "Text + Media",
        shortTitle = "Text + Media",
        description = "Text aur file dono bhejo"
    ),
    SHEET(
        title = "Sheet Campaign",
        shortTitle = "Sheet",
        description = "Excel/CSV data se personalized campaign chalao"
    );

    fun requiresMediaAttachment(): Boolean = this == CAPTION || this == TEXT_MEDIA

    fun requiresSheetFile(): Boolean = this == SHEET

    fun displayTitle(language: ChatLanguage): String {
        return when (language) {
            ChatLanguage.ENGLISH -> title
            ChatLanguage.HINGLISH -> when (this) {
                TEXT -> "Text Campaign"
                CAPTION -> "Caption Campaign"
                TEXT_MEDIA -> "Text + Media"
                SHEET -> "Sheet Campaign"
            }
        }
    }

    fun displayDescription(language: ChatLanguage): String {
        return when (language) {
            ChatLanguage.ENGLISH -> when (this) {
                TEXT -> "Send text messages only"
                CAPTION -> "Send media with a caption"
                TEXT_MEDIA -> "Send both text and a file"
                SHEET -> "Run a personalized campaign from Excel or CSV"
            }
            ChatLanguage.HINGLISH -> when (this) {
                TEXT -> "Bas text message bhejna hai"
                CAPTION -> "Image, video ya PDF ke saath caption bhejna hai"
                TEXT_MEDIA -> "Text aur file alag-alag bhejni hai"
                SHEET -> "Excel ya CSV se personalized campaign chalana hai"
            }
        }
    }
}

enum class AttachmentKind {
    MEDIA,
    SHEET
}

enum class WhatsAppTarget(
    val packageName: String,
    private val englishTitle: String,
    private val hinglishTitle: String,
    private val englishDescription: String,
    private val hinglishDescription: String
) {
    WHATSAPP(
        packageName = "com.whatsapp",
        englishTitle = "WhatsApp",
        hinglishTitle = "WhatsApp",
        englishDescription = "Use your regular WhatsApp app",
        hinglishDescription = "Normal WhatsApp app use karo"
    ),
    BUSINESS(
        packageName = "com.whatsapp.w4b",
        englishTitle = "WhatsApp Business",
        hinglishTitle = "WhatsApp Business",
        englishDescription = "Use your WhatsApp Business app",
        hinglishDescription = "WhatsApp Business app use karo"
    );

    fun displayTitle(language: ChatLanguage): String {
        return when (language) {
            ChatLanguage.ENGLISH -> englishTitle
            ChatLanguage.HINGLISH -> hinglishTitle
        }
    }

    fun displayDescription(language: ChatLanguage): String {
        return when (language) {
            ChatLanguage.ENGLISH -> englishDescription
            ChatLanguage.HINGLISH -> hinglishDescription
        }
    }

    fun storedPreference(): String {
        return when (this) {
            WHATSAPP -> "WhatsApp"
            BUSINESS -> "WhatsApp Business"
        }
    }

    companion object {
        fun fromStoredPreference(value: String?): WhatsAppTarget? {
            return when (value?.trim()) {
                "WhatsApp" -> WHATSAPP
                "WhatsApp Business" -> BUSINESS
                else -> null
            }
        }
    }
}

data class AttachmentRequest(
    val kind: AttachmentKind,
    val title: String,
    val description: String,
    val buttonLabel: String
)

data class PermissionChecklist(
    val accessibilityEnabled: Boolean = false,
    val overlayEnabled: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val hasWhatsApp: Boolean = false,
    val hasWhatsAppBusiness: Boolean = false
) {
    val hasAnyWhatsApp: Boolean
        get() = hasWhatsApp || hasWhatsAppBusiness

    fun isTargetAvailable(target: WhatsAppTarget): Boolean {
        return when (target) {
            WhatsAppTarget.WHATSAPP -> hasWhatsApp
            WhatsAppTarget.BUSINESS -> hasWhatsAppBusiness
        }
    }

    fun availableWhatsAppTargets(): List<WhatsAppTarget> {
        return buildList {
            if (hasWhatsApp) add(WhatsAppTarget.WHATSAPP)
            if (hasWhatsAppBusiness) add(WhatsAppTarget.BUSINESS)
        }
    }

    val requiredReady: Boolean
        get() = accessibilityEnabled && overlayEnabled && hasAnyWhatsApp
}

data class CampaignDraft(
    val selectedGroupId: Long? = null,
    val selectedGroupName: String? = null,
    val contactCount: Int = 0,
    val campaignName: String = "",
    val message: String = "",
    val campaignType: CampaignType? = null,
    val whatsAppTarget: WhatsAppTarget? = null,
    val mediaUri: String? = null,
    val mediaName: String? = null,
    val sheetUri: String? = null,
    val sheetName: String? = null,
    val countryCode: String = ""
) {
    fun hasGroup(): Boolean = selectedGroupId != null

    fun isSetupComplete(): Boolean {
        val type = campaignType ?: return false
        if (!hasGroup()) return false
        if (campaignName.isBlank() || message.isBlank()) return false
        if (type.requiresMediaAttachment() && mediaUri.isNullOrBlank()) return false
        if (type.requiresSheetFile() && sheetUri.isNullOrBlank()) return false
        return true
    }
}

data class CampaignLaunchRequest(
    val campaignType: CampaignType,
    val groupId: String?,
    val groupName: String,
    val campaignName: String,
    val countryCode: String,
    val message: String,
    val whatsAppTarget: WhatsAppTarget,
    val mediaUri: String? = null,
    val sheetUri: String? = null
)

data class ChatVoiceRequest(
    val language: ChatLanguage,
    val text: String? = null,
    val templateKey: String? = null,
    val templateData: Map<String, String> = emptyMap(),
    val speechStyle: String = ""
)

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val text: String = "",
    val type: MessageType,
    val timestamp: Long = System.currentTimeMillis(),
    val voiceRequest: ChatVoiceRequest? = null
)

sealed class AgentUiAction {
    object OpenAddContact : AgentUiAction()
    data class PickAttachment(val kind: AttachmentKind) : AgentUiAction()
    object OpenAccessibilitySettings : AgentUiAction()
    object OpenOverlaySettings : AgentUiAction()
    object RequestNotificationPermission : AgentUiAction()
    data class PlayVoice(
        val messageId: String,
        val request: ChatVoiceRequest,
        val forceRefresh: Boolean = false
    ) : AgentUiAction()
    object LaunchCampaign : AgentUiAction()
}

object AiAgentLaunchExtras {
    const val EXTRA_PRESET_MESSAGE = "AI_AGENT_PRESET_MESSAGE"
    const val EXTRA_PRESET_MEDIA_URI = "AI_AGENT_PRESET_MEDIA_URI"
    const val EXTRA_PRESET_SHEET_URI = "AI_AGENT_PRESET_SHEET_URI"
    const val EXTRA_PRESET_WHATSAPP_PREFERENCE = "AI_AGENT_PRESET_WHATSAPP_PREFERENCE"
}

object AiAgentVoiceTemplateKeys {
    const val CONTACT_ADD_HELP = "contact_add_help"
}
