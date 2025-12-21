import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@contexts/ThemeContext";

/**
 * Base Card Component
 * Phase 1.4: Design System
 */

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: number;
  elevation?: number;
}

export function Card({
  children,
  style,
  padding = 16,
  elevation = 2,
}: CardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          padding,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: elevation },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: elevation * 2,
          elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
});
