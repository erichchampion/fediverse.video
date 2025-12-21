import { Stack } from "expo-router";

/**
 * Modal screens layout
 * Phase 2.4: Modal navigation setup
 */
export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerShown: false,
      }}
    >
      <Stack.Screen name="account-switcher" />
    </Stack>
  );
}
