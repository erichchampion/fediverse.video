import { Stack } from "expo-router";
import { useTheme } from "@contexts/ThemeContext";

/**
 * Feed layout
 * Simple stack navigation for feed screens
 * Feed selection is handled by the FeedSelector dropdown in the main header
 */
export default function FeedLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="account/[id]" />
      <Stack.Screen name="hashtag/[id]" />
      <Stack.Screen name="list/[id]" />
    </Stack>
  );
}
