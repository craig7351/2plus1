/**
 * 遊戲音效服務
 * 使用 Web Audio API 生成 8-bit 風格音效
 */

class SoundService {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private enabled: boolean = true;

    constructor() {
        // 延遲初始化，等待用戶互動後才建立 AudioContext
    }

    private ensureContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // 主音量
            this.masterGain.connect(this.audioContext.destination);
        }

        // 確保 AudioContext 是運行狀態
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        return this.audioContext;
    }

    // 設定音效開關
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    // 設定主音量 (0-1)
    setVolume(volume: number) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    // 播放音符
    private playTone(frequency: number, duration: number, type: OscillatorType = 'square', volume: number = 0.3) {
        if (!this.enabled) return;

        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }

    // 播放噪音
    private playNoise(duration: number, volume: number = 0.2) {
        if (!this.enabled) return;

        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        noise.connect(gainNode);
        gainNode.connect(this.masterGain);

        noise.start(ctx.currentTime);
    }

    // ===== 遊戲音效 =====

    // 跳躍音效
    jump() {
        if (!this.enabled) return;
        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.8, ctx.currentTime);  // 音量 x4
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    }

    // 攻擊音效
    attack() {
        this.playNoise(0.08, 1.0);  // 音量 x4
        this.playTone(150, 0.1, 'sawtooth', 0.8);  // 音量 x4
    }

    // 發射子彈音效
    shoot() {
        if (!this.enabled) return;
        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }

    // 必殺技發射音效 (波動拳風格)
    specialShoot() {
        if (!this.enabled) return;
        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        // 能量蓄積音
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(150, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
        gain1.gain.setValueAtTime(0.8, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.2);

        // 發射音
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(300, ctx.currentTime + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
        gain2.gain.setValueAtTime(1.0, ctx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(ctx.currentTime + 0.05);
        osc2.stop(ctx.currentTime + 0.3);

        // 噪音效果
        this.playNoise(0.2, 0.6);
    }

    // 命中音效
    hit() {
        if (!this.enabled) return;
        const ctx = this.ensureContext();
        if (!ctx || !this.masterGain) return;

        // 衝擊聲
        this.playNoise(0.15, 1.0);  // 音量 x4

        // 低頻震撼
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(100, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(1.0, ctx.currentTime);  // 音量 x4
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }

    // 遊戲開始音效
    gameStart() {
        if (!this.enabled) return;

        setTimeout(() => this.playTone(262, 0.1, 'square', 0.25), 0);    // C4
        setTimeout(() => this.playTone(330, 0.1, 'square', 0.25), 100);  // E4
        setTimeout(() => this.playTone(392, 0.1, 'square', 0.25), 200);  // G4
        setTimeout(() => this.playTone(523, 0.2, 'square', 0.3), 300);   // C5
    }

    // 勝利音效
    victory() {
        if (!this.enabled) return;

        setTimeout(() => this.playTone(523, 0.15, 'square', 0.3), 0);    // C5
        setTimeout(() => this.playTone(659, 0.15, 'square', 0.3), 150);  // E5
        setTimeout(() => this.playTone(784, 0.15, 'square', 0.3), 300);  // G5
        setTimeout(() => this.playTone(1047, 0.3, 'square', 0.35), 450); // C6
    }

    // 失敗音效
    defeat() {
        if (!this.enabled) return;

        setTimeout(() => this.playTone(392, 0.2, 'square', 0.3), 0);    // G4
        setTimeout(() => this.playTone(330, 0.2, 'square', 0.3), 200);  // E4
        setTimeout(() => this.playTone(262, 0.3, 'square', 0.3), 400);  // C4
        setTimeout(() => this.playTone(196, 0.4, 'square', 0.25), 700); // G3
    }

    // 連線成功音效
    connected() {
        setTimeout(() => this.playTone(440, 0.1, 'sine', 0.2), 0);   // A4
        setTimeout(() => this.playTone(880, 0.15, 'sine', 0.25), 100); // A5
    }

    // 按鈕點擊音效
    click() {
        this.playTone(800, 0.05, 'square', 0.15);
    }

    // 重新開始音效
    restart() {
        if (!this.enabled) return;

        setTimeout(() => this.playTone(392, 0.1, 'triangle', 0.25), 0);   // G4
        setTimeout(() => this.playTone(523, 0.1, 'triangle', 0.25), 100); // C5
        setTimeout(() => this.playTone(659, 0.15, 'triangle', 0.3), 200); // E5
    }
}

export const soundService = new SoundService();
