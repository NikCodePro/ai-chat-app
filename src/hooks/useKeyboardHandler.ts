import { useEffect, useState } from "react";
import { Dimensions, Keyboard, KeyboardEvent, Platform } from "react-native";

function getKeyboardHeight(event: KeyboardEvent) {
  const { endCoordinates } = event;
  const windowHeight = Dimensions.get("window").height;
  const coveredHeight = windowHeight - endCoordinates.screenY;

  return Math.max(0, Math.max(endCoordinates.height, coveredHeight));
}

export function useKeyboardHandler() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const frameEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";

    const handleShow = (e: KeyboardEvent) => {
      const nextHeight = getKeyboardHeight(e);
      setKeyboardHeight(nextHeight);
      setIsKeyboardVisible(nextHeight > 0);
    };

    const handleHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);
    const frameSub =
      frameEvent === showEvent ? null : Keyboard.addListener(frameEvent, handleShow);

    return () => {
      showSub.remove();
      hideSub.remove();
      frameSub?.remove();
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardVisible,
  };
}
