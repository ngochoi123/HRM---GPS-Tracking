import { io } from 'socket.io-client';

// Singleton quản lý kết nối Socket.io cho toàn bộ ứng dụng.
// Ưu tiên đọc URL từ VITE_SOCKET_URL, fallback sang VITE_API_URL (bỏ hậu tố /api).
let socketInstance = null;
let socketUrlInUse = null;

function deriveSocketUrlFromApi(apiBase) {
  if (!apiBase || typeof apiBase !== 'string') return undefined;
  return apiBase.replace(/\/api\/?$/, '');
}

function resolveSocketUrl(overrideUrl) {
  if (overrideUrl && typeof overrideUrl === 'string') return overrideUrl;
  const apiBase = import.meta.env.VITE_API_URL;
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  return envSocketUrl || deriveSocketUrlFromApi(apiBase);
}

export function getSocketClient(overrideUrl) {
  const resolved = resolveSocketUrl(overrideUrl);

  // Nếu socket đã khởi tạo nhưng URL khác → reset để tránh kết nối sai origin
  if (socketInstance && socketUrlInUse && resolved && socketUrlInUse !== resolved) {
    socketInstance.disconnect();
    socketInstance = null;
    socketUrlInUse = null;
  }

  if (!socketInstance) {
    socketUrlInUse = resolved;

    // transports: ['websocket'] để tương thích tốt với Render.com
    socketInstance = io(resolved, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    socketUrlInUse = null;
  }
}

