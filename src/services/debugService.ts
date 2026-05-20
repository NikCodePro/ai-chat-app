import { useState, useEffect } from "react";

export type DebugMetrics = {
  frontendLatency: number;
  backendLatency: number;
  geminiLatency: number;
  playbackLatency: number;
  totalLatency: number;
  queueSize: number;
  droppedChunks: number;
  wsPingPong: number;
  reconnects: number;
  chunkRate: number; // chunks per second
  jitter: number;
  playbackState: string;
};

class DebugService {
  private metrics: DebugMetrics = {
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
  };

  private listeners: ((metrics: DebugMetrics) => void)[] = [];
  private chunkTimestamps: number[] = [];
  private lastChunkTime = 0;
  private chunkCount = 0;
  private txChunkId = 0;

  constructor() {
    setInterval(() => this.calculateRates(), 1000);
  }

  public subscribe(listener: (metrics: DebugMetrics) => void) {
    this.listeners.push(listener);
    listener(this.metrics);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.metrics }));
  }

  public updateMetric(key: keyof DebugMetrics, value: any) {
    (this.metrics as any)[key] = value;
    this.notify();
  }

  public getNextTxChunkId() {
    return ++this.txChunkId;
  }

  public onMicrophoneChunk() {
    this.chunkCount++;
    const now = Date.now();
    if (this.lastChunkTime > 0) {
      const interval = now - this.lastChunkTime;
      // Calculate simple jitter
      const expectedInterval = 100; // ~100ms chunks usually
      this.metrics.jitter = Math.abs(interval - expectedInterval);
    }
    this.lastChunkTime = now;
    this.notify();
  }

  private calculateRates() {
    this.metrics.chunkRate = this.chunkCount;
    this.chunkCount = 0;
    this.notify();
  }

  public onWsSend(chunkId: number, timestamp: number, size: number) {
    console.log(`[WS_SEND] chunkId=${chunkId} timestamp=${timestamp} size=${size} bytes`);
  }

  public onWsReceive(chunkId: number, timestamp: number, size: number, serverTimestamp: number) {
    const now = Date.now();
    const networkLatency = now - serverTimestamp;
    this.updateMetric("backendLatency", networkLatency);
    console.log(`[WS_RECV] chunkId=${chunkId} timestamp=${timestamp} size=${size} latency=${networkLatency}ms`);
  }

  public onQueueUpdate(size: number) {
    this.updateMetric("queueSize", size);
  }

  public onPlaybackStart(chunkId: number | string) {
    this.updateMetric("playbackState", "Playing");
    console.log(`[PLAY_START] chunkId=${chunkId}`);
  }

  public onPlaybackFinish() {
    this.updateMetric("playbackState", "Idle");
  }

  public onDroppedChunk() {
    this.metrics.droppedChunks++;
    this.notify();
  }
}

export const debugService = new DebugService();
