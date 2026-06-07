import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface TranscriptCardProps {
  text: string;
}

export function TranscriptCard({ text }: TranscriptCardProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={16} color="rgba(255,255,255,0.6)" />
        <Text style={styles.headerText}>You said</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(79,70,229,0.25)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.4)",
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  text: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
  },
});
