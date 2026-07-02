// ============================================================
// 8-bit Chiptune BGM 合成器 — 原创像素风背景音乐
// 使用 Web Audio API 生成 NES 风格的方波/三角波/噪音音乐
// 100% 原创，免费商用，无版权问题
// ============================================================

const ChiptuneBGM = {
  ctx: null,
  masterGain: null,
  sfxGain: null,
  currentTrack: null,
  isPlaying: false,
  scheduled: [],
  nextNoteTime: 0,
  tempo: 120,
  noteIndex: 0,
  timerID: null,
  volume: 0.3,

  // 音符频率表 (A4=440Hz)
  noteFreq: {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00, 'B6': 1975.53,
    'REST': 0
  },

  // ===== 各曲目数据 =====
  // 格式: [音符, 时值(拍)], 时值: 1=四分音符, 0.5=八分, 0.25=十六分, 2=二分, 4=全音符
  tracks: {
    // 标题/主界面 - 欢快明亮的开场曲
    title: {
      tempo: 130,
      melody: [
        // 主旋律（方波1）- 欢快的中国风小调
        ['E5',0.5],['G5',0.5],['E5',0.5],['D5',0.5],['C5',0.5],['D5',0.5],['E5',1],['REST',0.5],
        ['G5',0.5],['A5',0.5],['G5',0.5],['E5',0.5],['D5',0.5],['C5',0.5],['D5',1],['REST',0.5],
        ['E5',0.5],['G5',0.5],['A5',0.5],['G5',0.5],['E5',0.5],['D5',0.5],['C5',0.5],['D5',0.5],
        ['E5',1],['D5',0.5],['C5',0.5],['D5',2],['REST',1],
        ['A4',0.5],['C5',0.5],['E5',0.5],['G5',0.5],['A5',1],['G5',0.5],['E5',0.5],
        ['D5',0.5],['E5',0.5],['G5',0.5],['A5',0.5],['G5',1],['E5',1],
        ['C5',0.5],['D5',0.5],['E5',0.5],['G5',0.5],['A5',0.5],['G5',0.5],['E5',0.5],['D5',0.5],
        ['C5',2],['REST',2],
      ],
      bass: [
        // 低音（三角波）
        ['C3',1],['G3',1],['A3',1],['E3',1],
        ['C3',1],['G3',1],['D3',1],['G3',1],
        ['C3',1],['G3',1],['A3',1],['E3',1],
        ['F3',1],['G3',1],['C3',2],
        ['A3',1],['E3',1],['A3',1],['E3',1],
        ['F3',1],['G3',1],['C3',1],['G3',1],
        ['C3',1],['G3',1],['A3',1],['E3',1],
        ['F3',1],['G3',1],['C3',2],
      ]
    },

    // 地图探索 - 冒险进行曲
    map: {
      tempo: 110,
      melody: [
        ['D4',0.5],['F4',0.25],['A4',0.25],['D5',0.5],['C5',0.25],['A4',0.25],
        ['B4',0.5],['A4',0.25],['G4',0.25],['F4',0.5],['E4',0.5],
        ['D4',0.5],['F4',0.25],['A4',0.25],['B4',0.5],['G4',0.5],
        ['A4',0.5],['B4',0.25],['D5',0.25],['F5',1],['REST',0.5],
        ['E5',0.5],['D5',0.25],['C5',0.25],['B4',0.5],['A4',0.25],['G4',0.25],
        ['F4',0.5],['E4',0.25],['D4',0.25],['F4',0.5],['A4',0.5],
        ['B4',0.5],['D5',0.5],['C5',0.5],['A4',0.5],
        ['G4',0.5],['F4',0.5],['E4',0.5],['D4',0.5],
        ['D5',1],['C5',0.5],['B4',0.5],
        ['A4',0.5],['G4',0.5],['F4',0.5],['D4',0.5],
        ['E4',0.5],['F4',0.5],['G4',0.5],['A4',0.5],
        ['D4',2],['REST',2],
      ],
      bass: [
        ['D3',1],['A3',1],['B3',1],['F3',1],
        ['D3',1],['G3',1],['A3',1],['D3',1],
        ['D3',1],['A3',1],['B3',1],['F3',1],
        ['G3',1],['D3',1],['G3',1],['A3',1],
        ['D3',1],['A3',1],['B3',1],['F3',1],
        ['G3',1],['D3',1],['G3',1],['D3',1],
      ]
    },

    // 战斗 - 紧张激烈
    battle: {
      tempo: 150,
      melody: [
        ['E5',0.25],['E5',0.25],['REST',0.25],['E5',0.25],
        ['REST',0.25],['E5',0.25],['REST',0.25],['G5',0.25],
        ['E5',0.5],['REST',0.5],['D5',0.5],['E5',0.5],
        ['F5',0.25],['E5',0.25],['D5',0.25],['C5',0.25],
        ['B4',0.5],['A4',0.5],['G4',0.5],['REST',0.5],
        ['E5',0.25],['E5',0.25],['REST',0.25],['E5',0.25],
        ['REST',0.25],['E5',0.25],['REST',0.25],['G5',0.25],
        ['E5',0.5],['REST',0.5],['D5',0.5],['E5',0.5],
        ['F5',0.25],['E5',0.25],['D5',0.25],['F5',0.25],
        ['E5',1],['REST',1],
        ['G5',0.25],['F5',0.25],['E5',0.25],['D5',0.25],
        ['C5',0.5],['D5',0.5],['E5',0.5],['G5',0.5],
        ['A5',0.25],['G5',0.25],['E5',0.25],['D5',0.25],
        ['C5',1],['REST',1],
      ],
      bass: [
        ['E3',0.5],['E3',0.5],['E3',0.5],['E3',0.5],
        ['G3',0.5],['G3',0.5],['E3',0.5],['E3',0.5],
        ['D3',0.5],['D3',0.5],['E3',0.5],['E3',0.5],
        ['C3',0.5],['C3',0.5],['B3',0.5],['B3',0.5],
        ['E3',0.5],['E3',0.5],['E3',0.5],['E3',0.5],
        ['G3',0.5],['G3',0.5],['E3',0.5],['E3',0.5],
        ['D3',0.5],['D3',0.5],['F3',0.5],['E3',0.5],
        ['C3',0.5],['C3',0.5],['C3',0.5],['C3',0.5],
      ]
    },

    // 剧情对话 - 轻柔神秘
    story: {
      tempo: 80,
      melody: [
        ['E4',1],['G4',1],['A4',0.5],['G4',0.5],
        ['E4',1],['D4',1],['C4',2],
        ['D4',1],['F4',1],['E4',0.5],['D4',0.5],
        ['C4',1],['D4',1],['E4',2],
        ['G4',1],['A4',1],['B4',0.5],['A4',0.5],
        ['G4',1],['E4',1],['D4',2],
        ['E4',0.5],['G4',0.5],['A4',0.5],['G4',0.5],['F4',1],['E4',1],
        ['D4',2],['REST',2],
      ],
      bass: [
        ['C3',2],['G3',2],
        ['A3',2],['E3',2],
        ['F3',2],['C3',2],
        ['G3',2],['C3',2],
      ]
    },

    // 胜利 - 欢快庆祝
    victory: {
      tempo: 140,
      melody: [
        ['C5',0.5],['E5',0.5],['G5',0.5],['C6',0.5],
        ['B5',0.5],['G5',0.5],['E5',0.5],['C5',0.5],
        ['D5',0.5],['F5',0.5],['A5',0.5],['D6',0.5],
        ['C6',1],['REST',0.5],['G5',0.5],
        ['E5',0.5],['G5',0.5],['C6',1],['B5',0.5],['A5',0.5],
        ['G5',0.5],['A5',0.5],['B5',0.5],['C6',0.5],
        ['D6',2],['REST',2],
        ['C6',0.25],['B5',0.25],['A5',0.25],['G5',0.25],
        ['E5',0.25],['G5',0.25],['C6',0.5],['REST',0.5],
        ['C6',1],['REST',3],
      ],
      bass: [
        ['C3',1],['G3',1],['C3',1],['G3',1],
        ['D3',1],['A3',1],['D3',1],['G3',1],
        ['C3',1],['G3',1],['C3',1],['F3',1],
        ['G3',1],['C3',1],['C3',2],
      ]
    }
  },

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio不可用', e);
    }
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  },

  // 创建8-bit方波音符
  playSquareNote(freq, startTime, duration, volume = 0.3) {
    if (!this.ctx || freq === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    // 包络：快速attack，持续，快速release
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.9);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  },

  // 创建三角波低音
  playTriangleNote(freq, startTime, duration, volume = 0.25) {
    if (!this.ctx || freq === 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  },

  // 创建噪音打击乐
  playDrum(startTime, volume = 0.1) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(startTime);
  },

  // 调度下一批音符
  scheduleNotes() {
    if (!this.isPlaying || !this.currentTrack) return;
    const track = this.tracks[this.currentTrack];
    if (!track) return;

    const beatDur = 60 / track.tempo; // 一拍的秒数
    const scheduleAhead = 0.2; // 提前调度时间

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAhead) {
      const melodyNote = track.melody[this.noteIndex % track.melody.length];
      const bassNote = track.bass[this.noteIndex % track.bass.length];

      if (melodyNote) {
        const [note, beats] = melodyNote;
        const freq = this.noteFreq[note] || 0;
        const dur = beats * beatDur;
        this.playSquareNote(freq, this.nextNoteTime, dur * 0.95, 0.2);
      }

      if (bassNote) {
        const [note, beats] = bassNote;
        const freq = this.noteFreq[note] || 0;
        const dur = beats * beatDur;
        this.playTriangleNote(freq, this.nextNoteTime, dur * 0.95, 0.22);
      }

      // 每拍打鼓
      const beats = melodyNote ? melodyNote[1] : 1;
      this.nextNoteTime += beats * beatDur;
      this.noteIndex++;
    }

    this.timerID = setTimeout(() => this.scheduleNotes(), 50);
  },

  play(trackName) {
    this.init();
    this.resume();
    if (this.currentTrack === trackName && this.isPlaying) return;
    this.stop();
    this.currentTrack = trackName;
    this.isPlaying = true;
    this.noteIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduleNotes();
  },

  stop() {
    this.isPlaying = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    this.currentTrack = null;
    // 快速淡出
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      setTimeout(() => {
        if (this.masterGain) this.masterGain.gain.value = this.volume;
      }, 400);
    }
  },

  // ===== 音效 =====
  playSfx(type) {
    this.init();
    this.resume();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    try {
      switch (type) {
        case 'click': {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = 880;
          g.gain.setValueAtTime(0.08, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(g); g.connect(this.sfxGain);
          osc.start(now); osc.stop(now + 0.06);
          break;
        }
        case 'hit': {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
          g.gain.setValueAtTime(0.12, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(g); g.connect(this.sfxGain);
          osc.start(now); osc.stop(now + 0.15);
          // 噪音叠加
          this.playDrum(now, 0.08);
          break;
        }
        case 'heal': {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.linearRampToValueAtTime(1047, now + 0.3);
          g.gain.setValueAtTime(0.1, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(g); g.connect(this.sfxGain);
          osc.start(now); osc.stop(now + 0.35);
          break;
        }
        case 'victory': {
          // 胜利琶音
          [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            const t = now + i * 0.12;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.1, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(g); g.connect(this.sfxGain);
            osc.start(t); osc.stop(t + 0.35);
          });
          break;
        }
        case 'levelup': {
          [523, 659, 784, 1047, 1319].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            const t = now + i * 0.08;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.08, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.connect(g); g.connect(this.sfxGain);
            osc.start(t); osc.stop(t + 0.25);
          });
          break;
        }
        case 'defeat': {
          [523, 440, 349, 262].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            const t = now + i * 0.15;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.1, t + 0.03);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(g); g.connect(this.sfxGain);
            osc.start(t); osc.stop(t + 0.45);
          });
          break;
        }
        default: {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = 600;
          g.gain.setValueAtTime(0.06, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(g); g.connect(this.sfxGain);
          osc.start(now); osc.stop(now + 0.08);
        }
      }
    } catch (e) {}
  },

  setSfxVolume(v) {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v)) * 0.5;
  }
};
