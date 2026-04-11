const fromEnv =
  typeof process.env.EXPO_PUBLIC_API_HOST === "string"
    ? process.env.EXPO_PUBLIC_API_HOST.trim()
    : "";

function defaultApiHost(): string {
  return "192.168.1.19";
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

export const API_URL = `https://kltn-gps-api.onrender.com/api`;

/** Socket.io gắn cùng server HTTP — không có path đặc biệt. */
export const SOCKET_URL = `https://kltn-gps-api.onrender.com`;
