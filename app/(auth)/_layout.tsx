import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen
        name="instance-selector"
        options={{
          headerShown: true,
          title: "Select Instance",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
