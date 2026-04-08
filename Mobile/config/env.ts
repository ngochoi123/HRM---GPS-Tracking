/**
 * Host backend (API + Socket.io, cổng 5000).
 *
 * - Android Emulator: mặc định `10.0.2.2` (ánh xạ tới máy dev).
 * - iOS / máy thật: KHÔNG dùng `localhost` — thiết bị không trỏ được về PC.
 *   Bắt buộc tạo `.env` ở gốc project: EXPO_PUBLIC_API_HOST=192.168.x.x
 *   rồi khởi động lại `npx expo start` (clear cache nếu cần).
 */
const fromEnv =
  typeof process.env.EXPO_PUBLIC_API_HOST === "string"
    ? process.env.EXPO_PUBLIC_API_HOST.trim()
    : "";

function defaultApiHost(): string {
  return "192.168.11.19";
}

export const YOUR_IPV4_ADDRESS =
  fromEnv.length > 0 ? fromEnv : defaultApiHost();

if (typeof __DEV__ !== "undefined" && __DEV__ && fromEnv.length === 0) {
  console.warn(
    "[env] Chưa đặt EXPO_PUBLIC_API_HOST trong .env — đang dùng host mặc định:",
    YOUR_IPV4_ADDRESS,
  );
}

export const API_PORT = 5000;

export const API_URL = `http://${YOUR_IPV4_ADDRESS}:${API_PORT}/api`;

/** Socket.io gắn cùng server HTTP — không có path đặc biệt. */
export const SOCKET_URL = `http://${YOUR_IPV4_ADDRESS}:${API_PORT}`;
