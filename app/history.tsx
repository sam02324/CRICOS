/**
 * Match History — every completed match with format + text filters. Tap opens
 * the scorecard; long-press deletes.
 */
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MatchFormat } from '@/types/cricket';
import { AppText, Chip, EmptyState, Field, Ionicons, Screen } from '@/components/ui';
import { Header } from '@/components/Header';
import { MatchCard } from '@/components/MatchCard';
import { useHistoryStore } from '@/store/historyStore';
import { useAuthStore } from '@/store/authStore';
import { syncMatchesFromCloud } from '@/utils/cloudSync';
import { isSupabaseConfigured } from '@/lib/env';
import { colors, spacing } from '@/constants/theme';

const FORMAT_FILTERS: (MatchFormat | 'All')[] = ['All', 'T20', 'ODI', 'Box', 'Pairs', 'Custom', 'Test'];

export default function HistoryScreen() {
  const router = useRouter();
  const { matches, refresh, deleteMatch } = useHistoryStore();
  const user = useAuthStore((s) => s.user);
  const [formatFilter, setFormatFilter] = useState<MatchFormat | 'All'>('All');
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  const canSync = isSupabaseConfigured && !!user;
  const onSync = async () => {
    if (!canSync || syncing) return;
    setSyncing(true);
    try {
      await syncMatchesFromCloud();
      await refresh();
    } catch {
      Alert.alert('Sync failed', 'Could not sync with the cloud. Try again.');
    } finally {
      setSyncing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (formatFilter !== 'All' && m.format !== formatFilter) return false;
      if (q) {
        const hay = `${m.team1.name} ${m.team2.name} ${m.venue}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, formatFilter, query]);

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Delete match?', `Remove "${label}" permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteMatch(id) },
    ]);
  };

  return (
    <Screen>
      <Header
        title="Match History"
        subtitle={`${matches.length} matches`}
        right={
          canSync ? (
            <Pressable onPress={onSync} hitSlop={8} style={styles.syncBtn} disabled={syncing}>
              {syncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
              )}
              <AppText variant="label" color={colors.primary}>
                {syncing ? 'Syncing' : 'Sync'}
              </AppText>
            </Pressable>
          ) : undefined
        }
      />
      <View style={styles.filters}>
        <Field placeholder="Search team or venue…" value={query} onChangeText={setQuery} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FORMAT_FILTERS.map((f) => (
            <Chip key={f} label={f} selected={formatFilter === f} onPress={() => setFormatFilter(f)} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title={matches.length === 0 ? 'No matches yet' : 'No matches match your filter'}
            subtitle={matches.length === 0 ? 'Completed matches appear here' : 'Try a different format or search'}
          />
        ) : (
          filtered.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              onPress={() => router.push(`/scorecard/${m.id}`)}
              onLongPress={() => confirmDelete(m.id, `${m.team1.name} vs ${m.team2.name}`)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  filters: { paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.sm },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
});
