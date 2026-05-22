import React from "react";
import { StyleSheet, Text, View, Linking, Platform } from "react-native";
import { colors } from "../theme/colors";

type MessageBubbleProps = {
  role: "user" | "assistant";
  message: string;
};

interface Token {
  type: "text" | "bold" | "italic" | "underline" | "link" | "code";
  content: string;
  url?: string;
}

function parseInline(text: string): Token[] {
  const tokens: Token[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Underline: __text__
    const underlineMatch = remaining.match(/^__([\s\S]+?)__/);
    if (underlineMatch) {
      tokens.push({ type: "underline", content: underlineMatch[1] });
      remaining = remaining.slice(underlineMatch[0].length);
      continue;
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*([\s\S]+?)\*\*/);
    if (boldMatch) {
      tokens.push({ type: "bold", content: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([\s\S]+?)\1/);
    if (italicMatch) {
      tokens.push({ type: "italic", content: italicMatch[2] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      tokens.push({ type: "link", content: linkMatch[1], url: linkMatch[2] });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Code: `code`
    const codeMatch = remaining.match(/^`([\s\S]+?)`/);
    if (codeMatch) {
      tokens.push({ type: "code", content: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Plain text: eat characters up to the start of the next formatting tag
    const nextTagIndex = remaining.search(/\*\*|__|\*|_|`|\[/);
    if (nextTagIndex === -1) {
      tokens.push({ type: "text", content: remaining });
      break;
    } else if (nextTagIndex === 0) {
      tokens.push({ type: "text", content: remaining[0] });
      remaining = remaining.slice(1);
    } else {
      tokens.push({ type: "text", content: remaining.slice(0, nextTagIndex) });
      remaining = remaining.slice(nextTagIndex);
    }
  }

  return tokens;
}

function renderInlineTokens(tokens: Token[], isUser: boolean, keyPrefix: string) {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.type) {
      case "bold":
        return (
          <Text key={key} style={styles.bold}>
            {token.content}
          </Text>
        );
      case "italic":
        return (
          <Text key={key} style={styles.italic}>
            {token.content}
          </Text>
        );
      case "underline":
        return (
          <Text key={key} style={styles.underline}>
            {token.content}
          </Text>
        );
      case "link":
        return (
          <Text
            key={key}
            style={[styles.link, isUser && styles.linkUser]}
            onPress={() => {
              if (token.url) {
                Linking.openURL(token.url).catch((err) =>
                  console.error("Failed to open URL", err)
                );
              }
            }}
          >
            {token.content}
          </Text>
        );
      case "code":
        return (
          <Text
            key={key}
            style={[
              styles.code,
              isUser ? styles.codeUser : styles.codeAi,
            ]}
          >
            {token.content}
          </Text>
        );
      case "text":
      default:
        return <Text key={key}>{token.content}</Text>;
    }
  });
}

export function FormattedText({ text, isUser }: { text: string; isUser: boolean }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  return (
    <View style={styles.textContainer}>
      {lines.map((line, index) => {
        // Heading 3: ### Heading
        const h3Match = line.match(/^### (.*)/);
        if (h3Match) {
          return (
            <Text key={index} style={styles.h3}>
              {renderInlineTokens(parseInline(h3Match[1]), isUser, `h3-${index}`)}
            </Text>
          );
        }

        // Heading 2: ## Heading
        const h2Match = line.match(/^## (.*)/);
        if (h2Match) {
          return (
            <Text key={index} style={styles.h2}>
              {renderInlineTokens(parseInline(h2Match[1]), isUser, `h2-${index}`)}
            </Text>
          );
        }

        // Heading 1: # Heading
        const h1Match = line.match(/^# (.*)/);
        if (h1Match) {
          return (
            <Text key={index} style={styles.h1}>
              {renderInlineTokens(parseInline(h1Match[1]), isUser, `h1-${index}`)}
            </Text>
          );
        }

        // Bullet lists: - item or * item
        const bulletMatch = line.match(/^[\*\-]\s(.*)/);
        if (bulletMatch) {
          return (
            <View key={index} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, isUser && styles.bulletDotUser]}>
                •
              </Text>
              <Text style={styles.bulletText}>
                {renderInlineTokens(
                  parseInline(bulletMatch[1]),
                  isUser,
                  `bullet-${index}`
                )}
              </Text>
            </View>
          );
        }

        // Empty line
        if (line.trim() === "") {
          return <View key={index} style={styles.emptyLine} />;
        }

        // Normal paragraph
        return (
          <Text key={index} style={styles.paragraph}>
            {renderInlineTokens(parseInline(line), isUser, `p-${index}`)}
          </Text>
        );
      })}
    </View>
  );
}

export function MessageBubble({ role, message }: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <FormattedText text={message} isUser={isUser} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAi: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    borderRadius: 18,
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
  textContainer: {
    flexDirection: "column",
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  underline: {
    textDecorationLine: "underline",
  },
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  linkUser: {
    color: "#ffffff",
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    borderRadius: 6,
    paddingHorizontal: 4,
    fontSize: 13.5,
  },
  codeAi: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: colors.accent,
  },
  codeUser: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    color: "#ffffff",
  },
  h1: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  h2: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: 6,
    marginBottom: 3,
  },
  h3: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginTop: 4,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.primary,
    marginRight: 6,
  },
  bulletDotUser: {
    color: "#ffffff",
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  emptyLine: {
    height: 8,
  },
});
