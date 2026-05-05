// ─────────────────────────────────────────────────────────────────────────────
// chat.tsx — Màn hình Trợ lý Nhân sự AI (Tab)
// ─────────────────────────────────────────────────────────────────────────────
// Tab này nhúng toàn bộ UI chatbot trực tiếp (không dùng SwipeableSheet)
// để chiếm toàn bộ màn hình, tránh bị chồng lên giao diện khác.
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@/config/env';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isError?: boolean;
}

// ─── Hằng số ─────────────────────────────────────────────────────────────────

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  role: 'ai',
  content:
    'Chào bạn! Tôi là **Trợ lý Nhân sự ảo**. Bạn có thể hỏi tôi về:\n• 📅 Ngày phép còn lại\n• ⏱️ Lịch sử chấm công\n• 💰 Thông tin lương\n• 📋 Quy chế, thủ tục nhân sự',
};

const QUICK_QUESTIONS = [
  'Giờ làm việc của công ty như thế nào?',
  'Tôi còn bao nhiêu ngày phép?',
  'Tháng này tôi đi trễ mấy lần?',
  'Quy trình xin nghỉ phép như thế nào?',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toApiMessages(msgs: ChatMessage[]) {
  return msgs
    .filter((m) => (m.role === 'user' || m.role === 'ai') && !m.isError)
    .map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    }));
}

/** Render text có **bold** đơn giản */
function BubbleText({ text, isUser }: { text: string; isUser: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontWeight: '800' }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN CHÍNH
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Lấy token khi mount
  useEffect(() => {
    AsyncStorage.getItem('userToken').then(setToken);
  }, []);

  // Auto-scroll khi có tin nhắn mới
  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  // ─── Reset hội thoại ─────────────────────────────────────────────────────

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
        const res = await axios.post(
          `${API_URL}/chat`,
          { messages: toApiMessages(updatedHistory) },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 90_000, // 90 giây — đủ cho CPU inference
          },
        );
        const reply =
          res.data?.reply ||
          'Xin lỗi, tôi không nhận được phản hồi. Vui lòng thử lại!';
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
          errMsg = '⚠️ AI xử lý quá lâu. Hỏi ngắn hơn hoặc thử lại sau.';
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
        {/* AI Avatar */}
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Feather name="cpu" size={13} color="#fff" />
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
          <BubbleText text={item.content} isUser={isUser} />
        </View>

        {/* User Avatar */}
        {isUser && (
          <View style={styles.userAvatar}>
            <Feather name="user" size={13} color="#7c3aed" />
          </View>
        )}
      </View>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Feather name="cpu" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>HR Assistant</Text>
            <View style={styles.headerSubRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerSub}>Qwen2.5 · Chỉ dành cho bạn</Text>
            </View>
          </View>
        </View>

        {/* Reset */}
        <TouchableOpacity
          onPress={handleReset}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.resetBtn}
        >
          <Feather name="refresh-cw" size={16} color="#7c3aed" />
          <Text style={styles.resetText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* ── Messages + Input ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
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
              {/* Gợi ý câu hỏi nhanh — chỉ khi mới bắt đầu */}
              {messages.length === 1 && !isLoading && (
                <View style={styles.quickWrap}>
                  <Text style={styles.quickLabel}>💡 Gợi ý câu hỏi:</Text>
                  <View style={styles.quickGrid}>
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
                </View>
              )}

              {/* Typing indicator */}
              {isLoading && (
                <View style={[styles.msgRow, styles.msgRowAi]}>
                  <View style={styles.aiAvatar}>
                    <Feather name="cpu" size={13} color="#fff" />
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

        {/* ── Input bar ── */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Nhập câu hỏi của bạn..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={1000}
            editable={!isLoading}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || isLoading) && styles.sendBtnDisabled,
            ]}
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
        <Text style={styles.disclaimer}>
          Thông tin chỉ dành riêng cho bạn · Được bảo mật bởi JWT
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f7ff' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#fff',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  headerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f5f3ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  resetText: { fontSize: 12, color: '#7c3aed', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#f1f5f9' },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
    gap: 8,
  },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },

  // Avatars
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
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
  quickWrap: { marginTop: 4, marginBottom: 8 },
  quickLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 10, marginLeft: 36 },
  quickGrid: { gap: 8, marginLeft: 36 },
  quickBtn: {
    backgroundColor: '#ede9fe',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    alignSelf: 'flex-start',
  },
  quickText: { fontSize: 13, color: '#5b21b6', fontWeight: '600' },

  // Input bar
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f3ff',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: '#374151',
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
    maxHeight: 110,
    lineHeight: 20,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Disclaimer
  disclaimer: {
    textAlign: 'center',
    fontSize: 10,
    color: '#c4b5fd',
    paddingVertical: 7,
    backgroundColor: '#fff',
    letterSpacing: 0.3,
  },
});
