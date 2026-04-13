package com.message.bulksend.referral

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

/**
 * Compatibility stub after the old affiliate flow was retired in favor of the
 * reseller onboarding screen.
 */
class ReferralManager(private val context: Context) {

    companion object {
        private const val DISABLED_MESSAGE =
            "Affiliate flow has been replaced by the reseller program."
        private const val RESELLER_WHATSAPP_NUMBER = "919137167857"
    }

    suspend fun generateReferralCode(fullName: String): ReferralResult {
        return disabledResult()
    }

    suspend fun processReferralCode(referralCode: String, installId: String? = null): ReferralResult {
        return disabledResult()
    }

    suspend fun trackAffiliateInstall(
        referralCode: String,
        source: String = "play_store_install",
        installId: String? = null
    ): ReferralResult {
        return disabledResult()
    }

    suspend fun trackAnonymousAffiliateInstall(
        referralCode: String,
        installId: String,
        source: String = "play_store_install"
    ): ReferralResult {
        return disabledResult()
    }

    suspend fun processReferralReward(planType: String, purchaseAmount: Int): ReferralResult {
        return disabledResult("Referral rewards are disabled in the app right now.")
    }

    suspend fun getReferralStats(): ReferralStatsResult {
        return ReferralStatsResult(success = false, message = DISABLED_MESSAGE)
    }

    fun generatePlayStoreLink(referralCode: String): String {
        val message = Uri.encode("Hi, I want to join the reseller program.")
        return "https://wa.me/$RESELLER_WHATSAPP_NUMBER?text=$message"
    }

    fun shareReferralLink(referralCode: String, referralLink: String) {
        val intent = Intent(
            Intent.ACTION_VIEW,
            Uri.parse(generatePlayStoreLink(referralCode))
        ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        try {
            context.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(context, DISABLED_MESSAGE, Toast.LENGTH_SHORT).show()
        }
    }

    suspend fun getReferralDataFromFirestore(): ReferralStatsResult {
        return ReferralStatsResult(success = false, message = DISABLED_MESSAGE)
    }

    suspend fun getReferredUsersList(): ReferredUsersResult {
        return ReferredUsersResult(success = false, message = DISABLED_MESSAGE)
    }

    suspend fun getReferralClicks(): ReferralClicksResult {
        return ReferralClicksResult(success = false, message = DISABLED_MESSAGE)
    }

    suspend fun getReferralInstalls(): ReferralInstallsResult {
        return ReferralInstallsResult(success = false, message = DISABLED_MESSAGE)
    }

    private fun disabledResult(message: String = DISABLED_MESSAGE): ReferralResult {
        return ReferralResult(success = false, message = message)
    }
}

data class ReferralResult(
    val success: Boolean,
    val referralCode: String? = null,
    val referralLink: String? = null,
    val message: String? = null,
    val referrerName: String? = null,
    val commission: Int? = null
)

data class ReferralStatsResult(
    val success: Boolean,
    val myReferralCode: String? = null,
    val referralLink: String? = null,
    val referralCount: Int = 0,
    val referralLinkClicks: Int = 0,
    val trackedInstalls: Int = 0,
    val trackedRegistrations: Int = 0,
    val successfulReferrals: Int = 0,
    val totalReferralEarnings: Int = 0,
    val pendingEarnings: Int = 0,
    val withdrawnEarnings: Int = 0,
    val referredBy: String? = null,
    val message: String? = null
)

data class ReferredUsersResult(
    val success: Boolean,
    val referralCode: String? = null,
    val totalReferred: Int = 0,
    val referredUsers: List<ReferredUser> = emptyList(),
    val message: String? = null
)

data class ReferralClicksResult(
    val success: Boolean,
    val totalClicks: Int = 0,
    val clickHistory: List<ReferralClick> = emptyList(),
    val message: String? = null
)

data class ReferralInstallsResult(
    val success: Boolean,
    val totalInstalls: Int = 0,
    val installHistory: List<ReferralInstall> = emptyList(),
    val message: String? = null
)

data class ReferralClick(
    val clickId: String,
    val referralCode: String?,
    val clickedAt: String?,
    val userAgent: String?
)

data class ReferralInstall(
    val installId: String,
    val referralCode: String?,
    val installTrackedAt: String?,
    val installSource: String?,
    val linkedUserId: String?
)

data class ReferredUser(
    val oderId: String,
    val fullName: String,
    val email: String,
    val phoneNumber: String,
    val userStatus: String,
    val referredAt: String?,
    val installTrackedAt: String?,
    val registeredAt: String?,
    val purchasedAt: String?,
    val installSource: String?,
    val hasPurchased: Boolean,
    val purchasedPlanType: String?,
    val purchaseAmount: Int,
    val commissionEarned: Int
)
