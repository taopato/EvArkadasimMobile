import React, { forwardRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const KeyboardAwareScreen = forwardRef(function KeyboardAwareScreen({
  children,
  contentContainerStyle,
  style,
  bottomOffset = 32,
  ...props
}, ref) {
  return (
    <KeyboardAwareScrollView
      ref={ref}
      style={[styles.screen, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      enableAutomaticScroll
      enableOnAndroid
      extraHeight={bottomOffset}
      extraScrollHeight={bottomOffset}
      keyboardOpeningTime={0}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
});

export default KeyboardAwareScreen;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1 },
});
