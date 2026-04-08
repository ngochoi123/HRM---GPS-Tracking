import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

// Tên Task này phải ĐỘC NHẤT và KHỚP với tên khai báo ở Bước 3
export const BACKGROUND_LOCATION_TASK = "BACKGROUND_LOCATION_TASK";

// Định nghĩa việc cần làm khi nhận được tọa độ ngầm
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Lỗi Background Task:", error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latestLocation = locations[0];

    // TODO: Leader cần lấy tọa độ công ty từ AsyncStorage hoặc SQLite ở đây
    // Giả sử lấy được: const officeLocation = { latitude: 21.0, longitude: 105.0, radius: 100 }

    // Test hardcode để xem Task có chạy không:
    console.log(
      "📍 [Ngầm] Tọa độ mới:",
      latestLocation.coords.latitude,
      latestLocation.coords.longitude,
    );

    // Kích hoạt thông báo đẩy (Ví dụ: Nếu ra khỏi vùng)
    // await Notifications.scheduleNotificationAsync({ ... })
  }
});
