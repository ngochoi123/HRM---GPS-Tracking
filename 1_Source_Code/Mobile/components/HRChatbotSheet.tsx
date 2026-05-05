// ─────────────────────────────────────────────────────────────────────────────
// HRChatbotSheet.tsx — Chatbot Trợ lý Nhân sự cho Mobile (React Native / Expo)
// ─────────────────────────────────────────────────────────────────────────────
// API: POST /api/chat  (cùng backend với web — không có route riêng)
// Auth: Bearer token từ AsyncStorage('userToken')
// Chỉ hiển thị khi role === 'EMPLOYEE'
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@/config/env';
import { SwipeableSheet } from '@/components/SwipeableSheet';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isError?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Gợi ý câu hỏi nhanh ────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  'Tôi còn bao nhiêu ngày phép?',
  'Tháng này tôi đi trễ mấy lần?',
  'Lương cơ bản của tôi là bao nhiêu?',
  'Quy trình xin nghỉ phép như thế nào?',
];

// ─── Tin nhắn chào ban đầu ───────────────────────────────────────────────────

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'ai',
  content:
    'Chào bạn! Tôi là **Trợ lý Nhân sự ảo**. Bạn có thể hỏi tôi về:\n• 📅 Ngày phép còn lại\n• ⏱️ Lịch sử chấm công\n• 💰 Thông tin lương\n• 📋 Quy chế, thủ tục nhân sự',
};

// ─── Helper: convert internal messages → API format ─────────────────────────

function toApiMessages(msgs: ChatMessage[]) {
  return msgs
    .filter((m) => (m.role === 'user' || m.role === 'ai') && !m.isError)
    .map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    }));
}

// ─── Helper: render text với **bold** đơn giản ──────────────────────────────

function renderTextParts(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={{ fontWeight: '700' }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CHÍNH
// ─────────────────────────────────────────────────────────────────────────────

export function HRChatbotSheet({ visible, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Lấy token khi mount
  useEffect(() => {
    AsyncStorage.getItem('userToken').then(setToken);
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (visible && messages.length > 1) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, visible]);

  // Reset về tin nhắn chào khi đóng
  const handleClose = () => {
    onClose();
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
  };

  // ─── Gửi tin nhắn ────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (quickText?: string) => {
      const text = (quickText ?? input).trim();
      if (!text || isLoading) return;
      if (!token) {
        Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: text,
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      setInput('');
      setIsLoading(true);

      try {
        // POST /api/chat — cùng endpoint với web frontend
        const res = await axios.post(
          `${API_URL}/chat`,
          { messages: toApiMessages(updatedHistory) },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 90_000, // 90 giây — phù hợp CPU inference chậm
          },
        );

        const reply = res.data?.reply || 'Xin lỗi, tôi không nhận được phản hồi. Vui lòng thử lại!';
        setMessages((prev) => [
          ...prev,
          { id: `ai_${Date.now()}`, role: 'ai', content: reply },
        ]);
      } catch (err: any) {
        const status = err?.response?.status;
        let errMsg = '⚠️ Hệ thống AI đang bận, bạn đợi một lát nhé!';
        if (status === 503 || status === 504) {
          errMsg = '⚠️ AI đang khởi động, vui lòng thử lại sau 30 giây.';
        } else if (status === 403) {
          errMsg = '⚠️ Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
        } else if (err?.code === 'ECONNABORTED') {
          errMsg = '⚠️ AI xử lý quá lâu (>90s). Hỏi ngắn hơn hoặc thử lại.';
        }
        setMessages((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, role: 'ai', content: errMsg, isError: true },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, token],
  );

  // ─── Render từng tin nhắn ────────────────────────────────────────────────

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
        {/* Avatar */}
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Feather name="cpu" size={14} color="#fff" />
          </View>
        )}

        {/* Bubble */}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAi,
            item.isError && styles.bubbleError,
          ]}
        >
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {renderTextParts(item.content)}
          </Text>
        </View>

        {/* User avatar */}
        {isUser && (
          <View style={styles.userAvatar}>
            <Feather name="user" size={14} color="#6d28d9" />
          </View>
        )}
      </View>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SwipeableSheet visible={visible} onClose={handleClose} maxHeightRatio={0.88}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Feather name="cpu" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>HR Assistant</Text>
            <Text style={styles.headerSub}>Qwen2.5 · Chỉ dành cho bạn</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleReset} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Feather name="refresh-cw" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {/* Gợi ý câu hỏi nhanh — chỉ hiện khi mới bắt đầu */}
              {messages.length === 1 && !isLoading && (
                <View style={styles.quickWrap}>
                  <Text style={styles.quickLabel}>Gợi ý câu hỏi:</Text>
                  {QUICK_QUESTIONS.map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={styles.quickBtn}
                      onPress={() => handleSend(q)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.quickText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Typing indicator */}
              {isLoading && (
                <View style={[styles.msgRow, styles.msgRowAi]}>
                  <View style={styles.aiAvatar}>
                    <Feather name="cpu" size={14} color="#fff" />
                  </View>
                  <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
                    <ActivityIndicator size="small" color="#7c3aed" />
                    <Text style={styles.typingText}>Đang xử lý...</Text>
                  </View>
                </View>
              )}
            </>
          }
        />

        {/* ── Input ── */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Nhập câu hỏi... (Enter để gửi)"
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={1000}
            editable={!isLoading}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>Thông tin chỉ dành riêng cho bạn · Được bảo mật</Text>
      </KeyboardAvoidingView>
    </SwipeableSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 1 },

  // Messages
  messageList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },

  // Avatars
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Bubbles
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#7c3aed',
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#ede9fe',
    elevation: 1,
  },
  bubbleError: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  bubbleText: { fontSize: 14, lineHeight: 21, color: '#374151' },
  bubbleTextUser: { color: '#fff' },

  // Typing
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  typingText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },

  // Quick questions
  quickWrap: { marginTop: 4, marginLeft: 38, gap: 6 },
  quickLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  quickBtn: {
    backgroundColor: '#ede9fe',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    alignSelf: 'flex-start',
  },
  quickText: { fontSize: 13, color: '#5b21b6', fontWeight: '600' },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f3ff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#374151',
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: '#e2e8f0' },

  // Disclaimer
  disclaimer: {
    textAlign: 'center',
    fontSize: 10,
    color: '#c4b5fd',
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
});
