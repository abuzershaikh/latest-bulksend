package com.message.bulksend.referral

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.CurrencyRupee
import androidx.compose.material.icons.filled.DesktopWindows
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.decode.SvgDecoder
import coil.request.ImageRequest
import com.google.firebase.auth.FirebaseAuth
import com.message.bulksend.ui.theme.BulksendTestTheme

private const val RESELLER_WHATSAPP_NUMBER = "919137167857"
private const val RESELLER_BANNER_ASPECT_RATIO = 16f / 9f

class ResellerProgramActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            BulksendTestTheme {
                ResellerProgramScreen(onBackPressed = { finish() })
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResellerProgramScreen(onBackPressed: () -> Unit) {
    val context = LocalContext.current
    val whatsappMessage = remember { buildResellerMessage(context) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Reseller Program", fontWeight = FontWeight.Bold, color = Color.White)
                },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0B1324))
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color(0xFF0B1324), Color(0xFF132238), Color(0xFF1E293B))
                    )
                )
                .padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(18.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    HeroCard(
                        title = "Resell Desktop and Android BulkSender App",
                        subtitle = "Join the reseller program and earn 60% on-the-spot on every successful sale.",
                        whatsappMessage = whatsappMessage,
                        onContactClick = { openResellerWhatsApp(context, whatsappMessage) }
                    )
                }
                item {
                    ProductCard(
                        icon = Icons.Default.DesktopWindows,
                        title = "BulkSend Windows Desktop App",
                        description = "Offer the desktop sender to businesses that need fast WhatsApp outreach, campaign control, and desktop-based bulk messaging."
                    )
                }
                item {
                    ProductCard(
                        icon = Icons.Default.Android,
                        title = "ChatsPromo Android App",
                        description = "Resell the Android app to customers who want mobile-friendly bulk sending, automation tools, and easy day-to-day WhatsApp marketing."
                    )
                }
                item {
                    DetailCard(
                        title = "Why resellers join",
                        lines = listOf(
                            "Earn 60% on the spot when your referred customer closes the deal.",
                            "Promote both the Windows app and the Android app from one reseller program.",
                            "Use WhatsApp to get onboarding, pricing, and reseller guidance directly."
                        )
                    )
                }
                item {
                    DetailCard(
                        title = "How to start",
                        lines = listOf(
                            "Tap the button below to send a ready WhatsApp message.",
                            "We will share reseller details, pricing, and the next onboarding steps.",
                            "After joining, you can start reselling the apps and earning from your sales."
                        ),
                        buttonLabel = "Ask Pricing on WhatsApp",
                        onContactClick = { openResellerWhatsApp(context, whatsappMessage) }
                    )
                }
                item {
                    ActionCard(
                        onJoinClick = { openResellerWhatsApp(context, whatsappMessage) }
                    )
                }
            }
        }
    }
}

@Composable
private fun HeroCard(
    title: String,
    subtitle: String,
    whatsappMessage: String,
    onContactClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111C33))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF1D4ED8), Color(0xFF0F172A))
                    )
                )
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Surface(
                color = Color.White.copy(alpha = 0.14f),
                shape = RoundedCornerShape(999.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CurrencyRupee,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "60% on-the-spot reseller earning",
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                }
            }

            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 28.sp,
                lineHeight = 34.sp
            )
            Text(
                text = subtitle,
                color = Color(0xFFE2E8F0),
                fontSize = 15.sp,
                lineHeight = 22.sp
            )
            ResellerBanner()
            Text(
                text = whatsappMessage,
                color = Color(0xFFBFDBFE),
                fontSize = 12.sp,
                lineHeight = 18.sp
            )
            Button(
                onClick = onContactClick,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Chat,
                    contentDescription = null,
                    tint = Color(0xFF052E16)
                )
                Spacer(modifier = Modifier.size(8.dp))
                Text(
                    text = "Contact on WhatsApp",
                    color = Color(0xFF052E16),
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun ResellerBanner() {
    val context = LocalContext.current
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                color = Color.White.copy(alpha = 0.16f),
                shape = RoundedCornerShape(28.dp)
            ),
        color = Color(0xFF07111E).copy(alpha = 0.92f),
        shape = RoundedCornerShape(28.dp),
        shadowElevation = 18.dp,
        tonalElevation = 6.dp
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF0E2136),
                            Color(0xFF122A45),
                            Color(0xFF1B4D7A)
                        )
                    )
                )
                .padding(12.dp),
            contentAlignment = Alignment.Center
        ) {
            AsyncImage(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 560.dp)
                    .aspectRatio(RESELLER_BANNER_ASPECT_RATIO)
                    .clip(RoundedCornerShape(22.dp)),
                model = ImageRequest.Builder(context)
                    .data("file:///android_asset/reseller.svg")
                    .decoderFactory(SvgDecoder.Factory())
                    .crossfade(true)
                    .build(),
                contentDescription = "Reseller banner",
                contentScale = ContentScale.Fit
            )
        }
    }
}

