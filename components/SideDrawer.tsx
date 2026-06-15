/**
 * Slide-out navigation drawer (the app's sidebar). Opened from the home
 * hamburger, it overlays the whole app: a dimming scrim plus a translucent dark
 * "glass" panel with a profile header and sectioned navigation. Animated with
 * Reanimated. State lives in useUIStore so any header can open it.
 */
import { useEffect } from 'react';
import { Dimensions, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Image } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Ionicons } from '@/components/ui';
import { Crest } from '@/components/MatchCard';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const PANEL_W = Math.min(330, SCREEN_W * 0.84);

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'Play',
    items: [
      { label: 'Home', icon: 'home-outline', route: '/' },
      { label: 'New Match', icon: 'add-circle-outline', route: '/new-match' },
      { label: 'Match History', icon: 'time-outline', route: '/history' },
    ],
  },
  {
    title: 'Compete',
    items: [
      { label: 'Tournaments', icon: 'trophy-outline', route: '/tournaments' },
      { label: 'Clubs', icon: 'shield-half-outline', route: '/clubs' },
      { label: 'Players', icon: 'people-outline', route: '/player/all' },
      { label: 'Hall of Fame', icon: 'ribbon-outline', route: '/hall-of-fame' },
    ],
  },
  {
    title: 'Train',
    items: [{ label: 'Practice', icon: 'barbell-outline', route: '/practice' }],
  },
];

export function SideDrawer() {
  const open = useUIStore((s) => s.drawerOpen);
  const close = useUIStore((s) => s.closeDrawer);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [open, progress]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.55 }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -PANEL_W * (1 - progress.value) }] }));

  const name = profile?.display_name || user?.email?.split('@')[0] || 'Player';
  const avatar = profile?.avatar_url ?? null;

  const go = (route: string) => {
    close();
    if (pathname !== route) router.push(route as never);
  };

  const isActive = (route: string) => (route === '/' ? pathname === '/' : pathname.startsWith(route));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.panel, { paddingTop: insets.top + spacing.lg, width: PANEL_W }, panelStyle]}>
        {/* Profile header */}
        <Pressable onPress={() => go('/player/all')} style={styles.profile}>
          {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <Crest name={name} size={52} />}
          <View style={{ flex: 1 }}>
            <AppText variant="title" weight={fontWeight.bold} numberOfLines={1}>
              {name}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {user?.email ?? 'Local profile'}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.lg }}>
          {SECTIONS.map((section) => (
            <View key={section.title} style={{ marginTop: spacing.lg }}>
              <AppText variant="overline" style={{ marginLeft: spacing.lg, marginBottom: spacing.xs }}>
                {section.title}
              </AppText>
              {section.items.map((item) => {
                const active = isActive(item.route);
                return (
                  <Pressable
                    key={item.route}
                    onPress={() => go(item.route)}
                    style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && { backgroundColor: colors.surface2 }]}
                  >
                    <Ionicons name={item.icon} size={20} color={active ? colors.text : colors.textMuted} />
                    <AppText variant="body" weight={active ? fontWeight.bold : fontWeight.medium} color={active ? colors.text : colors.textMuted}>
                      {item.label}
                    </AppText>
                    {active ? <View style={styles.activeBar} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {user ? (
            <Pressable onPress={() => { close(); void signOut(); }} style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surface2 }]}>
              <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
              <AppText variant="body" weight={fontWeight.medium} color={colors.textMuted}>
                Sign out
              </AppText>
            </Pressable>
          ) : null}
          <AppText variant="caption" style={{ marginLeft: spacing.lg, marginTop: spacing.sm }}>
            CRICOS · v1.0
          </AppText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: '#000' },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(18,20,24,0.98)',
    borderRightWidth: 1,
    borderRightColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 6, height: 0 },
    elevation: 16,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.border },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  itemActive: { backgroundColor: colors.surface },
  activeBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, backgroundColor: colors.text },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
});
