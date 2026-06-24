import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import {
  ParentHomeScreen,
  ParentReportsScreen,
  ParentSettingsScreen,
} from '../screens/parent';
import type { ColorPalette } from '../theme/colors';
import { spacing, typography } from '../theme';
import { ChildrenStackNavigator } from './ChildrenStackNavigator';
import { ControlsStackNavigator } from './ControlsStackNavigator';
import type { ParentTabParamList } from './types';

const Tab = createBottomTabNavigator<ParentTabParamList>();

const HIDDEN_TAB_BAR_ROUTES = new Set([
  'AddChildProfile',
  'AddChildAccount',
  'AddChildSuccess',
  'SelectApps',
]);

type TabIconName = 'home' | 'users' | 'shield' | 'bar-chart-2' | 'settings';

const TAB_ICONS: Record<keyof ParentTabParamList, TabIconName> = {
  Home: 'home',
  Children: 'users',
  Controls: 'shield',
  Reports: 'bar-chart-2',
  Settings: 'settings',
};

const FOCUSED_SCALE = 1.2;
const UNFOCUSED_SCALE = 1;

function useTabScale(focused: boolean) {
  const scale = useRef(new Animated.Value(focused ? FOCUSED_SCALE : UNFOCUSED_SCALE))
    .current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? FOCUSED_SCALE : UNFOCUSED_SCALE,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return scale;
}

type AnimatedTabIconProps = {
  focused: boolean;
  color: string;
  size: number;
  name: TabIconName;
};

function AnimatedTabIcon({ focused, color, size, name }: AnimatedTabIconProps) {
  const scale = useTabScale(focused);

  return (
    <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
      <Feather color={color} name={name} size={size - 1} />
    </Animated.View>
  );
}

type AnimatedTabLabelProps = {
  focused: boolean;
  color: string;
  children: string;
};

function AnimatedTabLabel({ focused, color, children }: AnimatedTabLabelProps) {
  const scale = useTabScale(focused);

  return (
    <Animated.Text
      numberOfLines={1}
      style={[
        styles.tabLabel,
        { color, transform: [{ scale }] },
        focused && styles.tabLabelFocused,
      ]}>
      {children}
    </Animated.Text>
  );
}

export function ParentTabNavigator() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(colors, insets.bottom),
    [colors, insets.bottom],
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text.brand,
        tabBarInactiveTintColor: colors.text.placeholder,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIcon: ({ focused, color, size }) => (
          <AnimatedTabIcon
            color={color}
            focused={focused}
            name={TAB_ICONS[route.name]}
            size={size}
          />
        ),
        tabBarLabel: ({ focused, color, children }) => (
          <AnimatedTabLabel color={color} focused={focused}>
            {children}
          </AnimatedTabLabel>
        ),
        sceneStyle: {
          backgroundColor: colors.background.primary,
        },
      })}>
      <Tab.Screen
        component={ParentHomeScreen}
        name="Home"
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        component={ChildrenStackNavigator}
        name="Children"
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ChildrenList';
          const hideTabBar = HIDDEN_TAB_BAR_ROUTES.has(routeName);

          return {
            title: 'Children',
            tabBarStyle: hideTabBar
              ? { ...styles.tabBar, display: 'none' }
              : styles.tabBar,
          };
        }}
      />
      <Tab.Screen
        component={ControlsStackNavigator}
        name="Controls"
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ControlsList';
          const hideTabBar = HIDDEN_TAB_BAR_ROUTES.has(routeName);

          return {
            title: 'Controls',
            tabBarStyle: hideTabBar
              ? { ...styles.tabBar, display: 'none' }
              : styles.tabBar,
          };
        }}
      />
      <Tab.Screen
        component={ParentReportsScreen}
        name="Reports"
        options={{ title: 'Reports' }}
      />
      <Tab.Screen
        component={ParentSettingsScreen}
        name="Settings"
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

function createStyles(colors: ColorPalette, bottomInset: number) {
  return StyleSheet.create({
    tabBar: {
      backgroundColor: colors.background.primary,
      borderTopColor: colors.border.default,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: 56 + bottomInset,
      paddingBottom: Math.max(bottomInset, spacing.sm),
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
    },
    tabBarItem: {
      paddingHorizontal: spacing.xs,
    },
  });
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  tabLabelFocused: {
    fontWeight: '700',
  },
});
