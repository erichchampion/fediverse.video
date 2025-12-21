import React from "react";
import { ActivityIndicator, View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@contexts/ThemeContext";

/**
 * Spinner Component
 * Phase 1.4: Design System
 */

interface SpinnerProps {
  size?: "small" | "large";
  color?: string;
  style?: ViewStyle;
  centered?: boolean;
}

export function Spinner({
  size = "large",
  color,
  style,
  centered = false,
}: SpinnerProps) {
  const { colors } = useTheme();
  const spinnerColor = color || colors.primary;

  if (centered) {
    return (
      <View style={[styles.centered, style]}>
        <ActivityIndicator size={size} color={spinnerColor} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={spinnerColor} style={style} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
