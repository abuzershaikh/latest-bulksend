package com.message.bulksend.bulksenderaiagent

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.Button
import androidx.compose.material.ButtonDefaults
import androidx.compose.material.Card
import androidx.compose.material.CircularProgressIndicator
import androidx.compose.material.DropdownMenu
import androidx.compose.material.DropdownMenuItem
import androidx.compose.material.FloatingActionButton
import androidx.compose.material.Icon
import androidx.compose.material.IconButton
import androidx.compose.material.MaterialTheme
import androidx.compose.material.OutlinedButton
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.material.TextFieldDefaults
import androidx.compose.material.TextButton
import androidx.compose.material.TopAppBar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.TableChart
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.message.bulksend.contactmanager.Group

@Composable
fun AiAgentScreen(
    viewModel: ChatViewModel,
    onAddContactClick: () -> Unit,
    onLanguageSelected: (ChatLanguage) -> Unit,
    onPickAttachment: (AttachmentKind) -> Unit,
    onOpenAccessibilitySettings: () -> Unit,
    onOpenOverlaySettings: () -> Unit,
    onRequestNotificationPermission: () -> Unit,
    loadingVoiceMessageId: String?,
    playingVoiceMessageId: String?,
    onRequestVoicePlayback: (ChatMessage, Boolean) -> Unit,
    onRefreshPermissions: () -> Unit,
    onLaunchCampaign: () -> Unit
) {
    var messageText by remember { mutableStateOf("") }
    var isLanguageMenuExpanded by remember { mutableStateOf(false) }
    var autoPlayedVoiceIds by rememberSaveable { mutableStateOf(emptyList<String>()) }
    val messages by viewModel.messages.collectAsState()
    val groups by viewModel.groups.collectAsState()
    val draft by viewModel.draft.collectAsState()
    val language by viewModel.language.collectAsState()
    val step by viewModel.step.collectAsState()
    val attachmentRequest by viewModel.attachmentRequest.collectAsState()
    val permissionChecklist by viewModel.permissionChecklist.collectAsState()
    val listState = rememberLazyListState()
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    LaunchedEffect(messages) {
        val latestPlayableBotMessage = messages.lastOrNull {
            it.type == MessageType.TEXT_BOT && it.voiceRequest != null
        } ?: return@LaunchedEffect

        if (latestPlayableBotMessage.id !in autoPlayedVoiceIds) {
            autoPlayedVoiceIds = autoPlayedVoiceIds + latestPlayableBotMessage.id
            onRequestVoicePlayback(latestPlayableBotMessage, false)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFEFE6DD))
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color(0xFF008069),
            elevation = 4.dp
        ) {
            Column {
                Spacer(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                )

                TopAppBar(
                    title = {
                        Text(
                            localized(language, "AI Campaign Guide", "AI Campaign Guide"),
                            color = Color.White
                        )
                    },
                    actions = {
                        Box {
                            TextButton(onClick = { isLanguageMenuExpanded = true }) {
                                Text(
                                    text = AgentLanguageText.label(language),
                                    color = Color.White
                                )
                                Icon(
                                    imageVector = Icons.Filled.ArrowDropDown,
                                    contentDescription = localized(language, "Select language", "Language select karo"),
                                    tint = Color.White
                                )
                            }

                            DropdownMenu(
                                expanded = isLanguageMenuExpanded,
                                onDismissRequest = { isLanguageMenuExpanded = false }
                            ) {
                                AgentLanguageText.all().forEach { option ->
                                    DropdownMenuItem(
                                        onClick = {
                                            isLanguageMenuExpanded = false
                                            onLanguageSelected(option)
                                        }
                                    ) {
                                        Text(AgentLanguageText.label(option))
                                    }
                                }
                            }
                        }
                    },
                    backgroundColor = Color(0xFF008069),
                    elevation = 0.dp
                )
            }
        }

        LazyColumn(
            state = listState,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(messages, key = { it.id }) { message ->
                ChatItem(
                    message = message,
                    groups = groups,
                    draft = draft,
                    language = language,
                    step = step,
                    attachmentRequest = attachmentRequest,
                    permissionChecklist = permissionChecklist,
                    onAddContactClick = onAddContactClick,
                    onOptionSelected = viewModel::onOptionSelected,
                    onGroupSelected = viewModel::onGroupSelected,
                    onCampaignTypeSelected = { type ->
                        focusManager.clearFocus(force = true)
                        keyboardController?.hide()
                        viewModel.onCampaignTypeSelected(type)
                    },
                    onWhatsAppTargetSelected = { target ->
                        focusManager.clearFocus(force = true)
                        keyboardController?.hide()
                        viewModel.onWhatsAppTargetSelected(target)
                    },
                    onPickAttachment = onPickAttachment,
                    onOpenAccessibilitySettings = onOpenAccessibilitySettings,
                    onOpenOverlaySettings = onOpenOverlaySettings,
                    onRequestNotificationPermission = onRequestNotificationPermission,
                    loadingVoiceMessageId = loadingVoiceMessageId,
                    playingVoiceMessageId = playingVoiceMessageId,
                    onRequestVoicePlayback = onRequestVoicePlayback,
                    onRefreshPermissions = onRefreshPermissions,
                    onLaunchCampaign = onLaunchCampaign
                )
            }
        }

        ChatInputBar(
            text = messageText,
            placeholder = placeholderForStep(step, language),
            onTextChange = { messageText = it },
            onSend = {
                if (messageText.isNotBlank()) {
                    if (step == AgentStep.ENTER_MESSAGE) {
                        focusManager.clearFocus(force = true)
                        keyboardController?.hide()
                    }
                    viewModel.sendMessage(messageText)
                    messageText = ""
                }
            },
            imeAction = if (step == AgentStep.ENTER_MESSAGE) ImeAction.Send else ImeAction.Default
        )
    }
}

