import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { debugService, DebugMetrics } from '../services/debugService';
import { useDebugStore } from '../store/useDebugStore';

export function DebugOverlay() {
  const isVisible = useDebugStore((s) => s.isVisible);
  const toggleVisibility = useDebugStore((s) => s.toggleVisibility);
  
  const [metrics, setMetrics] = useState<DebugMetrics>({
    frontendLatency: 0,
    backendLatency: 0,
    geminiLatency: 0,
    playbackLatency: 0,
    totalLatency: 0,
    queueSize: 0,
    droppedChunks: 0,
    wsPingPong: 0,
    reconnects: 0,
    chunkRate: 0,
    jitter: 0,
    playbackState: "Idle",
  });

  useEffect(() => {
    if (!isVisible) return;
    const unsubscribe = debugService.subscribe((newMetrics) => {
      setMetrics({ ...newMetrics });
    });
    return () => unsubscribe();
  }, [isVisible]);

  if (!isVisible) {
    return (
      <Pressable style={styles.floatingButton} onPress={toggleVisibility}>
        <Text style={styles.floatingButtonText}>🐛</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Realtime Telemetry</Text>
        <Pressable onPress={toggleVisibility}>
          <Text style={styles.closeBtn}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Network Latency:</Text>
        <Text style={styles.value}>{metrics.backendLatency} ms</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Backend-to-Play Latency:</Text>
        <Text style={styles.value}>{metrics.totalLatency} ms</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Jitter:</Text>
        <Text style={styles.value}>{metrics.jitter} ms</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Chunk Rate:</Text>
        <Text style={styles.value}>{metrics.chunkRate} /sec</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Playback Queue Size:</Text>
        <Text style={[styles.value, metrics.queueSize > 5 ? styles.warn : {}]}>
          {metrics.queueSize}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Playback State:</Text>
        <Text style={styles.value}>{metrics.playbackState}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Dropped Chunks:</Text>
        <Text style={styles.value}>{metrics.droppedChunks}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
    zIndex: 9999,
  },
  floatingButtonText: {
    fontSize: 20,
  },
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(20, 20, 25, 0.95)',
    borderRadius: 12,
    padding: 15,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingBottom: 5,
  },
  title: {
    color: '#00ffcc',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeBtn: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    color: '#aaa',
    fontSize: 12,
  },
  value: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  warn: {
    color: '#ffcc00',
  },
  error: {
    color: '#ff3366',
  },
});
