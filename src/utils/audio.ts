/**
 * Audio processing utilities for Gemini Live API
 * Input: 16kHz 16-bit mono PCM
 * Output: 24kHz 16-bit mono PCM
 */

export function float32To16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function pcmToBase64(float32Array: Float32Array): string {
  const buffer = float32To16BitPCM(float32Array);
  return arrayBufferToBase64(buffer);
}

export function base64ToAudioBuffer(
  audioCtx: AudioContext,
  base64: string,
  sampleRate: number = 24000
): AudioBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const pcm16 = new Int16Array(bytes.buffer);
  const audioBuffer = audioCtx.createBuffer(1, pcm16.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < pcm16.length; i++) {
    channelData[i] = pcm16[i] / 32768.0;
  }

  return audioBuffer;
}

export class AudioQueuePlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onStateChange?: (isPlaying: boolean) => void;

  constructor(onStateChange?: (isPlaying: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  public init(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public playChunk(base64: string): void {
    const ctx = this.init();
    try {
      const buffer = base64ToAudioBuffer(ctx, base64, 24000);
      const currentTime = ctx.currentTime;

      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05; // small lead buffer to avoid underrun
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      if (this.analyser) {
        source.connect(this.analyser);
      } else {
        source.connect(ctx.destination);
      }

      source.start(this.nextStartTime);
      this.activeSources.push(source);
      this.onStateChange?.(true);

      const duration = buffer.duration;
      this.nextStartTime += duration;

      source.onended = () => {
        const idx = this.activeSources.indexOf(source);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
        if (this.activeSources.length === 0) {
          this.onStateChange?.(false);
        }
      };
    } catch (err) {
      console.error('[AudioPlayer] Error playing chunk:', err);
    }
  }

  public stopAll(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    this.onStateChange?.(false);
  }

  public close(): void {
    this.stopAll();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