@Composable
private fun ChatItem(
    message: ChatMessage,
    groups: List<Group>,
    draft: CampaignDraft,
    language: ChatLanguage,
    step: AgentStep,
    attachmentRequest: AttachmentRequest?,
    permissionChecklist: PermissionChecklist,
    onAddContactClick: () -> Unit,
    onOptionSelected: (String) -> Unit,
    onGroupSelected: (Group) -> Unit,
    onCampaignTypeSelected: (CampaignType) -> Unit,
    onWhatsAppTargetSelected: (WhatsAppTarget) -> Unit,
    onPickAttachment: (AttachmentKind) -> Unit,
    onOpenAccessibilitySettings: () -> Unit,
    onOpenOverlaySettings: () -> Unit,
    onRequestNotificationPermission: () -> Unit,
    loadingVoiceMessageId: String?,
    playingVoiceMessageId: String?,
    onRequestVoicePlayback: (ChatMessage, Boolean) -> Unit,
    onRefreshPermissions: () -> Unit,
    onLaunchCampaign: () -> Unit
) {
    when (message.type) {
        MessageType.TEXT_BOT -> BotMessageBubble(
            text = message.text,
            language = language,
            isLoadingVoice = loadingVoiceMessageId == message.id,
            isPlayingVoice = playingVoiceMessageId == message.id,
            onPlayVoice = message.voiceRequest?.let {
                { onRequestVoicePlayback(message, false) }
            }
        )
        MessageType.TEXT_USER -> UserMessageBubble(message.text)
        MessageType.CARD_ADD_CONTACT -> {
            if (!draft.hasGroup() && step == AgentStep.WAITING_FOR_CONTACTS) {
                AddContactCard(language, onAddContactClick)
            }
        }
        MessageType.CHIPS_CONTACT_OPTIONS -> {
            if (step == AgentStep.SELECT_CONTACT_SOURCE) {
                ContactOptionsChips(language, onOptionSelected)
            }
        }
        MessageType.CARD_GROUP_LIST -> {
            if (groups.isNotEmpty() && (step == AgentStep.SELECT_GROUP || draft.hasGroup())) {
                GroupListCard(
                    groups = groups,
                    language = language,
                    selectedGroupId = draft.selectedGroupId,
                    onGroupSelected = onGroupSelected
                )
            }
        }
        MessageType.CARD_CAMPAIGN_TYPES -> {
            if (draft.message.isNotBlank() && (step == AgentStep.SELECT_CAMPAIGN_TYPE || draft.campaignType != null)) {
                CampaignTypeCardRow(
                    language = language,
                    selectedType = draft.campaignType,
                    onCampaignTypeSelected = onCampaignTypeSelected
                )
            }
        }
        MessageType.CARD_WHATSAPP_APPS -> {
            val availableTargets = permissionChecklist.availableWhatsAppTargets()
            if (availableTargets.isNotEmpty() && (step == AgentStep.SELECT_WHATSAPP_APP || draft.whatsAppTarget != null)) {
                WhatsAppTargetCardRow(
                    language = language,
                    availableTargets = availableTargets,
                    selectedTarget = draft.whatsAppTarget,
                    onWhatsAppTargetSelected = onWhatsAppTargetSelected
                )
            }
        }
        MessageType.CARD_ATTACHMENT_REQUEST -> {
            attachmentRequest?.let {
                AttachmentRequestCard(
                    language = language,
                    request = it,
                    currentFileName = if (it.kind == AttachmentKind.MEDIA) draft.mediaName else draft.sheetName,
                    onPick = { onPickAttachment(it.kind) }
                )
            }
        }
        MessageType.CARD_PERMISSION_CHECKLIST -> {
            if (draft.isSetupComplete()) {
                PermissionChecklistCard(
                    language = language,
                    permissionChecklist = permissionChecklist,
                    onOpenAccessibilitySettings = onOpenAccessibilitySettings,
                    onOpenOverlaySettings = onOpenOverlaySettings,
                    onRequestNotificationPermission = onRequestNotificationPermission,
                    onRefreshPermissions = onRefreshPermissions
                )
            }
        }
        MessageType.CARD_LAUNCH_CAMPAIGN -> {
            if (draft.isSetupComplete() && draft.whatsAppTarget != null && permissionChecklist.requiredReady) {
                LaunchCampaignCard(
                    draft = draft,
                    language = language,
                    onLaunchCampaign = onLaunchCampaign
                )
            }
        }
    }
}

