const CIRCUMFERENCE = 2 * Math.PI * 120; // r=120

const defaults = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4
};

const state = {
  mode: 'work',
  timeLeft: 0,
  totalTime: 0,
  running: false,
  paused: false,
  interval: null,
  sessionsCompleted: 0,
  settings: { ...defaults }
};

const elements = {
  timerText: document.getElementById('timer-text'),
  timerLabel: document.getElementById('timer-label'),
  startBtn: document.getElementById('start-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  resetBtn: document.getElementById('reset-btn'),
  progressCircle: document.querySelector('.progress-ring-circle'),
  timerDisplay: document.querySelector('.timer-display'),
  sessionCount: document.getElementById('session-count'),
  sessionDots: document.getElementById('session-dots'),
  settingsToggle: document.getElementById('settings-toggle'),
  settingsPanel: document.getElementById('settings-panel'),
  saveSettings: document.getElementById('save-settings'),
  cancelSettings: document.getElementById('cancel-settings'),
  workDuration: document.getElementById('work-duration'),
  shortBreakDuration: document.getElementById('short-break-duration'),
  longBreakDuration: document.getElementById('long-break-duration'),
  longBreakIntervalInput: document.getElementById('long-break-interval'),
  modeTabs: document.querySelectorAll('.mode-tab'),
  overlay: document.querySelector('.settings-overlay')
};

const modeConfig = {
  work: { label: 'FOCUS', accent: '#f97316', key: 'work' },
  shortBreak: { label: 'SHORT BREAK', accent: '#22d3ee', key: 'shortBreak' },
  longBreak: { label: 'LONG BREAK', accent: '#a78bfa', key: 'longBreak' }
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('pomodoroSettings'));
    if (saved) Object.assign(state.settings, saved);
  } catch { /* use defaults */ }

  const savedSessions = parseInt(localStorage.getItem('pomodoroSessions'), 10);
  if (!isNaN(savedSessions)) state.sessionsCompleted = savedSessions;
}

function saveSettings() {
  localStorage.setItem('pomodoroSettings', JSON.stringify(state.settings));
}

function saveSessions() {
  localStorage.setItem('pomodoroSessions', String(state.sessionsCompleted));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getDurationForMode(mode) {
  const map = {
    work: state.settings.work,
    shortBreak: state.settings.shortBreak,
    longBreak: state.settings.longBreak
  };
  return (map[mode] || 25) * 60;
}

function setAccentColor(color) {
  document.documentElement.style.setProperty('--accent-current', color);
}

function updateProgress() {
  const fraction = state.totalTime > 0 ? state.timeLeft / state.totalTime : 1;
  const offset = CIRCUMFERENCE * (1 - fraction);
  elements.progressCircle.style.strokeDasharray = CIRCUMFERENCE;
  elements.progressCircle.style.strokeDashoffset = offset;
}

function updateDisplay() {
  elements.timerText.textContent = formatTime(state.timeLeft);
  updateProgress();
}

function updateSessionDots() {
  const interval = state.settings.longBreakInterval;
  const currentInCycle = state.sessionsCompleted % interval;
  elements.sessionDots.innerHTML = '';
  for (let i = 0; i < interval; i++) {
    const dot = document.createElement('span');
    dot.className = 'session-dot' + (i < currentInCycle ? ' filled' : '');
    elements.sessionDots.appendChild(dot);
  }
  elements.sessionCount.textContent = state.sessionsCompleted;
}

function switchMode(mode, autoStart = false) {
  clearInterval(state.interval);
  state.mode = mode;
  state.running = false;
  state.paused = false;

  const config = modeConfig[mode];
  setAccentColor(config.accent);
  elements.timerLabel.textContent = config.label;

  state.totalTime = getDurationForMode(mode);
  state.timeLeft = state.totalTime;

  elements.modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  elements.startBtn.disabled = false;
  elements.pauseBtn.disabled = true;
  elements.timerDisplay.classList.remove('paused');
  elements.startBtn.textContent = 'Start';

  updateDisplay();

  if (autoStart) startTimer();
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);

    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1100, ctx.currentTime);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.6);
    }, 300);
  } catch { /* audio not supported */ }
}