@Composable
private fun ProductCard(icon: ImageVector, title: String, description: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.98f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.Top
        ) {
            Surface(
                color = Color(0xFFDBEAFE),
                shape = RoundedCornerShape(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = Color(0xFF1D4ED8)
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color(0xFF0F172A),
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = description,
                    color = Color(0xFF475569),
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
            }
        }
    }
}

@Composable
private fun DetailCard(
    title: String,
    lines: List<String>,
    buttonLabel: String? = null,
    onContactClick: (() -> Unit)? = null
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A).copy(alpha = 0.9f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
            lines.forEach { line ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.Storefront,
                        contentDescription = null,
                        tint = Color(0xFF60A5FA),
                        modifier = Modifier
                            .padding(top = 2.dp)
                            .size(16.dp)
                    )
                    Text(
                        text = line,
                        color = Color(0xFFE2E8F0),
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                }
            }
            if (!buttonLabel.isNullOrBlank() && onContactClick != null) {
                Button(
                    onClick = onContactClick,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Chat,
                        contentDescription = null,
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.size(8.dp))
                    Text(buttonLabel, color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun ActionCard(onJoinClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFDCFCE7))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.Chat,
                contentDescription = null,
                tint = Color(0xFF166534),
                modifier = Modifier.size(40.dp)
            )
            Text(
                text = "Ready to join the reseller program?",
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp,
                color = Color(0xFF14532D),
                textAlign = TextAlign.Center
            )
            Text(
                text = "Send the prepared WhatsApp message and get onboarding details for reselling both apps.",
                color = Color(0xFF166534),
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )
            Button(
                onClick = onJoinClick,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF15803D)),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = null,
                    tint = Color.White
                )
                Spacer(modifier = Modifier.size(8.dp))
                Text("Join Reseller Program on WhatsApp", color = Color.White)
            }
        }
    }
}

private fun buildResellerMessage(context: Context): String {
    val currentUser = FirebaseAuth.getInstance().currentUser
    val savedPrefs = context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
    val fullName = currentUser?.displayName?.trim().orEmpty()
        .ifBlank { savedPrefs.getString("full_name", "").orEmpty().trim() }
    val email = currentUser?.email?.trim().orEmpty()

    return buildString {
        appendLine("Hi, I want to join the reseller program.")
        appendLine()
        appendLine("I want to resell:")
        appendLine("- BulkSend Windows desktop app")
        appendLine("- ChatsPromo Android app")
        appendLine()
        appendLine("I understand the reseller program gives 60% on-the-spot on successful sales. Please share pricing, onboarding, and next steps.")
        if (fullName.isNotBlank() || email.isNotBlank()) {
            appendLine()
            if (fullName.isNotBlank()) {
                appendLine("Name: $fullName")
            }
            if (email.isNotBlank()) {
                appendLine("Email: $email")
            }
        }
    }.trim()
}

private fun openResellerWhatsApp(context: Context, message: String) {
    val encodedMessage = Uri.encode(message)
    val whatsappUri = Uri.parse("https://wa.me/$RESELLER_WHATSAPP_NUMBER?text=$encodedMessage")
    val intent = Intent(Intent.ACTION_VIEW, whatsappUri).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    try {
        context.startActivity(intent)
    } catch (_: ActivityNotFoundException) {
        Toast.makeText(context, "Unable to open WhatsApp right now.", Toast.LENGTH_SHORT).show()
    }
}
