import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "@contexts/ThemeContext";

/**
 * Base Button Component
 * Phase 1.4: Design System
 */

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  title,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case "primary":
        return colors.primary;
      case "secondary":
        return colors.secondary;
      case "outline":
      case "ghost":
        return "transparent";
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textSecondary;
    switch (variant) {
      case "primary":
      case "secondary":
        return "#FFFFFF";
      case "outline":
      case "ghost":
        return colors.primary;
      default:
        return "#FFFFFF";
    }
  };

  const getPadding = () => {
    switch (size) {
      case "small":
        return { paddingVertical: 8, paddingHorizontal: 16 };
      case "medium":
        return { paddingVertical: 12, paddingHorizontal: 24 };
      case "large":
        return { paddingVertical: 16, paddingHorizontal: 32 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 24 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return 14;
      case "medium":
        return 16;
      case "large":
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: variant === "outline" ? colors.primary : "transparent",
          borderWidth: variant === "outline" ? 1 : 0,
          ...getPadding(),
          width: fullWidth ? "100%" : "auto",
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: getTextColor(),
              fontSize: getFontSize(),
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 44, // iOS minimum touch target
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