@Composable
private fun WhatsAppTargetCardRow(
    language: ChatLanguage,
    availableTargets: List<WhatsAppTarget>,
    selectedTarget: WhatsAppTarget?,
    onWhatsAppTargetSelected: (WhatsAppTarget) -> Unit
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(availableTargets) { target ->
            val accent = when (target) {
                WhatsAppTarget.WHATSAPP -> Color(0xFF25D366)
                WhatsAppTarget.BUSINESS -> Color(0xFF128C7E)
            }
            val isSelected = selectedTarget == target

            Card(
                modifier = Modifier
                    .width(210.dp)
                    .height(138.dp)
                    .clickable { onWhatsAppTargetSelected(target) },
                backgroundColor = Color.White,
                shape = RoundedCornerShape(18.dp),
                elevation = 4.dp,
                border = BorderStroke(
                    width = if (isSelected) 2.dp else 1.dp,
                    color = if (isSelected) accent else Color(0xFFE0E0E0)
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .background(accent.copy(alpha = 0.14f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = when (target) {
                                    WhatsAppTarget.WHATSAPP -> Icons.Filled.Chat
                                    WhatsAppTarget.BUSINESS -> Icons.Filled.Business
                                },
                                contentDescription = null,
                                tint = accent
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = target.displayTitle(language),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = target.displayDescription(language),
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }

                    if (isSelected) {
                        StatusTag(
                            text = localized(language, "Selected", "Select Ho Gaya"),
                            background = accent.copy(alpha = 0.16f),
                            textColor = accent
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BotMessageBubble(
    text: String,
    language: ChatLanguage,
    isLoadingVoice: Boolean,
    isPlayingVoice: Boolean,
    onPlayVoice: (() -> Unit)?
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Start
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.86f)
                .padding(end = 42.dp),
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp, bottomStart = 10.dp, bottomEnd = 24.dp),
            color = Color(0xFFFFFCF7),
            elevation = 4.dp,
            border = BorderStroke(1.dp, Color(0x22008069))
        ) {
            Column(modifier = Modifier.padding(horizontal = 15.dp, vertical = 13.dp)) {
                Text(
                    text = text,
                    color = Color(0xFF1F2A24),
                    fontSize = 15.sp,
                    lineHeight = 21.sp
                )

                if (onPlayVoice != null) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(18.dp),
                            color = Color(0x14008069)
                        ) {
                            Row(
                                modifier = Modifier.padding(start = 10.dp, end = 6.dp, top = 5.dp, bottom = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (isLoadingVoice) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(14.dp),
                                        color = Color(0xFF008069),
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                }

                                Text(
                                    text = when {
                                        isLoadingVoice -> localized(language, "Preparing voice", "Voice bana raha hoon")
                                        isPlayingVoice -> localized(language, "Speaking", "Bol raha hai")
                                        else -> localized(language, "Play voice", "Voice Chalao")
                                    },
                                    color = Color(0xFF008069),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(modifier = Modifier.width(2.dp))
                                IconButton(
                                    onClick = onPlayVoice,
                                    enabled = !isLoadingVoice,
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isPlayingVoice) Icons.Filled.GraphicEq else Icons.AutoMirrored.Filled.VolumeUp,
                                        contentDescription = localized(language, "Play voice", "Voice Chalao"),
                                        tint = Color(0xFF008069)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun UserMessageBubble(text: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.End
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.82f)
                .padding(start = 46.dp),
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp, bottomStart = 24.dp, bottomEnd = 10.dp),
            color = Color(0xFFD9FDD3),
            elevation = 4.dp,
            border = BorderStroke(1.dp, Color(0x1F008069))
        ) {
            Text(
                text = text,
                modifier = Modifier.padding(horizontal = 15.dp, vertical = 13.dp),
                color = Color(0xFF102117),
                fontSize = 15.sp,
                lineHeight = 21.sp
            )
        }
    }
}

@Composable
private fun AddContactCard(language: ChatLanguage, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center
    ) {
        Card(
            modifier = Modifier
                .padding(vertical = 6.dp)
                .clickable { onClick() },
            shape = RoundedCornerShape(18.dp),
            elevation = 5.dp,
            backgroundColor = Color.White
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .background(Color(0xFF008069), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.Add, contentDescription = null, tint = Color.White)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = localized(language, "Add Contact Now", "Abhi Group Banao"),
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF008069),
                        fontSize = 16.sp
                    )
                    Text(
                        text = localized(language, "Create a group and come back here", "Group banao aur chat me wapas aao"),
                        color = Color.Gray,
                        fontSize = 12.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun ContactOptionsChips(language: ChatLanguage, onOptionSelected: (String) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center
    ) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = Color(0xFF008069),
            modifier = Modifier
                .padding(end = 8.dp)
                .clickable { onOptionSelected("old") }
        ) {
            Text(
                text = localized(language, "Use Existing Group", "Saved Group Use Karo"),
                color = Color.White,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
                fontSize = 13.sp
            )
        }

        Surface(
            shape = RoundedCornerShape(18.dp),
            color = Color(0xFF128C7E),
            modifier = Modifier.clickable { onOptionSelected("new") }
        ) {
            Text(
                text = localized(language, "Create New Group", "Naya Group Banao"),
                color = Color.White,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
                fontSize = 13.sp
            )
        }
    }
}

@Composable
private fun GroupListCard(
    groups: List<Group>,
    language: ChatLanguage,
    selectedGroupId: Long?,
    onGroupSelected: (Group) -> Unit
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(groups, key = { it.id }) { group ->
            val isSelected = selectedGroupId == group.id
            Card(
                modifier = Modifier
                    .width(190.dp)
                    .height(116.dp)
                    .clickable { onGroupSelected(group) },
                backgroundColor = if (isSelected) Color(0xFFD9FDD3) else Color.White,
                shape = RoundedCornerShape(16.dp),
                elevation = 4.dp,
                border = BorderStroke(
                    width = if (isSelected) 2.dp else 1.dp,
                    color = if (isSelected) Color(0xFF008069) else Color(0xFFE0E0E0)
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = group.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Color.Black,
                            maxLines = 1
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "${group.contacts.size} contacts",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        StatusTag(
                            text = if (group.isPremiumGroup) {
                                localized(language, "Premium", "Premium")
                            } else {
                                localized(language, "Saved", "Saved")
                            },
                            background = if (group.isPremiumGroup) Color(0xFFFFF0C2) else Color(0xFFE8F5E9),
                            textColor = if (group.isPremiumGroup) Color(0xFF946200) else Color(0xFF1B5E20)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        if (isSelected) {
                            Icon(
                                imageVector = Icons.Filled.CheckCircle,
                                contentDescription = null,
                                tint = Color(0xFF008069),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CampaignTypeCardRow(
    language: ChatLanguage,
    selectedType: CampaignType?,
    onCampaignTypeSelected: (CampaignType) -> Unit
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(CampaignType.values()) { type ->
            val accent = colorForCampaignType(type)
            val isSelected = selectedType == type

            Card(
                modifier = Modifier
                    .width(218.dp)
                    .height(176.dp)
                    .clickable { onCampaignTypeSelected(type) },
                backgroundColor = Color.White,
                shape = RoundedCornerShape(18.dp),
                elevation = 4.dp,
                border = BorderStroke(
                    width = if (isSelected) 2.dp else 1.dp,
                    color = if (isSelected) accent else Color(0xFFE0E0E0)
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(14.dp),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .background(accent.copy(alpha = 0.14f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = iconForCampaignType(type),
                                contentDescription = null,
                                tint = accent
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = type.displayTitle(language),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            maxLines = 2
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = type.displayDescription(language),
                            fontSize = 12.sp,
                            color = Color.Gray,
                            maxLines = 3
                        )
                    }

                    if (isSelected) {
                        StatusTag(
                            text = localized(language, "Selected", "Select Ho Gaya"),
                            background = accent.copy(alpha = 0.16f),
                            textColor = accent
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AttachmentRequestCard(
    language: ChatLanguage,
    request: AttachmentRequest,
    currentFileName: String?,
    onPick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        backgroundColor = Color.White,
        elevation = 4.dp
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(Color(0xFFFFF3E0), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (request.kind == AttachmentKind.MEDIA) Icons.Filled.Image else Icons.Filled.TableChart,
                        contentDescription = null,
                        tint = Color(0xFFF57C00)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(request.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text(request.description, color = Color.Gray, fontSize = 12.sp)
                }
            }

            if (!currentFileName.isNullOrBlank()) {
                StatusTag(
                    text = currentFileName,
                    background = Color(0xFFE8F5E9),
                    textColor = Color(0xFF1B5E20)
                )
            }

            Button(
                onClick = onPick,
                colors = ButtonDefaults.buttonColors(backgroundColor = Color(0xFF008069)),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = if (currentFileName.isNullOrBlank()) request.buttonLabel else localized(language, "Change File", "File Badlo"),
                    color = Color.White
                )
            }
        }
    }
}

@Composable
private fun PermissionChecklistCard(
    language: ChatLanguage,
    permissionChecklist: PermissionChecklist,
    onOpenAccessibilitySettings: () -> Unit,
    onOpenOverlaySettings: () -> Unit,
    onRequestNotificationPermission: () -> Unit,
    onRefreshPermissions: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        backgroundColor = Color.White,
        elevation = 4.dp
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Filled.Security,
                    contentDescription = null,
                    tint = Color(0xFF008069)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(localized(language, "Permission Check", "Permission Check"), fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }

            PermissionRow(
                language = language,
                title = localized(language, "Accessibility Service", "Accessibility Service"),
                ready = permissionChecklist.accessibilityEnabled,
                actionLabel = localized(language, "Enable", "On Karo"),
                onActionClick = onOpenAccessibilitySettings
            )
            PermissionRow(
                language = language,
                title = localized(language, "Overlay Permission", "Overlay Permission"),
                ready = permissionChecklist.overlayEnabled,
                actionLabel = localized(language, "Enable", "On Karo"),
                onActionClick = onOpenOverlaySettings
            )
            PermissionRow(
                language = language,
                title = localized(language, "Notifications", "Notifications"),
                ready = permissionChecklist.notificationsEnabled,
                actionLabel = localized(language, "Allow", "Allow Karo"),
                onActionClick = onRequestNotificationPermission
            )
            PermissionRow(
                language = language,
                title = localized(language, "WhatsApp Available", "WhatsApp Available"),
                ready = permissionChecklist.hasAnyWhatsApp,
                actionLabel = null,
                onActionClick = {}
            )

            OutlinedButton(
                onClick = onRefreshPermissions,
                border = BorderStroke(1.dp, Color(0xFF008069)),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Refresh,
                    contentDescription = null,
                    tint = Color(0xFF008069)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(localized(language, "Refresh Status", "Status Refresh Karo"), color = Color(0xFF008069))
            }
        }
    }
}

@Composable
private fun PermissionRow(
    language: ChatLanguage,
    title: String,
    ready: Boolean,
    actionLabel: String?,
    onActionClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(
                text = if (ready) localized(language, "Ready", "Ready") else localized(language, "Pending", "Abhi Pending"),
                color = if (ready) Color(0xFF1B5E20) else Color(0xFFD32F2F),
                fontSize = 12.sp
            )
        }

        if (!ready && actionLabel != null) {
            OutlinedButton(
                onClick = onActionClick,
                border = BorderStroke(1.dp, Color(0xFF008069)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(actionLabel, color = Color(0xFF008069), fontSize = 12.sp)
            }
        } else if (ready) {
            Icon(
                imageVector = Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = Color(0xFF2E7D32)
            )
        }
    }
}

@Composable
private fun LaunchCampaignCard(
    draft: CampaignDraft,
    language: ChatLanguage,
    onLaunchCampaign: () -> Unit
) {
    val pulseTransition = rememberInfiniteTransition(label = "launchPulse")
    val pulseProgress by pulseTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1250),
            repeatMode = RepeatMode.Reverse
        ),
        label = "launchPulseProgress"
    )
    val rippleColor = lerp(Color(0xFF1E88E5), Color(0xFFFF9800), pulseProgress)
    val rippleScale = 1f + (0.08f * pulseProgress)
    val rippleAlpha = 0.28f - (0.12f * pulseProgress)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        backgroundColor = Color.White,
        elevation = 5.dp,
        border = BorderStroke(1.dp, Color(0xFF008069))
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .background(Color(0xFFD9FDD3), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.Campaign,
                        contentDescription = null,
                        tint = Color(0xFF008069)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(localized(language, "Launch Filled Campaign", "Filled Campaign Launch Karo"), fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text(
                        localized(
                            language,
                            "Tap below to open the target activity with auto-filled data. After it opens, click the Launch button there.",
                            "Neeche tap karke auto-filled screen kholo. Uske baad wahan Launch button click karo."
                        ),
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }

            SummaryLine(localized(language, "Group", "Group"), draft.selectedGroupName.orEmpty())
            SummaryLine(localized(language, "Campaign Name", "Campaign Name"), draft.campaignName)
            SummaryLine(localized(language, "Message", "Message"), draft.message)
            SummaryLine(localized(language, "Type", "Type"), draft.campaignType?.displayTitle(language).orEmpty())
            SummaryLine(localized(language, "App", "App"), draft.whatsAppTarget?.displayTitle(language).orEmpty())

            if (!draft.mediaName.isNullOrBlank()) {
                SummaryLine(localized(language, "Media", "Media"), draft.mediaName)
            }
            if (!draft.sheetName.isNullOrBlank()) {
                SummaryLine(localized(language, "Sheet", "Sheet"), draft.sheetName)
            }

            Text(
                text = localized(
                    language,
                    "Notice the animated button below, then tap it to continue.",
                    "Neeche animated button dikh raha hai, use tap karke continue karo."
                ),
                color = rippleColor,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )

            Box(modifier = Modifier.fillMaxWidth()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp)
                        .graphicsLayer {
                            scaleX = rippleScale
                            scaleY = rippleScale
                            alpha = rippleAlpha
                        }
                        .background(rippleColor.copy(alpha = 0.22f), RoundedCornerShape(16.dp))
                )

                Button(
                    onClick = onLaunchCampaign,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(backgroundColor = rippleColor),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(localized(language, "Open Filled Screen", "Filled Screen Khol Do"), color = Color.White)
                }
            }
        }
    }
}

@Composable
private fun SummaryLine(label: String, value: String) {
    Column {
        Text(label, color = Color.Gray, fontSize = 11.sp)
        Text(value, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }
}

@Composable
private fun StatusTag(
    text: String,
    background: Color,
    textColor: Color
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = background
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun ChatInputBar(
    text: String,
    placeholder: String,
    onTextChange: (String) -> Unit,
    onSend: () -> Unit,
    imeAction: ImeAction
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .imePadding()
            .padding(8.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        Surface(
            modifier = Modifier
                .weight(1f)
                .padding(end = 8.dp),
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            elevation = 2.dp
        ) {
            TextField(
                value = text,
                onValueChange = onTextChange,
                placeholder = { Text(placeholder) },
                colors = TextFieldDefaults.textFieldColors(
                    backgroundColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                keyboardOptions = KeyboardOptions(imeAction = imeAction),
                keyboardActions = KeyboardActions(
                    onSend = { onSend() },
                    onDone = { onSend() }
                ),
                maxLines = 6,
                modifier = Modifier.fillMaxWidth()
            )
        }

        FloatingActionButton(
            onClick = onSend,
            backgroundColor = Color(0xFF008069),
            contentColor = Color.White,
            modifier = Modifier.size(48.dp)
        ) {
            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send")
        }
    }
}

private fun placeholderForStep(step: AgentStep, language: ChatLanguage): String {
    return when (step) {
        AgentStep.ENTER_CAMPAIGN_NAME -> localized(language, "Type the campaign name...", "Campaign ka naam likho...")
        AgentStep.ENTER_MESSAGE -> localized(language, "Type the campaign message...", "Campaign ka message likho...")
        AgentStep.SELECT_GROUP -> localized(language, "Type the group name or tap a card...", "Group ka naam likho ya card tap karo...")
        AgentStep.SELECT_CAMPAIGN_TYPE -> localized(language, "Type text, caption, media, or sheet...", "Text, caption, media ya sheet likho...")
        AgentStep.SELECT_WHATSAPP_APP -> localized(language, "Type WhatsApp or WhatsApp Business...", "WhatsApp ya WhatsApp Business likho...")
        AgentStep.PICK_MEDIA -> localized(language, "Use the file picker card...", "Neeche wala file card use karo...")
        AgentStep.PICK_SHEET -> localized(language, "Use the sheet picker card...", "Neeche wala sheet card use karo...")
        AgentStep.REVIEW_PERMISSIONS -> localized(language, "Type done or use refresh...", "Done likho ya status refresh karo...")
        AgentStep.READY_TO_LAUNCH -> localized(language, "Type if you want to change anything...", "Kuch change karna ho to likho...")
        else -> localized(language, "Type a message...", "Yahan message likho...")
    }
}

private fun localized(language: ChatLanguage, english: String, hindi: String): String {
    return AgentLanguageText.resolve(language, english, hindi)
}

private fun colorForCampaignType(type: CampaignType): Color {
    return when (type) {
        CampaignType.TEXT -> Color(0xFF3949AB)
        CampaignType.CAPTION -> Color(0xFFD81B60)
        CampaignType.TEXT_MEDIA -> Color(0xFFF9A825)
        CampaignType.SHEET -> Color(0xFF2E7D32)
    }
}

private fun iconForCampaignType(type: CampaignType) = when (type) {
    CampaignType.TEXT -> Icons.Filled.Description
    CampaignType.CAPTION -> Icons.Filled.Image
    CampaignType.TEXT_MEDIA -> Icons.AutoMirrored.Filled.InsertDriveFile
    CampaignType.SHEET -> Icons.Filled.TableChart
}
