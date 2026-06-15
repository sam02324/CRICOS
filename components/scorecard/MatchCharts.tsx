/**
 * Match charts — Worm (cumulative runs by over) and Manhattan (runs per over),
 * one series per innings. Built entirely with React Native `View` primitives
 * (no SVG dependency) so it works on the managed Expo runtime without extra
 * packages. The worm is rendered as a set of short rotated segment Views.
 */
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, View, StyleSheet } from 'react-native';
import { Ball, Innings, Match } from '@/types/cricket';
import { AppText, Card, SectionTitle } from '@/components/ui';
import { colors, fontWeight, radius, spacing } from '@/constants/theme';

const SERIES_COLORS = [colors.primary, colors.four];

interface OverAgg {
  over: number; // 1-based over number
  runs: number; // runs scored in this over (bat + extras)
  cumulative: number; // cumulative team runs at end of over
  wickets: number; // wickets that fell in this over
}

/** Aggregate an innings' balls into per-over run/wicket buckets. */
function aggregateOvers(innings: Innings): OverAgg[] {
  const byOver = new Map<number, { runs: number; wickets: number }>();
  for (const b of innings.balls) {
    const runs = b.runs + b.extra.runs;
    const cur = byOver.get(b.overNumber) ?? { runs: 0, wickets: 0 };
    cur.runs += runs;
    if (b.isWicket && b.wicketType !== 'Retired') cur.wickets += 1;
    byOver.set(b.overNumber, cur);
  }
  const maxOver = innings.balls.length
    ? Math.max(...innings.balls.map((b) => b.overNumber))
    : -1;
  const out: OverAgg[] = [];
  let cumulative = 0;
  for (let o = 0; o <= maxOver; o++) {
    const cell = byOver.get(o) ?? { runs: 0, wickets: 0 };
    cumulative += cell.runs;
    out.push({ over: o + 1, runs: cell.runs, cumulative, wickets: cell.wickets });
  }
  return out;
}

/* ------------------------------- Worm chart ------------------------------ */

function WormChart({ series, maxOvers, maxRuns }: { series: OverAgg[][]; maxOvers: number; maxRuns: number }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const xFor = (over: number) => (maxOvers <= 1 ? 0 : ((over - 1) / (maxOvers - 1)) * size.w);
  const yFor = (runs: number) => size.h - (maxRuns <= 0 ? 0 : (runs / maxRuns) * size.h);

  return (
    <View style={styles.plot} onLayout={onLayout}>
      {size.w > 0 &&
        series.map((pts, si) => {
          const color = SERIES_COLORS[si % SERIES_COLORS.length];
          const nodes: React.ReactNode[] = [];
          // include an origin point at over 0 / 0 runs for a clean start
          const withOrigin = [{ over: 0, cumulative: 0, runs: 0, wickets: 0 }, ...pts];
          for (let i = 1; i < withOrigin.length; i++) {
            const x1 = (withOrigin[i - 1].over / Math.max(1, maxOvers)) * size.w;
            const y1 = yFor(withOrigin[i - 1].cumulative);
            const x2 = (withOrigin[i].over / Math.max(1, maxOvers)) * size.w;
            const y2 = yFor(withOrigin[i].cumulative);
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            nodes.push(
              <View
                key={`seg-${si}-${i}`}
                style={{
                  position: 'absolute',
                  left: x1,
                  top: y1 - 1,
                  width: len,
                  height: 2,
                  backgroundColor: color,
                  transform: [{ translateX: 0 }, { rotateZ: `${angle}deg` }],
                  // rotate around the left edge
                  transformOrigin: 'left center',
                }}
              />,
            );
            // wicket marker
            if (withOrigin[i].wickets > 0) {
              nodes.push(
                <View
                  key={`wk-${si}-${i}`}
                  style={{ position: 'absolute', left: x2 - 3, top: y2 - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.wicket }}
                />,
              );
            }
          }
          return <React.Fragment key={`series-${si}`}>{nodes}</React.Fragment>;
        })}
    </View>
  );
}

/* ----------------------------- Manhattan chart --------------------------- */

