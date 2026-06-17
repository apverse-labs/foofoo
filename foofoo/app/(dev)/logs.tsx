/**
 * @summary Developer tools screen — view all logs on device.
 *
 * @description
 * Three tabs: User Journey | RE Decisions | System Logs.
 * Each shows a scrollable monospace terminal view of log content.
 * Triggered by triple-tapping the app title on the Home screen.
 * Only accessible in __DEV__ mode — returns null in production.
 *
 * @calledBy app/(tabs)/index.tsx — triple-tap on "Foofoo" title
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Share, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useClientInsets } from '../../src/hooks/useClientInsets';
import { supabase } from '../../src/services/supabase';
import { UserJourneyLogger } from '../../src/utils/userJourneyLogger';
import { REDecisionLogger } from '../../src/utils/reDecisionLogger';
import { Logger } from '../../src/utils/systemLogger';

declare const __DEV__: boolean;

type TabName = 'journey' | 're' | 'system';

const TABS: Array<{ key: TabName; label: string }> = [
  { key: 'journey', label: 'User Journey' },
  { key: 're', label: 'RE Decisions' },
  { key: 'system', label: 'System' },
];

const DARK_BG = '#0D1117';
const TERMINAL_GREEN = '#00FF41';
const TERMINAL_RED = '#FF4444';
const TERMINAL_YELLOW = '#FFD700';
const TERMINAL_WHITE = '#E6EDF3';

export default function DevLogsScreen() {
  // __DEV__ is a compile-time constant — this wrapper ensures hooks
  // are never called conditionally at runtime.
  if (!__DEV__) return null;
  return <DevLogsContent />;
}

function DevLogsContent() {
  const router = useRouter();
  const insets = useClientInsets();
  const [activeTab, setActiveTab] = useState<TabName>('journey');
  const [userId, setUserId] = useState<string | null>(null);
  const [logText, setLogText] = useState('Loading…');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => { if (data.user) setUserId(data.user.id); })
      .catch(() => { /* dev screen — non-fatal */ });
  }, []);

  const loadLog = useCallback(async (tab: TabName, uid: string | null) => {
    setLoading(true);
    try {
      if (tab === 'journey') {
        const text = uid ? await UserJourneyLogger.getFullLog(uid) : '(not signed in)';
        setLogText(text);
      } else if (tab === 're') {
        const text = await REDecisionLogger.getRecentLogs();
        setLogText(text);
      } else {
        const text = await Logger.getLogs();
        setLogText(text);
      }
    } catch (err: any) {
      setLogText(`(error loading log: ${err?.message ?? 'unknown'})`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLog(activeTab, userId);
  }, [activeTab, userId, loadLog]);

  const handleClear = async () => {
    if (activeTab === 'journey' && userId) {
      await UserJourneyLogger.clearLog(userId);
    } else if (activeTab === 'system') {
      await Logger.clearLogs();
    }
    loadLog(activeTab, userId);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: logText,
        title: `FooFoo ${TABS.find(t => t.key === activeTab)?.label} Log`,
      });
    } catch {
      // User cancelled share — fine
    }
  };

  // Colour-map log lines for system tab
  const renderLogLine = (line: string, index: number) => {
    let color = TERMINAL_GREEN;
    if (line.includes('[ERROR]')) color = TERMINAL_RED;
    else if (line.includes('[WARN]')) color = TERMINAL_YELLOW;
    else if (line.includes('[INFO]')) color = TERMINAL_WHITE;
    else if (line.includes('═')) color = '#4EC9B0';
    else if (line.includes('─')) color = '#569CD6';
    else if (line.startsWith('  ✓')) color = TERMINAL_GREEN;
    else if (line.startsWith('  ✗')) color = TERMINAL_RED;
    else if (line.startsWith('  2.') || line.startsWith('  3.') || line.startsWith('  4.')) color = '#C586C0';

    return (
      <Text key={index} style={[styles.logLine, { color }]}>
        {line}
      </Text>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'// FooFoo Dev Logs'}</Text>
        <Text style={styles.buildTag}>{'__DEV__'}</Text>
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tabPill, activeTab === tab.key && styles.tabPillActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Log content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        indicatorStyle="white"
      >
        {loading ? (
          <ActivityIndicator color={TERMINAL_GREEN} style={styles.loader} />
        ) : (
          logText.split('\n').map(renderLogLine)
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={styles.actionBtn} onPress={handleClear}>
          <Text style={[styles.actionText, { color: TERMINAL_RED }]}>Clear</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => loadLog(activeTab, userId)}>
          <Text style={styles.actionText}>Refresh</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleShare}>
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => router.back()}>
          <Text style={[styles.actionText, { color: TERMINAL_YELLOW }]}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  headerTitle: {
    color: TERMINAL_GREEN,
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
  },
  buildTag: {
    color: '#6E7681',
    fontFamily: 'monospace',
    fontSize: 11,
    backgroundColor: '#21262D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  tabPillActive: {
    backgroundColor: '#1F6FEB22',
    borderColor: TERMINAL_GREEN,
  },
  tabLabel: {
    color: '#6E7681',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  tabLabelActive: {
    color: TERMINAL_GREEN,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  logLine: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 17,
  },
  loader: {
    marginTop: 40,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#21262D',
    backgroundColor: '#161B22',
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  actionText: {
    color: TERMINAL_WHITE,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
  },
});
