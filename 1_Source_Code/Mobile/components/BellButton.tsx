/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import RenderHTML from 'react-native-render-html';
import { API_URL } from '@/config/env';
import { SwipeableSheet } from '@/components/SwipeableSheet';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BellNotif {
  id: number;
  title: string;
  content: string;
  desc?: string;
  notification_type: string;
  created_at: string;
  is_read: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const typeColor = (type: string) => {
  if (type === 'warning') return '#f59e0b';
  if (type === 'error' || type === 'urgent') return '#ef4444';
  if (type === 'success') return '#10b981';
  return '#00b4d8';
};

const typeIcon = (type: string): any => {
  if (type === 'warning') return 'alert-triangle';
  if (type === 'error' || type === 'urgent') return 'alert-circle';
  if (type === 'success') return 'check-circle';
  return 'info';
};

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
};

// ─── Component ────────────────────────────────────────────────────────────────
export function BellButton() {
  const [notifs, setNotifs]   = useState<BellNotif[]>([]);
  const [userId, setUserId]   = useState<string | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [listOpen, setListOpen]     = useState(false);
  const [selected, setSelected] = useState<BellNotif | null>(null);
  const { width } = useWindowDimensions();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const knownIds  = useRef<Set<number>>(new Set());

  const handleLinkPress = async (event: any, href: string) => {
    if (href.startsWith('data:')) {
      try {
        const matches = href.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          Alert.alert('Lỗi', 'Định dạng file không hợp lệ.');
          return;
        }
        const mimeType = matches[1];
        const base64Data = matches[2];
        let ext = mimeType.split('/')[1] || 'bin';
        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ext = 'docx';
        if (mimeType === 'application/pdf') ext = 'pdf';

        const fileUri = (FileSystem.documentDirectory || 'file:///') + `attachment_${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Chức năng', 'Thiết bị không hỗ trợ chia sẻ tệp này.');
        }
      } catch (err) {
        Alert.alert('Lỗi', 'Không thể đọc tệp đính kèm.');
        console.log(err);
      }
    } else {
      Linking.openURL(href);
    }
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  // ── Load credentials ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const t  = await AsyncStorage.getItem('userToken');
      const id = await AsyncStorage.getItem('employeeId');
      setToken(t);
      setUserId(id);
    })();
  }, []);

  // ── Shake animation ────────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── Fetch bell notifications ───────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (!userId || !token) return;
    try {
      const res = await axios.get(`${API_URL}/notifications/my-bell/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: BellNotif[] = Array.isArray(res.data)
        ? res.data
        : res.data?.data ?? [];

      // Phát hiện thông báo chưa đọc MỚI → shake chuông
      const newUnread = data.filter((n) => !n.is_read && !knownIds.current.has(n.id));
      if (newUnread.length > 0) {
        triggerShake();
      }

      // Cập nhật knownIds với tất cả notif hiện tại
      data.forEach((n) => knownIds.current.add(n.id));
      setNotifs(data);
    } catch {}
  }, [userId, token, triggerShake]);

  // Poll 30s
  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(iv);
  }, [fetchNotifs]);

  // ── Mark as read ───────────────────────────────────────────────────────
  const markRead = useCallback(async (notiId: number) => {
    if (!userId || !token) return;
    try {
      await axios.put(`${API_URL}/notifications/read/${notiId}`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotifs((prev) => prev.map((n) => n.id === notiId ? { ...n, is_read: true } : n));
    } catch {}
  }, [userId, token]);

  const markAllRead = useCallback(async () => {
    if (!userId || !token) return;
    try {
      await axios.put(`${API_URL}/notifications/read-all/${userId}`, {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  }, [userId, token]);

  const openNotif = (n: BellNotif) => {
    setSelected(n);
    if (!n.is_read) markRead(n.id);
  };

  // ── Render item ────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: BellNotif }) => (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      onPress={() => {
        setListOpen(false);
        setTimeout(() => openNotif(item), 350); // chờ sheet đóng rồi mở detail
      }}
      activeOpacity={0.75}
    >
      <View style={[styles.itemIconWrap, { backgroundColor: typeColor(item.notification_type) + '18' }]}>
        <Feather name={typeIcon(item.notification_type)} size={18} color={typeColor(item.notification_type)} />
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, !item.is_read && { color: '#0f172a' }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemDesc} numberOfLines={2}>{item.desc || item.content}</Text>
        <Text style={styles.itemDate}>{fmtDate(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <>
      {/* ── CHUÔNG ── */}
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TouchableOpacity
          style={styles.bell}
          onPress={() => { setListOpen(true); fetchNotifs(); }}
        >
          <Feather name="bell" size={20} color="#64748b" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── DANH SÁCH (SwipeableSheet) ── */}
      <SwipeableSheet visible={listOpen} onClose={() => setListOpen(false)} maxHeightRatio={0.82}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.readAllBtn} onPress={markAllRead}>
              <Text style={styles.readAllText}>Đọc tất cả</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifs.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
          </View>
        ) : (
          <FlatList
            data={notifs}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          />
        )}
      </SwipeableSheet>

      {/* ── CHI TIẾT (SwipeableSheet nhỏ hơn) ── */}
      <SwipeableSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        maxHeightRatio={0.6}
      >
        {selected && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.detailTypeBar, { backgroundColor: typeColor(selected.notification_type) }]} />
            <View style={[styles.detailIconWrap, { backgroundColor: typeColor(selected.notification_type) + '18' }]}>
              <Feather name={typeIcon(selected.notification_type)} size={22} color={typeColor(selected.notification_type)} />
            </View>
            <Text style={styles.detailTitle}>{selected.title}</Text>
            <Text style={styles.detailDate}>{fmtDate(selected.created_at)}</Text>
            {selected.desc ? <Text style={styles.detailDesc}>{selected.desc}</Text> : null}
            <View style={{ marginTop: 12 }}>
              <RenderHTML
                contentWidth={width * 0.9}
                source={{ html: selected.content }}
                systemFonts={['System']}
                renderersProps={{
                  a: { onPress: handleLinkPress }
                }}
                tagsStyles={{
                  body: { color: '#334155', fontSize: 15, lineHeight: 22 },
                  a: { color: '#00b4d8', textDecorationLine: 'underline', fontWeight: 'bold' }
                }}
              />
            </View>
          </ScrollView>
        )}
      </SwipeableSheet>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Bell
  bell: {
    width: 42, height: 42, backgroundColor: '#fff', borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6,
  },
  badge: {
    position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16,
    backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff',
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '900' },

  // Sheet Header
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  readAllBtn: { backgroundColor: '#e0f7fa', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  readAllText: { fontSize: 12, color: '#00b4d8', fontWeight: '700' },

  // Items
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  itemUnread: { backgroundColor: '#f0fafb', borderRadius: 12, paddingHorizontal: 8, marginHorizontal: -8 },
  itemIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 2 },
  itemDesc: { fontSize: 12, color: '#94a3b8', lineHeight: 17 },
  itemDate: { fontSize: 11, color: '#cbd5e1', marginTop: 4, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00b4d8', marginTop: 6, flexShrink: 0 },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingBottom: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },

  // Detail
  detailContent: { paddingHorizontal: 24, paddingBottom: 24 },
  detailTypeBar: { height: 4, borderRadius: 2, marginBottom: 20 },
  detailIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  detailTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
  detailDate: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 14 },
  detailDesc: { fontSize: 14, color: '#475569', fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
  detailBody: { fontSize: 14, color: '#334155', lineHeight: 22 },
});
