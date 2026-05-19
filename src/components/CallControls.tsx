import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

interface CallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export function CallControls({ isMuted, onToggleMute, onEndCall }: CallControlsProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isMuted && styles.buttonMuted]}
        onPress={onToggleMute}
      >
        <Ionicons
          name={isMuted ? "mic-off" : "mic"}
          size={32}
          color={isMuted ? colors.danger : colors.text}
        />
      </Pressable>

      <Pressable style={[styles.button, styles.endButton]} onPress={onEndCall}>
        <Ionicons name="call" size={32} color={colors.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    marginTop: 40,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  buttonMuted: {
    backgroundColor: `${colors.danger}20`,
    borderColor: colors.danger,
  },
  endButton: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    transform: [{ rotate: "135deg" }], // hang up icon orientation
  },
});
