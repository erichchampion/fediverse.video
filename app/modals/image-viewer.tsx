import { View, Text, StyleSheet } from "react-native";

/**
 * Image viewer modal
 * Phase 4 implementation placeholder
 */
export default function ImageViewerModal() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Image Viewer</Text>
      <Text style={styles.subtext}>
        Phase 4: Image viewer implementation coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtext: {
    fontSize: 16,
    color: "#cccccc",
    marginTop: 10,
  },
});
