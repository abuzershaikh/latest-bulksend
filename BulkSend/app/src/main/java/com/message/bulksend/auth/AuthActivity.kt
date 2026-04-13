package com.message.bulksend.auth

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.util.Patterns
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowInsetsControllerCompat
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.airbnb.lottie.compose.*
import androidx.core.view.WindowCompat
import androidx.lifecycle.lifecycleScope
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseAuthWeakPasswordException
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.android.gms.tasks.Tasks
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.ExecutionException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.message.bulksend.MainActivity
import com.message.bulksend.R
import com.message.bulksend.data.UserData
import com.message.bulksend.userdetails.UserDetailsActivity
import com.message.bulksend.utils.UserDetailsChecker
import kotlinx.coroutines.launch
import com.message.bulksend.utils.DeviceUtils
import com.message.bulksend.notification.FCMTokenManager
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class AuthActivity : ComponentActivity() {

    private val mAuth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val credentialManager: CredentialManager by lazy { CredentialManager.create(this) }
    private val userManager by lazy { UserManager(this) }
    private val emailService by lazy { EmailService(this) }
    private var isSigningIn = false // Flag to prevent onStart redirect during sign-in
    
    companion object {
        private const val TAG = "AuthActivity"
        private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 1001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enable edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false)
        
        // Request notification permission for Android 13+
        requestNotificationPermission()

        setContent {
            var isGoogleLoading by remember { mutableStateOf(false) }
            var isEmailAuthLoading by remember { mutableStateOf(false) }

            SystemBarsColor(color = Color.Transparent)

            SignInScreen(
                isGoogleLoading = isGoogleLoading,
                isEmailAuthLoading = isEmailAuthLoading,
                onGoogleSignInClick = {
                    Log.d(TAG, "Google Sign-In button clicked")
                    isGoogleLoading = true
                    if (DeviceUtils.isNetworkAvailable(this)) {
                        Log.d(TAG, "Network available, starting sign-in")
                        handleGoogleSignIn { isGoogleLoading = false }
                    } else {
                        Log.w(TAG, "No network available")
                        isGoogleLoading = false
                        showToast("🌐 No internet connection. Please check your network and try again.")
                    }
                },
                onGuestLoginClick = { email, pin ->
                    handleGuestLogin(email, pin)
                },
                onEmailAuthClick = { authMode, email, password ->
                    isEmailAuthLoading = true
                    handleEmailPasswordAuth(
                        email = email,
                        password = password,
                        isSignUp = authMode == EmailAuthMode.SignUp,
                        onAuthResult = { isEmailAuthLoading = false }
                    )
                }
            )
        }
    }

    override fun onStart() {
        super.onStart()
        
        // Don't redirect if user is currently signing in
        if (isSigningIn) {
            Log.d(TAG, "Sign-in in progress, skipping onStart redirect")
            return
        }
        
        // Check for guest login first
        val sharedPref = getSharedPreferences("auth_prefs", MODE_PRIVATE)
        val isGuest = sharedPref.getBoolean("is_guest", false)
        
        if (isGuest) {
            // Guest is already logged in, go to MainActivity
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }
        
        val currentUser = mAuth.currentUser
        if (currentUser != null) {
            // Register FCM token for existing user
            lifecycleScope.launch {
                try {
                    FCMTokenManager.registerPendingToken(this@AuthActivity)
                    FCMTokenManager.subscribeToTopic("customer_support")
                    Log.d(TAG, "FCM token registered for existing user")
                } catch (e: Exception) {
                    Log.e(TAG, "Error registering FCM token for existing user", e)
                }
            }
            
            // Check if redirecting to chat from notification
            val redirectToChat = intent.getBooleanExtra("redirectToChat", false)
            if (redirectToChat) {
                navigateToChatSupport()
            } else {
                navigateToMain(currentUser)
            }
        }
    }
    
    private fun navigateToChatSupport() {
        val chatIntent = Intent(this, com.message.bulksend.support.CustomerChatSupportActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("fromNotification", true)
        }
        startActivity(chatIntent)
        finish()
    }

    /**
     * Handle Google Sign-In using new Credential Manager API
     * This is faster and more modern than the old GoogleSignInClient
     */
    private fun handleGoogleSignIn(onSignInResult: () -> Unit) {
        Log.d(TAG, "handleGoogleSignIn() called")
        isSigningIn = true // Set flag to prevent onStart redirect
        lifecycleScope.launch {
            try {
                Log.d(TAG, "Creating Google ID option")
                // Create Google ID option
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false) // Allow all Google accounts
                    .setServerClientId(getString(R.string.default_web_client_id))
                    .setAutoSelectEnabled(true) // Enable auto sign-in for returning users
                    .build()

                // Build credential request
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                Log.d(TAG, "Requesting credentials from Credential Manager")
                // Get credential from Credential Manager
                val result = credentialManager.getCredential(
                    request = request,
                    context = this@AuthActivity
                )

                Log.d(TAG, "Credential received, handling result")
                handleSignInResult(result, onSignInResult)
            } catch (e: GetCredentialCancellationException) {
                isSigningIn = false // Reset flag on cancel
                onSignInResult()
                Log.w(TAG, "Sign-in cancelled by user", e)
                showToast("Sign-in was cancelled by user.")
            } catch (e: NoCredentialException) {
                isSigningIn = false // Reset flag when no credentials
                onSignInResult()
                Log.w(TAG, "No Google account credential found", e)
                showToast("No Google account found on this device. Add a Google account and try again.")
            } catch (e: GetCredentialException) {
                isSigningIn = false // Reset flag on error
                onSignInResult()
                Log.e(TAG, "Credential Manager error: ${e.type}", e)
                showToast(resolveSignInCredentialMessage(e))
            } catch (e: Exception) {
                isSigningIn = false // Reset flag on error
                onSignInResult()
                Log.e(TAG, "Unexpected error during sign-in", e)
                showToast("❌ An error occurred. Please try again.")
            }
        }
    }

    /**
     * Convert Credential Manager exceptions into user-readable message.
     */
    private fun resolveSignInCredentialMessage(error: GetCredentialException): String {
        when (error) {
            is GetCredentialCancellationException -> return "Sign-in was cancelled by user."
            is NoCredentialException -> return "No Google account credential found. Add a Google account on this device and try again."
        }

        val message = (error.message ?: "").lowercase()
        return when {
            message.contains("cancel") -> "Sign-in was cancelled by user."
            message.contains("no credentials") || message.contains("no credential") ->
                "No Google account credential found. Add a Google account on this device and try again."
            message.isBlank() -> "Sign-in was cancelled or no credentials were returned."
            else -> "Sign-in failed: ${error.message}"
        }
    }

    /**
     * Handle the credential result from Credential Manager
     */
    private fun handleSignInResult(result: GetCredentialResponse, onSignInResult: () -> Unit) {
        Log.d(TAG, "handleSignInResult() called")
        when (val credential = result.credential) {
            is CustomCredential -> {
                Log.d(TAG, "Credential type: ${credential.type}")
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        Log.d(TAG, "Parsing Google ID token")
                        // Extract Google ID token credential
                        val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                        
                        Log.d(TAG, "Google ID token parsed successfully, authenticating with Firebase")
                        // Authenticate with Firebase using the ID token
                        firebaseAuthWithGoogle(googleIdTokenCredential.idToken, onSignInResult)
                    } catch (e: GoogleIdTokenParsingException) {
                        isSigningIn = false // Reset flag
                        onSignInResult()
                        Log.e(TAG, "Invalid Google ID token", e)
                        showToast("❌ Invalid credential received")
                    }
                } else {
                    isSigningIn = false // Reset flag
                    onSignInResult()
                    Log.e(TAG, "Unexpected credential type: ${credential.type}")
                    showToast("❌ Unexpected credential type")
                }
            }
            else -> {
                isSigningIn = false // Reset flag
                onSignInResult()
                Log.e(TAG, "Unexpected credential type: ${credential::class.simpleName}")
                showToast("❌ Unexpected credential type")
            }
        }
    }

    /**
     * Authenticate with Firebase using Google ID token
     * Using Tasks.await() instead of listeners to fix Motorola/network timeout issues
     * Reference: https://github.com/firebase/firebase-android-sdk/issues/2765
     */
    private fun firebaseAuthWithGoogle(idToken: String, onSignInResult: () -> Unit) {
        Log.d(TAG, "firebaseAuthWithGoogle() called with token: ${idToken.take(20)}...")
        
        lifecycleScope.launch {
            try {
                val credential = GoogleAuthProvider.getCredential(idToken, null)
                Log.d(TAG, "GoogleAuthProvider credential created successfully")
                
                // Use Tasks.await with timeout to fix Firebase blocking issue on some devices
                Log.d(TAG, "Calling Tasks.await with 60 second timeout...")
                
                withContext(Dispatchers.IO) {
                    try {
                        // This fixes the indefinite blocking issue on Motorola and other devices
                        val authResult = Tasks.await(
                            mAuth.signInWithCredential(credential),
                            60,
                            TimeUnit.SECONDS
                        )
                        
                        Log.d(TAG, "✅ Firebase authentication successful via Tasks.await")
                        val user = authResult.user
                        
                        withContext(Dispatchers.Main) {
                            if (user != null) {
                                onSignInResult()
                                Log.d(TAG, "Current user: ${user.email}")
                                handleUserLogin(user)
                            } else {
                                isSigningIn = false
                                onSignInResult()
                                Log.e(TAG, "❌ User is null after sign-in")
                                showToast("❌ User is null after sign-in")
                            }
                        }
                        
                    } catch (e: TimeoutException) {
                        isSigningIn = false
                        onSignInResult()
                        Log.e(TAG, "⏱️ Firebase authentication timeout after 60 seconds", e)
                        withContext(Dispatchers.Main) {
                            showToast("❌ Sign-in timeout. Please check your internet connection and try again.")
                        }
                    } catch (e: ExecutionException) {
                        isSigningIn = false
                        onSignInResult()
                        Log.e(TAG, "❌ Firebase authentication execution error", e)
                        withContext(Dispatchers.Main) {
                            showToast("❌ Sign-in failed: ${e.cause?.message ?: e.message}")
                        }
                    } catch (e: InterruptedException) {
                        isSigningIn = false
                        onSignInResult()
                        Log.e(TAG, "❌ Firebase authentication interrupted", e)
                        withContext(Dispatchers.Main) {
                            showToast("❌ Sign-in interrupted. Please try again.")
                        }
                    }
                }
                
            } catch (e: Exception) {
                isSigningIn = false
                onSignInResult()
                Log.e(TAG, "❌ Exception in firebaseAuthWithGoogle", e)
                showToast("❌ Error: ${e.message}")
            }
        }
    }

    private fun handleUserLogin(user: FirebaseUser) {
        Log.d(TAG, "handleUserLogin() started for user: ${user.email}")
        lifecycleScope.launch {
            try {
                if (!DeviceUtils.isNetworkAvailable(this@AuthActivity)) {
                    Log.w(TAG, "No network available during login")
                    showToast("🌐 No internet connection. Please check your network and try again.")
                    mAuth.signOut()
                    isSigningIn = false
                    return@launch
                }

                showToast("Setting up your account...")

                val deviceId = DeviceUtils.getDeviceId(this@AuthActivity)
                Log.d(TAG, "Login attempt - Email: ${user.email}, Device: $deviceId")

                // Check if user exists before creating/updating
                val existingUser = userManager.getUserData(user.email!!)
                val isNewUser = existingUser == null
                val oldDeviceId = existingUser?.deviceId

                Log.d(TAG, "Creating/updating user data...")
                val result = userManager.createOrUpdateUser(user)

                result.onSuccess { userData ->
                    Log.d(TAG, "✅ User data created/updated successfully")

                    // Save subscription preferences locally
                    saveSubscriptionPreferences(userData)

                    // Register FCM token for notifications
                    try {
                        val tokenRegistered = FCMTokenManager.registerToken(this@AuthActivity)
                        Log.d(TAG, "FCM token registration: $tokenRegistered")
                        
                        // Subscribe to customer support topic
                        FCMTokenManager.subscribeToTopic("customer_support")
                        Log.d(TAG, "Subscribed to customer support notifications")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error registering FCM token", e)
                    }

                    if (isNewUser) {
                        // New user - send welcome email
                        emailService.sendWelcomeEmail(userData)
                        showToast("Welcome! Check your email for account details.")
                    } else if (oldDeviceId != null && oldDeviceId != deviceId) {
                        // Existing user with device change - send notification
                        emailService.sendDeviceChangeNotification(userData)
                        showToast("Welcome back! New device detected.")
                    } else {
                        // Same device login
                        showToast("Welcome back!")
                    }

                    Log.d(TAG, "Calling navigateToMain()...")
                    // Use runOnUiThread to ensure navigation happens on main thread
                    runOnUiThread {
                        navigateToMain(user)
                    }
                }.onFailure { exception ->
                    Log.e(TAG, "❌ Error handling user login", exception)
                    showToast("❌ Error setting up account: ${exception.message}")
                    mAuth.signOut()
                    isSigningIn = false
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Unexpected error during login", e)
                showToast("An unexpected error occurred. Please try again.")
                mAuth.signOut()
                isSigningIn = false
            }
        }
    }

    private fun handleEmailPasswordAuth(
        email: String,
        password: String,
        isSignUp: Boolean,
        onAuthResult: () -> Unit
    ) {
        Log.d(TAG, "handleEmailPasswordAuth() called. isSignUp=$isSignUp, email=$email")

        if (!DeviceUtils.isNetworkAvailable(this)) {
            onAuthResult()
            showToast("No internet connection. Please check your network and try again.")
            return
        }

        isSigningIn = true

        lifecycleScope.launch {
            try {
                val user = withContext(Dispatchers.IO) {
                    val authTask = if (isSignUp) {
                        mAuth.createUserWithEmailAndPassword(email, password)
                    } else {
                        mAuth.signInWithEmailAndPassword(email, password)
                    }

                    val authResult = Tasks.await(authTask, 60, TimeUnit.SECONDS)
                    val firebaseUser = authResult.user
                        ?: throw IllegalStateException("User is null after authentication")

                    if (isSignUp && firebaseUser.displayName.isNullOrBlank()) {
                        val fallbackName = email.substringBefore("@")
                            .replaceFirstChar { ch ->
                                if (ch.isLowerCase()) ch.titlecase() else ch.toString()
                            }

                        if (fallbackName.isNotBlank()) {
                            val profileUpdates = UserProfileChangeRequest.Builder()
                                .setDisplayName(fallbackName)
                                .build()
                            Tasks.await(firebaseUser.updateProfile(profileUpdates), 30, TimeUnit.SECONDS)
                        }
                    }

                    mAuth.currentUser ?: firebaseUser
                }

                onAuthResult()
                handleUserLogin(user)
            } catch (e: TimeoutException) {
                isSigningIn = false
                onAuthResult()
                Log.e(TAG, "Email/password authentication timeout", e)
                showToast("Authentication timeout. Please try again.")
            } catch (e: ExecutionException) {
                isSigningIn = false
                onAuthResult()
                Log.e(TAG, "Email/password authentication failed", e)
                showToast(resolveEmailPasswordAuthMessage(e.cause, isSignUp))
            } catch (e: InterruptedException) {
                isSigningIn = false
                onAuthResult()
                Log.e(TAG, "Email/password authentication interrupted", e)
                showToast("Authentication interrupted. Please try again.")
            } catch (e: Exception) {
                isSigningIn = false
                onAuthResult()
                Log.e(TAG, "Unexpected email/password auth error", e)
                showToast("Authentication failed: ${e.message ?: "Please try again."}")
            }
        }
    }

    private fun resolveEmailPasswordAuthMessage(error: Throwable?, isSignUp: Boolean): String {
        return when (error) {
            is FirebaseAuthWeakPasswordException ->
                "Password kam se kam 6 characters ka hona chahiye."
            is FirebaseAuthUserCollisionException ->
                "Is email se account pehle se bana hua hai. Login karein."
            is FirebaseAuthInvalidUserException ->
                "Is email ka account nahi mila. Pehle signup karein."
            is FirebaseAuthInvalidCredentialsException ->
                if (isSignUp) "Valid email address daliyega." else "Email ya password galat hai."
            is FirebaseTooManyRequestsException ->
                "Bahut zyada attempts ho gaye. Thodi der baad try karein."
            is FirebaseNetworkException ->
                "Network issue aa gaya. Internet check karke dobara try karein."
            else -> {
                val fallbackMessage = error?.message.orEmpty()
                when {
                    fallbackMessage.contains("password is invalid", ignoreCase = true) ->
                        "Email ya password galat hai."
                    fallbackMessage.contains("no user record", ignoreCase = true) ->
                        "Is email ka account nahi mila. Pehle signup karein."
                    fallbackMessage.contains("already in use", ignoreCase = true) ->
                        "Is email se account pehle se bana hua hai. Login karein."
                    fallbackMessage.contains("badly formatted", ignoreCase = true) ->
                        "Valid email address daliyega."
                    fallbackMessage.isNotBlank() -> fallbackMessage
                    else -> "Authentication failed. Please try again."
                }
            }
        }
    }

    private fun navigateToMain(user: FirebaseUser) {
        Log.d(TAG, "navigateToMain() called for user: ${user.email}")
        val welcomeName = user.displayName
            ?.takeIf { it.isNotBlank() }
            ?: user.email?.substringBefore("@")
                ?.replaceFirstChar { ch ->
                    if (ch.isLowerCase()) ch.titlecase() else ch.toString()
                }
            ?: "User"
        showToast("Welcome, $welcomeName")
        
        // Check if user has filled their details
        lifecycleScope.launch {
            try {
                Log.d(TAG, "Checking if user has filled details...")
                val hasDetails = UserDetailsChecker.hasUserDetails(this@AuthActivity)
                Log.d(TAG, "User has details: $hasDetails")
                
                // Reset the signing in flag before navigation
                isSigningIn = false
                
                // Use runOnUiThread to ensure navigation happens on main thread
                runOnUiThread {
                    if (hasDetails) {
                        // User has already filled details, go to MainActivity
                        Log.d(TAG, "Navigating to MainActivity...")
                        val intent = Intent(this@AuthActivity, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        finish()
                    } else {
                        // User needs to fill details first
                        Log.d(TAG, "Navigating to UserDetailsActivity...")
                        val intent = Intent(this@AuthActivity, UserDetailsActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        }
                        startActivity(intent)
                        finish()
                    }
                    Log.d(TAG, "Navigation completed successfully")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error checking user details", e)
                isSigningIn = false
                // On error, go to UserDetailsActivity to be safe
                runOnUiThread {
                    val intent = Intent(this@AuthActivity, UserDetailsActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    }
                    startActivity(intent)
                    finish()
                }
            }
        }
    }

    private fun handleGuestLogin(email: String, pin: String) {
        // Validate guest credentials
        if (email == "guest1234@gmail.com" && pin == "8268") {
            showToast("✅ Guest login successful!")
            
            // Save guest login status
            val sharedPref = getSharedPreferences("auth_prefs", MODE_PRIVATE)
            with(sharedPref.edit()) {
                putBoolean("is_guest", true)
                putString("guest_email", email)
                apply()
            }
            
            // Navigate directly to MainActivity for guest
            startActivity(Intent(this, MainActivity::class.java))
            finish()
        } else {
            showToast("❌ Invalid guest credentials. Please try again.")
        }
    }



    private fun saveSubscriptionPreferences(userData: UserData) {
        try {
            val sharedPref = getSharedPreferences("subscription_prefs", MODE_PRIVATE)
            with(sharedPref.edit()) {
                putString("subscription_type", userData.subscriptionType)
                putInt("contacts_limit", userData.contactsLimit)
                putInt("current_contacts", userData.currentContactsCount)
                putInt("groups_limit", userData.groupsLimit)
                putInt("current_groups", userData.currentGroupsCount)
                putString("user_email", userData.email)

                // Save expiry info for premium users
                if (userData.subscriptionType == "premium") {
                    userData.subscriptionEndDate?.let { endDate ->
                        putLong("subscription_end_time", endDate.seconds * 1000)
                    }
                } else {
                    remove("subscription_end_time")
                }

                apply()
            }

            Log.d(TAG, "✅ Subscription preferences saved:")
            Log.d(TAG, "  Type: ${userData.subscriptionType}")
            Log.d(TAG, "  Contacts: ${userData.currentContactsCount}/${userData.contactsLimit}")
            Log.d(TAG, "  Groups: ${userData.currentGroupsCount}/${userData.groupsLimit}")
            Log.d(TAG, "  Email: ${userData.email}")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error saving subscription preferences", e)
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_REQUEST_CODE
                )
            }
        }
    }
    
    /**
     * Check for Play Store install referrer
     * This detects if user installed app via a referral link
     * The referral code will be auto-filled in UserDetailsActivity
     */
    @Deprecated("Deprecated in Java")
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            NOTIFICATION_PERMISSION_REQUEST_CODE -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Log.d(TAG, "Notification permission granted")
                    showToast("✅ Notifications enabled for customer support")
                } else {
                    Log.w(TAG, "Notification permission denied")
                    showToast("⚠️ Please enable notifications to receive support messages")
                }
            }
        }
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}

