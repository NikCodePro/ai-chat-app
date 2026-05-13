import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type ChatBubbleProps = {
  role: 'user' | 'assistant';
  message: string;
};

export function ChatBubble({ role, message }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAi: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  userBubble: {
    backgroundColor: colors.bubbleUser,
  },
  aiBubble: {
    backgroundColor: colors.bubbleAI,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  text: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
