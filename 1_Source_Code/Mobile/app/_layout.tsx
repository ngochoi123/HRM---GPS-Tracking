import { Tabs } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MaterialIcons, Feather } from "@expo/vector-icons";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 0,
            elevation: 12,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            height: 70,
            paddingBottom: 10,
            paddingTop: 6,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
          tabBarActiveTintColor: "#00b4d8",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Chấm công",
            tabBarIcon: ({ color, size, focused }) =>
              focused ? (
                <MaterialIcons name="fingerprint" size={size + 2} color={color} />
              ) : (
                <MaterialIcons name="fingerprint" size={size} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: "Đơn từ",
            tabBarIcon: ({ color, size, focused }) =>
              focused ? (
                <Feather name="file-text" size={size + 2} color={color} />
              ) : (
                <Feather name="file-text" size={size} color={color} />
              ),
          }}
        />
        {/* Tab AI Chatbot — dùng màu tím riêng để phân biệt */}
        <Tabs.Screen
          name="chat"
          options={{
            title: "AI Chat",
            tabBarActiveTintColor: "#7c3aed",
            tabBarIcon: ({ color, size, focused }) =>
              focused ? (
                <Feather name="message-circle" size={size + 2} color={color} />
              ) : (
                <Feather name="message-circle" size={size} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Hồ sơ",
            tabBarIcon: ({ color, size, focused }) =>
              focused ? (
                <Feather name="user" size={size + 2} color={color} />
              ) : (
                <Feather name="user" size={size} color={color} />
              ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