private enum class EmailAuthMode {
    Login,
    SignUp
}

@Composable
fun SystemBarsColor(color: Color) {
    val context = LocalContext.current
    val window = (context as? Activity)?.window

    if (window != null) {
        SideEffect {
            window.statusBarColor = color.toArgb()
            window.navigationBarColor = color.toArgb()

            WindowCompat.getInsetsController(window, window.decorView)?.let { controller ->
                val isLight = color.luminance() > 0.5f
                controller.isAppearanceLightStatusBars = isLight
                controller.isAppearanceLightNavigationBars = isLight
            }
        }
    }
}

@Composable
private fun SignInScreen(
    isGoogleLoading: Boolean,
    isEmailAuthLoading: Boolean,
    onGoogleSignInClick: () -> Unit,
    onGuestLoginClick: (String, String) -> Unit,
    onEmailAuthClick: (EmailAuthMode, String, String) -> Unit
) {
    var guestEmail by remember { mutableStateOf("") }
    var guestPin by remember { mutableStateOf("") }
    var isPinVisible by remember { mutableStateOf(false) }
    var emailAuthMode by remember { mutableStateOf(EmailAuthMode.Login) }
    var authEmail by remember { mutableStateOf("") }
    var authPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isAuthPasswordVisible by remember { mutableStateOf(false) }
    var isConfirmPasswordVisible by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // Gradient background
    val gradientColors = listOf(
        Color(0xFF1A1F2E),
        Color(0xFF2E3440),
        Color(0xFF3B4252)
    )

    // Logo animation
    val infiniteTransition = rememberInfiniteTransition(label = "logo_pulse")
    val logoScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logo_scale"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(gradientColors)
            )
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .windowInsetsPadding(WindowInsets.systemBars)
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // Top Section - Logo and Title
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // App Logo with animation
                Card(
                    modifier = Modifier
                        .size(120.dp)
                        .scale(logoScale),
                    shape = RoundedCornerShape(28.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.White.copy(alpha = 0.15f)
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.chat_promo),
                            contentDescription = "App Logo",
                            modifier = Modifier.size(90.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // App Title
                Text(
                    text = "ChatsPromo",
                    fontSize = 42.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color(0xFF10B981),
                    letterSpacing = 1.sp
                )
            }

            // Middle Section - Sign In Button
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Network Status
                NetworkStatusIndicator()

                Spacer(modifier = Modifier.height(32.dp))

                // Main CTA Text
                Text(
                    text = "Get Started",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Google se sign in karein ya apna khud ka email aur password use karein",
                    fontSize = 15.sp,
                    color = Color.White.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center,
                    lineHeight = 22.sp
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Enhanced Google Sign-In Button
                EnhancedGoogleSignInButton(
                    onClick = {
                        onGoogleSignInClick()
                    },
                    isLoading = isGoogleLoading
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Divider with "OR"
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Divider(
                        modifier = Modifier.weight(1f),
                        color = Color.White.copy(alpha = 0.3f),
                        thickness = 1.dp
                    )
                    Text(
                        text = "OR",
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                    Divider(
                        modifier = Modifier.weight(1f),
                        color = Color.White.copy(alpha = 0.3f),
                        thickness = 1.dp
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = Color.White.copy(alpha = 0.08f)
                    ),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        Color.White.copy(alpha = 0.15f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Text(
                            text = "More Login Options",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )

                        Text(
                            text = "Account nahi hai to signup karein. Baad me isi email aur password se login kar sakte hain.",
                            fontSize = 13.sp,
                            lineHeight = 20.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            AuthModeButton(
                                label = "Login",
                                isSelected = emailAuthMode == EmailAuthMode.Login,
                                modifier = Modifier.weight(1f)
                            ) {
                                emailAuthMode = EmailAuthMode.Login
                            }

                            AuthModeButton(
                                label = "Sign Up",
                                isSelected = emailAuthMode == EmailAuthMode.SignUp,
                                modifier = Modifier.weight(1f)
                            ) {
                                emailAuthMode = EmailAuthMode.SignUp
                            }
                        }

                        OutlinedTextField(
                            value = authEmail,
                            onValueChange = { authEmail = it },
                            label = { Text("Email", color = Color.White.copy(alpha = 0.7f)) },
                            placeholder = { Text("you@example.com", color = Color.White.copy(alpha = 0.45f)) },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.Email,
                                    contentDescription = "Email",
                                    tint = Color(0xFF10B981)
                                )
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            colors = authTextFieldColors(),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        AuthPasswordField(
                            value = authPassword,
                            onValueChange = { authPassword = it },
                            label = "Password",
                            placeholder = if (emailAuthMode == EmailAuthMode.SignUp) {
                                "Create password"
                            } else {
                                "Enter password"
                            },
                            isVisible = isAuthPasswordVisible,
                            onVisibilityToggle = { isAuthPasswordVisible = !isAuthPasswordVisible }
                        )

                        if (emailAuthMode == EmailAuthMode.SignUp) {
                            AuthPasswordField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it },
                                label = "Confirm Password",
                                placeholder = "Password dobara daliyega",
                                isVisible = isConfirmPasswordVisible,
                                onVisibilityToggle = {
                                    isConfirmPasswordVisible = !isConfirmPasswordVisible
                                }
                            )
                        }

                        ElevatedButton(
                            onClick = {
                                val normalizedEmail = authEmail.trim()
                                when {
                                    normalizedEmail.isBlank() || authPassword.isBlank() -> {
                                        Toast.makeText(
                                            context,
                                            "Email aur password daliyega",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                    !Patterns.EMAIL_ADDRESS.matcher(normalizedEmail).matches() -> {
                                        Toast.makeText(
                                            context,
                                            "Valid email address daliyega",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                    authPassword.length < 6 -> {
                                        Toast.makeText(
                                            context,
                                            "Password kam se kam 6 characters ka hona chahiye",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                    emailAuthMode == EmailAuthMode.SignUp && confirmPassword != authPassword -> {
                                        Toast.makeText(
                                            context,
                                            "Password match nahi kar raha",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                    else -> onEmailAuthClick(
                                        emailAuthMode,
                                        normalizedEmail,
                                        authPassword
                                    )
                                }
                            },
                            enabled = !isEmailAuthLoading,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            colors = ButtonDefaults.elevatedButtonColors(
                                containerColor = Color(0xFF0EA5E9),
                                contentColor = Color.White,
                                disabledContainerColor = Color(0xFF0EA5E9).copy(alpha = 0.5f)
                            ),
                            elevation = ButtonDefaults.elevatedButtonElevation(
                                defaultElevation = 6.dp,
                                pressedElevation = 10.dp
                            ),
                            shape = RoundedCornerShape(18.dp)
                        ) {
                            if (isEmailAuthLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    strokeWidth = 2.dp,
                                    color = Color.White
                                )
                            } else {
                                Icon(
                                    imageVector = if (emailAuthMode == EmailAuthMode.SignUp) {
                                        Icons.Default.Email
                                    } else {
                                        Icons.Default.Login
                                    },
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = if (emailAuthMode == EmailAuthMode.SignUp) {
                                        "Create Account"
                                    } else {
                                        "Login with Email"
                                    },
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Text(
                            text = if (emailAuthMode == EmailAuthMode.SignUp) {
                                "Signup ke baad app aapko details form par le jayega."
                            } else {
                                "Agar account bana chuke hain to same email aur password se login karein."
                            },
                            fontSize = 12.sp,
                            lineHeight = 18.sp,
                            color = Color.White.copy(alpha = 0.6f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Guest Login Section
                Text(
                    text = "Guest Login",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Email Input Field
                OutlinedTextField(
                    value = guestEmail,
                    onValueChange = { guestEmail = it },
                    label = { Text("Email", color = Color.White.copy(alpha = 0.7f)) },
                    placeholder = { Text("guest1234@gmail.com", color = Color.White.copy(alpha = 0.5f)) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = "Email",
                            tint = Color(0xFF10B981)
                        )
                    },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF10B981),
                        unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                        cursorColor = Color(0xFF10B981)
                    ),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                // PIN Input Field
                OutlinedTextField(
                    value = guestPin,
                    onValueChange = { guestPin = it },
                    label = { Text("PIN", color = Color.White.copy(alpha = 0.7f)) },
                    placeholder = { Text("Enter 4-digit PIN", color = Color.White.copy(alpha = 0.5f)) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "PIN",
                            tint = Color(0xFF10B981)
                        )
                    },
                    trailingIcon = {
                        IconButton(onClick = { isPinVisible = !isPinVisible }) {
                            Icon(
                                imageVector = if (isPinVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                contentDescription = if (isPinVisible) "Hide PIN" else "Show PIN",
                                tint = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    },
                    visualTransformation = if (isPinVisible) androidx.compose.ui.text.input.VisualTransformation.None else androidx.compose.ui.text.input.PasswordVisualTransformation(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF10B981),
                        unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                        cursorColor = Color(0xFF10B981)
                    ),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Guest Login Button
                ElevatedButton(
                    onClick = {
                        if (guestEmail.isNotBlank() && guestPin.isNotBlank()) {
                            onGuestLoginClick(guestEmail.trim(), guestPin.trim())
                        } else {
                            Toast.makeText(context, "Please enter email and PIN", Toast.LENGTH_SHORT).show()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.elevatedButtonColors(
                        containerColor = Color(0xFF10B981),
                        contentColor = Color.White
                    ),
                    elevation = ButtonDefaults.elevatedButtonElevation(
                        defaultElevation = 6.dp,
                        pressedElevation = 10.dp
                    ),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Login,
                        contentDescription = "Login",
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Login as Guest",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Guest option demo access ke liye hai. Regular use ke liye email/password ya Google login better rahega.",
                    fontSize = 12.sp,
                    lineHeight = 18.sp,
                    color = Color.White.copy(alpha = 0.55f),
                    textAlign = TextAlign.Center
                )
            }

            // Bottom Section - Terms
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "By signing in, you agree to our Terms & Privacy Policy",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.5f),
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
        }
    }
}

@Composable
private fun AuthModeButton(
    label: String,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(46.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isSelected) Color(0xFF10B981) else Color.White.copy(alpha = 0.08f),
            contentColor = Color.White
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isSelected) Color.Transparent else Color.White.copy(alpha = 0.16f)
        ),
        shape = RoundedCornerShape(14.dp)
    ) {
        Text(
            text = label,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun AuthPasswordField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    isVisible: Boolean,
    onVisibilityToggle: () -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = Color.White.copy(alpha = 0.7f)) },
        placeholder = { Text(placeholder, color = Color.White.copy(alpha = 0.45f)) },
        leadingIcon = {
            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = label,
                tint = Color(0xFF10B981)
            )
        },
        trailingIcon = {
            IconButton(onClick = onVisibilityToggle) {
                Icon(
                    imageVector = if (isVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                    contentDescription = if (isVisible) "Hide password" else "Show password",
                    tint = Color.White.copy(alpha = 0.7f)
                )
            }
        },
        singleLine = true,
        visualTransformation = if (isVisible) {
            androidx.compose.ui.text.input.VisualTransformation.None
        } else {
            PasswordVisualTransformation()
        },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        colors = authTextFieldColors(),
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun authTextFieldColors(): TextFieldColors {
    return OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        focusedBorderColor = Color(0xFF10B981),
        unfocusedBorderColor = Color.White.copy(alpha = 0.45f),
        focusedLabelColor = Color(0xFF10B981),
        cursorColor = Color(0xFF10B981)
    )
}

@Composable
fun NetworkStatusIndicator() {
    val context = LocalContext.current
    val isNetworkAvailable = DeviceUtils.isNetworkAvailable(context)

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            imageVector = if (isNetworkAvailable) Icons.Default.Wifi else Icons.Default.WifiOff,
            contentDescription = "Network Status",
            tint = if (isNetworkAvailable) Color.Green else Color.Red,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = if (isNetworkAvailable) "Connected" else "No Internet Connection",
            color = if (isNetworkAvailable) Color.Green else Color.Red,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun EnhancedGoogleSignInButton(
    onClick: () -> Unit,
    isLoading: Boolean
) {
    val buttonScale by animateFloatAsState(
        targetValue = if (isLoading) 0.95f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "button_scale"
    )

    // Lottie animation composition
    val composition by rememberLottieComposition(
        LottieCompositionSpec.Asset("google.json")
    )
    
    val progress by animateLottieCompositionAsState(
        composition = composition,
        iterations = LottieConstants.IterateForever,
        isPlaying = !isLoading
    )
    
    // Animated shimmer effect for border
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val shimmerAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "shimmer_alpha"
    )

    ElevatedButton(
        onClick = onClick,
        enabled = !isLoading,
        modifier = Modifier
            .fillMaxWidth()
            .height(64.dp)
            .scale(buttonScale),
        colors = ButtonDefaults.elevatedButtonColors(
            containerColor = Color.White,
            contentColor = Color(0xFF1F1F1F),
            disabledContainerColor = Color.White.copy(alpha = 0.7f)
        ),
        elevation = ButtonDefaults.elevatedButtonElevation(
            defaultElevation = 8.dp,
            pressedElevation = 12.dp,
            disabledElevation = 4.dp
        ),
        shape = RoundedCornerShape(32.dp),
        border = androidx.compose.foundation.BorderStroke(
            width = 3.dp,
            brush = Brush.sweepGradient(
                colors = listOf(
                    Color(0xFF4285F4),
                    Color(0xFF34A853),
                    Color(0xFFFBBC05),
                    Color(0xFFEA4335),
                    Color(0xFF4285F4)
                )
            )
        )
    ) {
        if (isLoading) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(28.dp),
                    color = Color(0xFF4285F4),
                    strokeWidth = 3.dp
                )
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = "Signing you in...",
                    color = Color(0xFF1F1F1F),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                // Lottie Google Logo Animation
                LottieAnimation(
                    composition = composition,
                    progress = { progress },
                    modifier = Modifier.size(48.dp)
                )

                Spacer(modifier = Modifier.width(16.dp))

                Text(
                    text = "Sign in with Google",
                    color = Color(0xFF1F1F1F),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
            }
        }
    }
}



@Composable
fun GoogleIcon(
    modifier: Modifier = Modifier,
    tint: Color = Color.White
) {
    // Simple "G" text as Google icon
    Box(
        modifier = modifier
            .size(24.dp)
            .background(
                color = Color.White.copy(alpha = 0.2f),
                shape = CircleShape
            ),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "G",
            color = tint,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
