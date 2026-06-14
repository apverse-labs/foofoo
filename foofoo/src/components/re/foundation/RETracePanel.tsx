import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SPACING, BORDER_RADIUS, RE_TYPE, getREPalette } from '../../../config/re-theme';

export interface RETracePanelProps {
  /** Build-flag gate. When false (production), the panel renders nothing. */
  enabled?: boolean;
  /** Read-only RE internals to display (persona, overlays, class codes, scores, etc.). */
  trace?: Record<string, unknown>;
}

/**
 * @summary Dev/debug RE trace panel — SHELL ONLY (UI-BUILD-01).
 *
 * @description The ONLY surface allowed to show raw RE internals (meal_class_code, persona,
 *   overlays, score breakdown, source matrix row). Renders nothing unless `enabled` (build flag),
 *   so it is stripped from production UX. No data fetching here — a parent passes `trace`.
 *   Real field population happens in later UI builds; this is the reusable container.
 */
export default function RETracePanel({ enabled = false, trace }: RETracePanelProps) {
  const [open, setOpen] = useState(false);
  const c = getREPalette('light');
  if (!enabled) return null;

  const entries = Object.entries(trace ?? {});
  return (
    <View style={[styles.wrap, { borderColor: c.border }]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`RE debug trace, ${open ? 'expanded' : 'collapsed'}`}
        style={styles.header}
      >
        <Text style={[styles.headerText, { color: c.textSecondary }]}>🐞 RE TRACE (dev) {open ? '▾' : '▸'}</Text>
      </Pressable>
      {open ? (
        <ScrollView style={styles.body}>
          {entries.length === 0 ? (
            <Text style={[styles.kv, { color: c.textSecondary }]}>no trace data passed</Text>
          ) : entries.map(([k, v]) => (
            <Text key={k} style={[styles.kv, { color: c.textPrimary }]} selectable>
              {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </Text>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { margin: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.sm, borderStyle: 'dashed' },
  header: { padding: SPACING.sm },
  headerText: { ...RE_TYPE.caption, fontWeight: '600' },
  body: { maxHeight: 200, paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm },
  kv: { ...RE_TYPE.caption, fontFamily: 'monospace', marginBottom: 2 },
});
