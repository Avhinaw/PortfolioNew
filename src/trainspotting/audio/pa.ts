import { CLIPS, IMPORTANT_KINDS, TRAIN_TIME_LANG, type ClipName } from './clips';
import type { Say } from '@/game/types';

/** Railway PA: recorded chimes + recorded announcement, spoken lines in the chosen language (hi-IN / en-IN), and SFX. */
export class PA {
  private ctx: AudioContext | null = null;
  private clips = new Map<ClipName, AudioBuffer>();
  private loading = false;
  muted = false;
  lang: 'en' | 'hi' = 'en';
  private queue: { say: Say; kind: string }[] = [];
  private busy = false;

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    void this.ctx?.resume();
    void this.loadClips();
  }
  setLang(l: 'en' | 'hi') { this.lang = l; }
  setMuted(m: boolean) { this.muted = m; if (m) this.stop(); }

  private async loadClips() {
    if (this.loading || !this.ctx) return;
    this.loading = true;
    await Promise.all((Object.keys(CLIPS) as ClipName[]).map(async (k) => {
      try {
        const r = await fetch(CLIPS[k]);
        const buf = await this.ctx!.decodeAudioData(await r.arrayBuffer());
        this.clips.set(k, buf);
      } catch { /* missing clip: we fall back to synthesized chime / spoken text */ }
    }));
  }
  private playClip(name: ClipName, vol = 0.9): Promise<boolean> {
    const c = this.ctx, buf = this.clips.get(name);
    if (!c || !buf || this.muted) return Promise.resolve(false);
    return new Promise((resolve) => {
      const s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf; g.gain.value = vol; s.connect(g).connect(c.destination);
      s.onended = () => resolve(true); s.start();
      this.current = s;
    });
  }
  private current: AudioBufferSourceNode | null = null;

  hasVoice(lang: 'en-IN' | 'hi-IN') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    return window.speechSynthesis.getVoices().some((v) => v.lang.replace('_', '-').toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, at = 0, slideTo?: number) {
    const c = this.ctx; if (!c || this.muted) return;
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  private noise(dur: number, vol = 0.08, at = 0, cutoff = 800) {
    const c = this.ctx; if (!c || this.muted) return;
    const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + at);
  }
  sfx(name: string) {
    switch (name) {
      case 'click': this.tone(660, 0.06, 'square', 0.05); break;
      case 'ping': this.tone(880, 0.08, 'square', 0.06); this.tone(1175, 0.1, 'square', 0.06, 0.07); break;
      case 'alert': this.tone(520, 0.1, 'square', 0.05); this.tone(390, 0.14, 'square', 0.05, 0.1); break;
      case 'board': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.06, i * 0.07)); break;
      case 'doors': this.noise(0.5, 0.1, 0, 1200); this.tone(900, 0.1, 'sine', 0.05, 0.4); break;
      case 'horn': this.tone(155, 1.4, 'sawtooth', 0.09, 0, 140); this.tone(196, 1.4, 'sawtooth', 0.06, 0, 175); this.noise(2.5, 0.05, 0.2, 400); break;
      case 'whistle': this.tone(1700, 0.5, 'sine', 0.08, 0, 2100); this.tone(1700, 0.5, 'sine', 0.08, 0.6, 2100); break;
      case 'depart': this.tone(150, 1.6, 'sawtooth', 0.08, 0, 130); this.noise(3, 0.08, 0, 300); break;
    }
  }

  /** Does the recorded train_time voice match the language the player picked? */
  trainTimeFits() { return TRAIN_TIME_LANG === 'both' || TRAIN_TIME_LANG === this.lang; }

  say(say: Say, kind = 'info') {
    if (this.muted) return;
    this.queue.push({ say, kind });
    if (this.queue.length > 2) this.queue.shift();
    void this.pump();
  }
  /** Plays the recorded announcement on demand (used by the language test button). */
  async playRecorded() { this.init(); await this.loadClips(); return this.playClip('trainTime'); }

  private async pump() {
    if (this.busy) return;
    this.busy = true;
    while (this.queue.length && !this.muted) {
      const q = this.queue.shift()!;
      if (q.kind === 'arrival' && this.trainTimeFits() && this.clips.has('trainTime')) { await this.playClip('trainTime'); continue; }
      const chime: ClipName = IMPORTANT_KINDS.includes(q.kind) ? 'chimeB' : 'chimeA';
      if (!(await this.playClip(chime))) { this.tone(659, 0.9, 'sine', 0.16); this.tone(523, 1.2, 'sine', 0.16, 0.55); await new Promise((r) => setTimeout(r, 1500)); }
      if (this.muted) break;
      await this.speak(q.say);
    }
    this.busy = false;
  }
  private speak(say: Say): Promise<void> {
    return new Promise((resolve) => {
      const ss = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      if (!ss) return resolve();
      const wantHi = this.lang === 'hi' && this.hasVoice('hi-IN');
      const lang = wantHi ? 'hi-IN' : 'en-IN', text = wantHi ? say.hi : say.en; // no Hindi voice installed -> English voice
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang; u.rate = 0.92; u.pitch = 1.05;
      const voices = ss.getVoices();
      const v = voices.find((x) => x.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ?? voices.find((x) => x.lang.toLowerCase().startsWith(lang.slice(0, 2)));
      if (v) u.voice = v;
      u.onend = () => resolve(); u.onerror = () => resolve();
      ss.speak(u);
      setTimeout(resolve, 16000);
    });
  }
  stop() {
    this.queue = [];
    try { this.current?.stop(); } catch { /* already stopped */ }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }
}
