import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Theme context for light/dark mode support
 * Phase 0: Basic structure
 */

type Theme = "light" | "dark" | "auto";

interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  border: string;
  card: string;
  text: string;
  textSecondary: string;
  error: string;
  success: string;
  warning?: string;
}

const lightColors: ThemeColors = {
  background: "#FFFFFF",
  foreground: "#000000",
  primary: "#6364FF",
  secondary: "#8B8BFF",
  border: "#E0E0E0",
  card: "#F5F5F5",
  text: "#000000",
  textSecondary: "#666666",
  error: "#FF3B30",
  success: "#34C759",
  warning: "#FF9500",
};

const darkColors: ThemeColors = {
  background: "#000000",
  foreground: "#FFFFFF",
  primary: "#8B8BFF",
  secondary: "#6364FF",
  border: "#333333",
  card: "#1C1C1E",
  text: "#FFFFFF",
  textSecondary: "#ABABAB",
  error: "#FF453A",
  success: "#32D74B",
  warning: "#FF9F0A",
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "theme_preference";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>("auto");

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "auto") {
        setThemeState(saved);
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  // Determine actual theme based on preference and system
  const isDark =
    theme === "dark" || (theme === "auto" && systemColorScheme === "dark");

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        isDark,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
