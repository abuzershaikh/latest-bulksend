package com.message.bulksend.bulksenderaiagent

enum class ChatLanguage(val label: String) {
    ENGLISH("English"),
    HINGLISH("Hinglish")
}

object AgentLanguageText {
    fun resolve(language: ChatLanguage, english: String, hinglish: String): String {
        return when (language) {
            ChatLanguage.ENGLISH -> english
            ChatLanguage.HINGLISH -> hinglish
        }
    }

    fun label(language: ChatLanguage): String = language.label

    fun all(): List<ChatLanguage> = ChatLanguage.values().toList()

    fun fromStored(value: String?): ChatLanguage {
        return ChatLanguage.values().firstOrNull { it.name == value } ?: ChatLanguage.ENGLISH
    }
}
