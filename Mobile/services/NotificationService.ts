import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

// 1. Cấu hình hiển thị thông báo khi app đang chạy (Foreground)
//    Đảm bảo thông báo vẫn hiển thị như một Alert (Banner) ngay cả khi đang bật app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * A. API Cấu hình & Xin quyền thông báo (Hỗ trợ iOS và Android)
 */
export const requestNotificationPermissionsAsync = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    // Android 8.0+ yêu cầu Notification Channels
    await Notifications.setNotificationChannelAsync('attendance-reminders', {
      name: 'Nhắc nhở chấm công',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Nếu người dùng chưa xác nhận quyền, chúng ta yêu cầu quyền
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Bạn chưa cấp quyền gửi thông báo nhắc nhở GPS!');
    return false;
  }
  
  return true;
};

/**
 * D. Dọn dẹp: Hủy tất cả các lịch thông báo 
 * (Gọi khi nhân viên đăng xuất, hoặc xin nghỉ phép dài ngày)
 */
export const cancelAllScheduledNotificationsAsync = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('Đã huỷ tất cả lịch nhắc nhở (Privacy: Notifications cleared)');
};

/**
 * B. Đặt lịch thông báo: Báo thức cố định đúng 7:45 AM mỗi ngày
 */
export const scheduleMorningReminder = async () => {
  // Bước 1: Bảo đảm ta có quyền gửi thông báo trước khi đặt lịch
  const hasPermission = await requestNotificationPermissionsAsync();
  if (!hasPermission) return;

  // Bước 2: Dọn dẹp hết lịch cũ để tránh gửi trùng lặp nhiều lần (spam)
  await cancelAllScheduledNotificationsAsync();

  // Bước 3: Đặt lịch hàng ngày (Daily)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nhắc nhở chấm công ⏰',
      body: 'Sắp đến giờ làm rồi, hãy mở app để Check-in nhé!',
      sound: true,
      // Đính kèm payload data để màn hình biết cần điều hướng đi đâu khi bấm vào
      data: { redirectRoute: '/checkin' }, 
    },
    trigger: {
      type: 'calendar', // Lịch báo hàng ngày
      channelId: 'attendance-reminders',
      hour: 7,
      minute: 45,
      repeats: true,
    } as any,
  });
  
  console.log('Đã thiết lập thành công thông báo nhắc nhở 7:45 AM');
};

/**
 * C. Custom Hook Xử lý sự kiện khi bấm vào thông báo (Routing/Deep Link)
 * Gọi Hook này ở Root Component (VD: app/_layout.tsx)
 */
export function useNotificationObserver() {
  useEffect(() => {
    // Lắng nghe: Khi người dùng đang dùng app mà thông báo tới
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Nhận thông báo khi đang mở app:', notification);
    });

    // Lắng nghe: Khi người dùng Nhấn/Tap vào khung thông báo lúc app tắt (Killed/Background)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Nếu payload có chứa route điều hướng, ta đẩy sang màn hình Check-in tương ứng
      if (data?.redirectRoute) {
        console.log(`Đang chạy app và điều hướng đến: ${data.redirectRoute}`);
        try {
          // Lưu ý: Nếu Expo Router của bạn chạy theo file-based, 
          // có thể '/checkin' hoặc '/(tabs)/checkin' tuỳ bạn thiết kế.
          router.push(data.redirectRoute as any);
        } catch (error) {
          console.error('Lỗi điều hướng màn hình:', error);
        }
      }
    });

    // Cleanup Observer
    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);
}
/**
 * 🛠 HÀM TEST NHANH: Thông báo sẽ xuất hiện sau 5 giây
 */
export const demoNotificationIn5Seconds = async () => {
  const hasPermission = await requestNotificationPermissionsAsync();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 Test Thông báo Killed App',
      body: 'Nhấn vào đây để xem App tự bật lên & nhảy tới Check-in!',
      sound: true,
      data: { redirectRoute: '/checkin' }, 
    },
    trigger: {
      type: 'timeInterval', // Bắt buộc khai báo type để báo cho Expo biết đây là Delay Trigger
      seconds: 15, // Delay 15 giây
      channelId: 'attendance-reminders',
    } as any,
  });
  
  console.log('Đã nạp đạn! Hãy nhanh tay ĐÓNG APP (Vuốt tắt đa nhiệm) trong vòng 15 giây tới...');
};
