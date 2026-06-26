/*
 * Copyright (c) 2026 ngochoi123 / HRM - GPS Tracking.
 * All rights reserved.
 */

/**
 * SwipeableSheet — Bottom sheet có thể kéo lên/xuống.
 * - Kéo nhanh xuống (fling) → tự đóng
 * - Kéo xuống quá 40% chiều cao → tự đóng
 * - Bấm vào backdrop → đóng
 * - Không cần thư viện ngoài (chỉ dùng Animated + PanResponder built-in)
 */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Chiều cao tối đa của sheet (default 85% màn hình) */
  maxHeightRatio?: number;
  children: React.ReactNode;
  /** Màu backdrop (default rgba đen 50%) */
  backdropColor?: string;
}

export function SwipeableSheet({
  visible,
  onClose,
  maxHeightRatio = 0.85,
  children,
  backdropColor = 'rgba(0,0,0,0.5)',
}: Props) {
  const sheetH = SCREEN_H * maxHeightRatio;
  const translateY = useRef(new Animated.Value(sheetH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const lastY = useRef(0);

  // ── Animate in / out ─────────────────────────────────────────────────────
  const open = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: sheetH,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [translateY, backdropOpacity, sheetH, onClose]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(sheetH);
      open();
    }
  }, [visible, open, translateY, sheetH]);

  // ── Pan Responder (drag handle only) ─────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        lastY.current = 0;
      },
      onPanResponderMove: (_, g) => {
        // Chỉ cho kéo xuống (dy > 0)
        const dy = Math.max(0, g.dy);
        translateY.setValue(dy);
        // Giảm opacity backdrop theo mức kéo
        const ratio = Math.max(0, 1 - dy / sheetH);
        backdropOpacity.setValue(ratio);
        lastY.current = g.vy;
      },
      onPanResponderRelease: (_, g) => {
        const dy = Math.max(0, g.dy);
        const vy = g.vy; // velocity px/ms
        // Fling down hoặc kéo quá 40% → đóng
        if (vy > 0.8 || dy > sheetH * 0.4) {
          Animated.parallel([
            Animated.spring(translateY, { toValue: sheetH, useNativeDriver: true, damping: 20, stiffness: 180 }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
          ]).start(() => onClose());
        } else {
          // Snap về mở
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View style={[styles.backdrop, { backgroundColor: backdropColor, opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { height: sheetH, transform: [{ translateY }] },
        ]}
      >
        {/* Drag handle — chỉ vùng này nhận gesture kéo */}
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        {/* Nội dung — scroll bên trong component con */}
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
  },
  content: {
    flex: 1,
  },
});