function ManhattanChart({ series, maxOvers, maxOverRuns }: { series: OverAgg[][]; maxOvers: number; maxOverRuns: number }) {
  // group-bar per over: each over slot holds up to N thin bars (one per innings)
  const overs = Array.from({ length: maxOvers }, (_, i) => i + 1);
  return (
    <View style={styles.manhattan}>
      {overs.map((ov) => (
        <View key={ov} style={styles.manhattanCol}>
          <View style={styles.manhattanBars}>
            {series.map((pts, si) => {
              const cell = pts.find((p) => p.over === ov);
              const runs = cell?.runs ?? 0;
              const h = maxOverRuns > 0 ? (runs / maxOverRuns) * 100 : 0;
              const hasWicket = (cell?.wickets ?? 0) > 0;
              return (
                <View
                  key={si}
                  style={{
                    flex: 1,
                    marginHorizontal: 1,
                    height: `${Math.max(h, runs > 0 ? 4 : 0)}%`,
                    backgroundColor: hasWicket ? colors.wicket : SERIES_COLORS[si % SERIES_COLORS.length],
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }}
                />
              );
            })}
          </View>
          {ov % Math.ceil(maxOvers / 10 || 1) === 0 ? (
            <AppText variant="caption" style={styles.manhattanLabel}>
              {ov}
            </AppText>
          ) : (
            <View style={{ height: 12 }} />
          )}
        </View>
      ))}
    </View>
  );
}

/* -------------------------------- Legend --------------------------------- */

function Legend({ names }: { names: string[] }) {
  return (
    <View style={styles.legend}>
      {names.map((n, i) => (
        <View key={i} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }]} />
          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
            {n}
          </AppText>
        </View>
      ))}
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: colors.wicket }]} />
        <AppText variant="caption" color={colors.textMuted}>
          Wicket
        </AppText>
      </View>
    </View>
  );
}

/* -------------------------------- Public --------------------------------- */

export function MatchCharts({ match }: { match: Match }) {
  const data = useMemo(() => {
    const series = match.innings.map(aggregateOvers);
    const names = match.innings.map((i) => i.battingTeamName);
    const maxOvers = Math.max(
      match.totalOvers,
      ...series.map((s) => (s.length ? s[s.length - 1].over : 0)),
      1,
    );
    const maxRuns = Math.max(1, ...series.map((s) => (s.length ? s[s.length - 1].cumulative : 0)));
    const maxOverRuns = Math.max(1, ...series.flatMap((s) => s.map((o) => o.runs)));
    return { series, names, maxOvers, maxRuns, maxOverRuns };
  }, [match]);

  const hasBalls = match.innings.some((i) => i.balls.length > 0);
  if (!hasBalls) return null;

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <SectionTitle>Worm — cumulative runs</SectionTitle>
        <View style={styles.chartFrame}>
          <View style={styles.yAxis}>
            <AppText variant="caption" color={colors.textFaint}>
              {data.maxRuns}
            </AppText>
            <AppText variant="caption" color={colors.textFaint}>
              0
            </AppText>
          </View>
          <WormChart series={data.series} maxOvers={data.maxOvers} maxRuns={data.maxRuns} />
        </View>
        <Legend names={data.names} />
      </Card>

      <Card>
        <SectionTitle>Manhattan — runs per over</SectionTitle>
        <View style={styles.chartFrame}>
          <View style={styles.yAxis}>
            <AppText variant="caption" color={colors.textFaint}>
              {data.maxOverRuns}
            </AppText>
            <AppText variant="caption" color={colors.textFaint}>
              0
            </AppText>
          </View>
          <ManhattanChart series={data.series} maxOvers={data.maxOvers} maxOverRuns={data.maxOverRuns} />
        </View>
        <Legend names={data.names} />
      </Card>
    </View>
  );
}

const CHART_HEIGHT = 160;

const styles = StyleSheet.create({
  chartFrame: { flexDirection: 'row', height: CHART_HEIGHT + 16, marginTop: spacing.sm },
  yAxis: { width: 28, justifyContent: 'space-between', paddingVertical: 2, alignItems: 'flex-end', paddingRight: spacing.xs },
  plot: {
    flex: 1,
    height: CHART_HEIGHT,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  manhattan: {
    flex: 1,
    height: CHART_HEIGHT + 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 2,
    paddingTop: spacing.xs,
  },
  manhattanCol: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  manhattanBars: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, width: '100%', justifyContent: 'center' },
  manhattanLabel: { height: 12, textAlign: 'center', fontSize: 9 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: 140 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
