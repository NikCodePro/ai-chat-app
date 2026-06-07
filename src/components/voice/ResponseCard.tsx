import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface ResponseCardProps {
  text: string;
  isPlaying: boolean;
  isLoadingAudio?: boolean;
  onReplay: () => void;
  onStop: () => void;
}

export function ResponseCard({ text, isPlaying, isLoadingAudio, onReplay, onStop }: ResponseCardProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={14} color="rgba(16,185,129,0.8)" />
        <Text style={styles.headerText}>AI Response</Text>
      </View>

      <Text style={styles.text}>{text}</Text>

      <View style={styles.controls}>
        {isLoadingAudio ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : isPlaying ? (
          <TouchableOpacity onPress={onStop} style={[styles.btn, styles.btnStop]}>
            <Ionicons name="stop" size={14} color="#fff" />
            <Text style={styles.btnText}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onReplay} style={[styles.btn, styles.btnPlay]}>
            <Ionicons name="play" size={14} color="#fff" />
            <Text style={styles.btnText}>Replay</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.35)",
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(16,185,129,0.9)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  text: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  btnPlay: {
    backgroundColor: "rgba(16,185,129,0.35)",
  },
  btnStop: {
    backgroundColor: "rgba(239,68,68,0.35)",
  },
  btnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
