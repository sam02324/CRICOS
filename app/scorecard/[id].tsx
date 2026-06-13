/**
 * Scorecard — full batting/bowling tables for both innings, the result banner,
 * a capture-ready share card, and WhatsApp/Instagram share (image + text).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Share, ScrollView, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Match } from '@/types/cricket';
import { AppText, Button, Card, Ionicons, Screen } from '@/components/ui';
import { Header } from '@/components/Header';
import { InningsTable } from '@/components/scorecard/InningsTable';
import { ShareCard } from '@/components/scorecard/ShareCard';
import { useMatchStore } from '@/store/matchStore';
import { useHistoryStore } from '@/store/historyStore';
import { loadLiveMatch, loadMatches } from '@/utils/storage';
import { buildShareText, shareMatchImage } from '@/utils/share';
import { computeMatchMVP } from '@/utils/mvp';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

export default function ScorecardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const storeMatch = useMatchStore((s) => s.match);
  const addTemplate = useHistoryStore((s) => s.addTemplate);

  const [match, setMatch] = useState<Match | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (storeMatch && storeMatch.id === id) {
        setMatch(storeMatch);
        return;
      }
      const matches = await loadMatches();
      const found = matches.find((m) => m.id === id);
      if (found) {
        if (!cancelled) setMatch(found);
        return;
      }
      const live = await loadLiveMatch();
      if (live && live.id === id && !cancelled) setMatch(live);
    };
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [id, storeMatch]);

  const text = useMemo(() => (match ? buildShareText(match) : ''), [match]);
  const mvp = useMemo(() => (match && match.status === 'completed' ? computeMatchMVP(match) : null), [match]);

  if (!match) {
    return (
      <Screen>
        <Header title="Scorecard" />
        <View style={styles.center}>
          <AppText variant="title">Match not found</AppText>
          <Button title="Back to Home" variant="ghost" style={{ marginTop: spacing.lg }} onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  const onShareImage = async () => {
    setSharing(true);
    const ok = await shareMatchImage(shareRef);
    setSharing(false);
    if (!ok) {
      // fall back to text if image sharing is unavailable
      void Share.share({ message: text });
    }
  };

  const onShareText = () => {
    void Share.share({ message: text });
  };

  const onSaveTemplate = () => {
    void addTemplate({
      name: `${match.format} • ${match.totalOvers} ov`,
      format: match.format,
      totalOvers: match.totalOvers,
      playersPerSide: match.playersPerSide,
      rules: match.rules,
    });
    Alert.alert('Saved', 'Rule-set saved as a template.');
  };

  return (
    <Screen>
      <Header
        title="Scorecard"
        subtitle={`${match.team1.name} vs ${match.team2.name}`}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {match.result ? (
          <Card variant="surface" style={styles.resultBanner}>
            <View style={styles.resultMark}>
              <Ionicons name="trophy" size={26} color={colors.gold} />
            </View>
            <AppText variant="h2" center weight={fontWeight.black} style={{ marginTop: spacing.md }}>
              {match.result.text}
            </AppText>
            {match.venue ? (
              <AppText variant="label" center>
                {match.venue}
              </AppText>
            ) : null}
          </Card>
        ) : (
          <Card variant="outline" style={{ alignItems: 'center' }}>
            <AppText variant="title" color={colors.warning}>
              Match in progress
            </AppText>
          </Card>
        )}

        {mvp ? (
          <Card style={styles.mvpCard}>
            <View style={styles.mvpStar}>
              <Ionicons name="star" size={22} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="overline" color={colors.gold}>
                Player of the Match
              </AppText>
              <AppText variant="h2" weight={fontWeight.black}>
                {mvp.name}
              </AppText>
              <AppText variant="label">{mvp.summary} • {mvp.points} pts</AppText>
            </View>
          </Card>
        ) : null}

        {/* Capture target for the share image */}
        <ShareCard ref={shareRef} match={match} />

        <View style={styles.shareRow}>
          <Button title="Share Image" icon="logo-whatsapp" loading={sharing} onPress={onShareImage} style={{ flex: 1 }} />
          <Button title="Text" icon="copy-outline" variant="secondary" onPress={onShareText} style={{ flex: 1 }} />
        </View>

        {match.innings.map((inn, i) => (
          <InningsTable key={i} innings={inn} />
        ))}

        <Button title="Save rule-set as template" icon="bookmark-outline" variant="ghost" onPress={onSaveTemplate} />
        <View style={styles.bottomRow}>
          <Button title="Home" icon="home" variant="secondary" onPress={() => router.replace('/')} style={{ flex: 1 }} />
          <Button title="New Match" icon="add" onPress={() => router.replace('/new-match')} style={{ flex: 1 }} />
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.lg },
  resultBanner: { alignItems: 'center' },
  resultMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvpCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.warning },
  mvpStar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  shareRow: { flexDirection: 'row', gap: spacing.md },
  bottomRow: { flexDirection: 'row', gap: spacing.md },
});
