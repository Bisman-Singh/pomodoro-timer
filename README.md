# Pomodoro Timer

A beautiful Pomodoro timer with circular progress animation, built with pure HTML, CSS, and JavaScript.

## Features

- **Circular SVG progress ring** with smooth stroke animation
- **Three modes:** Work (25 min), Short Break (5 min), Long Break (15 min)
- **Start, Pause, Resume, Reset** controls
- **Session counter** tracking completed pomodoros with visual dots
- **Auto-advance** — automatically suggests break/work after each session
- **Browser notifications** when a timer completes (Notification API)
- **Audio beep** on completion using AudioContext (no external files)
- **Customizable durations** via settings modal
- **Settings persisted** to localStorage
- **Dark theme** with warm accent colors per mode
- **Responsive** design

## Usage

Open `index.html` in any modern browser. Click "Start" to begin a work session. The timer will notify you when it's time for a break.

## Tech Stack

- HTML5
- CSS3 (custom properties, SVG animation)
- Vanilla JavaScript (AudioContext, Notification API, localStorage)