function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '🍅' });
  }
}

function timerComplete() {
  clearInterval(state.interval);
  state.running = false;
  state.paused = false;

  playBeep();

  if (state.mode === 'work') {
    state.sessionsCompleted++;
    saveSessions();
    updateSessionDots();

    sendNotification('Work session complete!', 'Time for a break.');

    const needsLongBreak = state.sessionsCompleted % state.settings.longBreakInterval === 0;
    switchMode(needsLongBreak ? 'longBreak' : 'shortBreak');
  } else {
    sendNotification('Break is over!', 'Time to focus.');
    switchMode('work');
  }

  elements.startBtn.disabled = false;
  elements.pauseBtn.disabled = true;
  elements.startBtn.textContent = 'Start';
  elements.timerDisplay.classList.remove('paused');
}

function tick() {
  if (state.timeLeft <= 0) {
    timerComplete();
    return;
  }
  state.timeLeft--;
  updateDisplay();
}

function startTimer() {
  if (state.running) return;
  state.running = true;
  state.paused = false;

  elements.startBtn.disabled = true;
  elements.pauseBtn.disabled = false;
  elements.timerDisplay.classList.remove('paused');

  state.interval = setInterval(tick, 1000);
}

function pauseTimer() {
  if (!state.running) return;
  clearInterval(state.interval);
  state.running = false;
  state.paused = true;

  elements.startBtn.disabled = false;
  elements.startBtn.textContent = 'Resume';
  elements.pauseBtn.disabled = true;
  elements.timerDisplay.classList.add('paused');
}

function resetTimer() {
  clearInterval(state.interval);
  state.running = false;
  state.paused = false;

  state.totalTime = getDurationForMode(state.mode);
  state.timeLeft = state.totalTime;

  elements.startBtn.disabled = false;
  elements.startBtn.textContent = 'Start';
  elements.pauseBtn.disabled = true;
  elements.timerDisplay.classList.remove('paused');

  updateDisplay();
}

function openSettings() {
  elements.workDuration.value = state.settings.work;
  elements.shortBreakDuration.value = state.settings.shortBreak;
  elements.longBreakDuration.value = state.settings.longBreak;
  elements.longBreakIntervalInput.value = state.settings.longBreakInterval;
  elements.settingsPanel.classList.remove('hidden');
}

function closeSettings() {
  elements.settingsPanel.classList.add('hidden');
}

function applySettings() {
  state.settings.work = Math.max(1, Math.min(90, parseInt(elements.workDuration.value, 10) || 25));
  state.settings.shortBreak = Math.max(1, Math.min(30, parseInt(elements.shortBreakDuration.value, 10) || 5));
  state.settings.longBreak = Math.max(1, Math.min(60, parseInt(elements.longBreakDuration.value, 10) || 15));
  state.settings.longBreakInterval = Math.max(2, Math.min(10, parseInt(elements.longBreakIntervalInput.value, 10) || 4));

  saveSettings();
  closeSettings();
  switchMode(state.mode);
  updateSessionDots();
}

// Request notification permission on first interaction
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Event listeners
elements.startBtn.addEventListener('click', () => {
  requestNotificationPermission();
  startTimer();
});
elements.pauseBtn.addEventListener('click', pauseTimer);
elements.resetBtn.addEventListener('click', resetTimer);

elements.modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (state.running) {
      if (!confirm('Timer is running. Switch mode?')) return;
    }
    switchMode(tab.dataset.mode);
  });
});

elements.settingsToggle.addEventListener('click', openSettings);
elements.saveSettings.addEventListener('click', applySettings);
elements.cancelSettings.addEventListener('click', closeSettings);
elements.overlay.addEventListener('click', closeSettings);

// Init
loadSettings();
switchMode('work');
updateSessionDots();
