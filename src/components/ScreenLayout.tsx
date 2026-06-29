import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';
import { spacing } from '../theme';
import { ScreenBackground } from './ScreenBackground';

type ScreenLayoutProps = {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  safeAreaEdges?: Edge[];
};

export function ScreenLayout({
  children,
  scrollable = false,
  keyboardAvoiding = false,
  contentStyle,
  style,
  safeAreaEdges = ['top', 'right', 'bottom', 'left'],
}: ScreenLayoutProps) {
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.scroll}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  const body = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      style={styles.flex}>
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <ScreenBackground>
      <SafeAreaView edges={safeAreaEdges} style={styles.safeArea}>
        <View style={[styles.container, style]}>{body}</View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingBottom: spacing.md,
  },
  content: {
    flex: 1,
    gap: spacing.md,
  },
});
