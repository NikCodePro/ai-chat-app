import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type ChatInputProps = {
  draft: string;
  setDraft: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  isTranscribing: boolean;
  isRecordingVoice: boolean;
  hasChat: boolean;
  onMicPressIn: (event: GestureResponderEvent) => void;
  onMicPressOut: (event: GestureResponderEvent) => void;
};

export function ChatInput({
  draft,
  setDraft,
  onSend,
  isSending,
  isTranscribing,
  isRecordingVoice,
  hasChat,
  onMicPressIn,
  onMicPressOut,
}: ChatInputProps) {
  const [inputHeight, setInputHeight] = useState(44);

  const handleContentSizeChange = (event: any) => {
    const height = event.nativeEvent.contentSize.height;
    // Set height between minHeight: 44 and maxHeight: 120
    const clampedHeight = Math.max(44, Math.min(120, height));
    setInputHeight(clampedHeight);
  };

  const isSendDisabled = !hasChat || isSending || isTranscribing || !draft.trim();

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, { height: inputHeight }]}
          value={draft}
          onChangeText={setDraft}
          placeholder={
            isTranscribing
              ? "Transcribing voice..."
              : isRecordingVoice
              ? "Listening... (Release to send)"
              : hasChat
              ? "Message"
              : "Create a chat to start..."
          }
          placeholderTextColor={colors.muted}
          editable={hasChat && !isSending && !isTranscribing}
          multiline
          onContentSizeChange={handleContentSizeChange}
          scrollEnabled={inputHeight >= 120}
        />
        
        {isTranscribing ? (
          <View style={styles.micBtn}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <Pressable
            style={[
              styles.micBtn,
              !hasChat && styles.disabledBtn,
              isRecordingVoice && styles.activeMicBtn,
            ]}
            disabled={!hasChat}
            onPressIn={onMicPressIn}
            onPressOut={onMicPressOut}
          >
            <Ionicons
              name={isRecordingVoice ? "mic" : "mic-outline"}
              size={20}
              color={isRecordingVoice ? colors.danger : colors.text}
            />
          </Pressable>
        )}
      </View>

      <Pressable
        style={[
          styles.sendBtn,
          isSendDisabled && styles.sendBtnDisabled,
        ]}
        onPress={onSend}
        disabled={isSendDisabled}
      >
        <Ionicons
          name="arrow-up"
          size={20}
          color={isSendDisabled ? "rgba(255,255,255,0.3)" : "#090B11"}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: "transparent",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.xs,
    paddingVertical: 8,
    textAlignVertical: "center",
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 4,
  },
  activeMicBtn: {
    backgroundColor: "rgba(255, 107, 129, 0.25)",
    borderColor: "rgba(255, 107, 129, 0.5)",
    borderWidth: 1.5,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
