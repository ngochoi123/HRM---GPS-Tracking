import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

// 1. Cấu hình Handler: Cho phép thông báo hiển thị khi app ĐANG MỞ
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  // 2. Chạy logic lấy Token 1 lần khi app khởi động
  useEffect(() => {
    async function getPushToken() {
      try {
        // Xin quyền từ người dùng (nếu chưa có)
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.log("❌ Người dùng từ chối cấp quyền thông báo!");
          return;
        }

        // Lấy Token của điện thoại hiện tại
        const tokenData = await Notifications.getExpoPushTokenAsync({
          // projectId lấy tự động từ app.json (nếu có cấu hình EAS)
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });

        console.log("🔥 PUSH TOKEN CỦA BẠN LÀ:", tokenData.data);
      } catch (error) {
        console.log("❌ Lỗi lấy token:", error);
      }
    }

    getPushToken();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  );
}
