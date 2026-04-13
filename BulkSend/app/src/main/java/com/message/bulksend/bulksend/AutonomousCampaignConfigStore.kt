package com.message.bulksend.bulksend

import android.content.Context

data class AutonomousCampaignRuntimeConfig(
    val countryCode: String,
    val whatsAppPreference: String,
    val hasMediaAttachment: Boolean = false
)

object AutonomousCampaignConfigStore {

    private const val PREFS_NAME = "autonomous_campaign_runtime"
    private const val KEY_ACTIVE_CAMPAIGN_ID = "active_campaign_id"

    fun saveConfig(
        context: Context,
        campaignId: String,
        config: AutonomousCampaignRuntimeConfig
    ) {
        prefs(context).edit()
            .putString(countryCodeKey(campaignId), config.countryCode)
            .putString(whatsAppPreferenceKey(campaignId), config.whatsAppPreference)
            .putBoolean(hasMediaKey(campaignId), config.hasMediaAttachment)
            .putString(KEY_ACTIVE_CAMPAIGN_ID, campaignId)
            .apply()
    }

    fun getConfig(context: Context, campaignId: String): AutonomousCampaignRuntimeConfig? {
        val prefs = prefs(context)
        val countryCode = prefs.getString(countryCodeKey(campaignId), null) ?: return null
        val whatsAppPreference = prefs.getString(whatsAppPreferenceKey(campaignId), null) ?: return null
        return AutonomousCampaignRuntimeConfig(
            countryCode = countryCode,
            whatsAppPreference = whatsAppPreference,
            hasMediaAttachment = prefs.getBoolean(hasMediaKey(campaignId), false)
        )
    }

    fun setActiveCampaignId(context: Context, campaignId: String?) {
        prefs(context).edit().apply {
            if (campaignId.isNullOrBlank()) {
                remove(KEY_ACTIVE_CAMPAIGN_ID)
            } else {
                putString(KEY_ACTIVE_CAMPAIGN_ID, campaignId)
            }
        }.apply()
    }

    fun getActiveCampaignId(context: Context): String? {
        return prefs(context).getString(KEY_ACTIVE_CAMPAIGN_ID, null)
    }

    fun clearConfig(context: Context, campaignId: String) {
        val prefs = prefs(context)
        prefs.edit()
            .remove(countryCodeKey(campaignId))
            .remove(whatsAppPreferenceKey(campaignId))
            .remove(hasMediaKey(campaignId))
            .apply()

        if (prefs.getString(KEY_ACTIVE_CAMPAIGN_ID, null) == campaignId) {
            prefs.edit().remove(KEY_ACTIVE_CAMPAIGN_ID).apply()
        }
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun countryCodeKey(campaignId: String) = "country_code_$campaignId"
    private fun whatsAppPreferenceKey(campaignId: String) = "whatsapp_pref_$campaignId"
    private fun hasMediaKey(campaignId: String) = "has_media_$campaignId"
}
