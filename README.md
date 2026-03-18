# progress_tracker
Progress Tracker – A simple and intuitive tool to monitor, visualize, and manage your personal or team progress over time. Track tasks, set milestones, and see your growth at a glance. Perfect for productivity enthusiasts, students, and professionals aiming to stay organized and motivated.
# ⚡ ProgressOS — Personal Progress Tracker

A full-stack progress tracking web app built with **Python (Flask)** featuring beautiful analytics, YouTube resource management, live weather, and smart time-based greetings.

![Python](https://img.shields.io/badge/Python-3.9%2B-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?style=for-the-badge&logo=flask)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow?style=for-the-badge&logo=javascript)
![Chart.js](https://img.shields.io/badge/Chart.js-4.4-pink?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **Multi-Target Tracking** | Create unlimited targets with goals (hours), deadlines, and categories |
| 📊 **Progress Analytics** | Beautiful line + bar charts showing cumulative progress vs. goal |
| ⏱️ **Session Logging** | Log hours + notes per session, view full history per target |
| 📚 **Resource/Link Gateway** | Save YouTube videos & links — auto-fetches thumbnails & titles |
| ▶️ **YouTube Integration** | Resume exactly where you left off via direct redirect |
| 🌤️ **Live Weather** | Real-time weather for your city (no API key needed!) |
| 👋 **Smart Greetings** | Personalized time-aware salutations (Morning / Afternoon / Evening / Night) |
| 💾 **Data Persistence** | All progress saved locally as JSON — export anytime |
| 📱 **Responsive Design** | Works perfectly on desktop and mobile |
| 🌙 **Dark Theme** | Sleek dark UI with purple accent palette |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9 or higher
- pip

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/progress-tracker.git
cd progress-tracker

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the app
python app.py
```

Open your browser at **http://localhost:5000** 🎉

---

## 📁 Project Structure

```
progress-tracker/
├── app.py                  # Flask backend — all API routes
├── requirements.txt        # Python dependencies
├── data/
│   └── user_data.json      # Auto-created; stores all your data
├── templates/
│   ├── index.html          # Main dashboard
│   └── setup.html          # First-time setup page
└── static/
    ├── css/
    │   └── style.css       # Full responsive stylesheet
    └── js/
        └── app.js          # Frontend logic (vanilla JS)
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/setup` | Save user name & city |
| GET | `/api/dashboard` | Greeting, weather, stats, targets |
| GET/POST | `/api/targets` | List / Create targets |
| PUT | `/api/targets/<id>` | Update a target |
| DELETE | `/api/targets/<id>` | Delete a target |
| POST | `/api/targets/<id>/log` | Log a session |
| GET/POST | `/api/resources` | List / Add resources |
| POST | `/api/resources/<id>/access` | Mark resource as accessed |
| DELETE | `/api/resources/<id>` | Remove a resource |
| GET | `/api/chart/<id>` | Get chart data for a target |
| GET | `/api/export` | Export all data as JSON |
| POST | `/api/import` | Import data JSON |

---

## 🛠️ Tech Stack

**Backend**
- Python 3.9+
- Flask 3.0
- flask-cors
- Open-Meteo API (weather — no key needed)
- YouTube oEmbed (video titles — no key needed)

**Frontend**
- Vanilla JavaScript (ES6)
- Chart.js 4.4
- Google Fonts (Syne + DM Sans)
- Pure CSS animations

---

## 📱 Mobile Support

The app is fully responsive and works on:
- ✅ Desktop browsers
- ✅ Tablets
- ✅ Mobile phones (hamburger nav, touch-friendly cards)

---

## 💡 Usage Tips

1. **Add a Target** → Set a title, category (e.g. DSA, Web Dev), total goal hours, and deadline
2. **Log Sessions** → Click ⏱️ on any target after studying/working
3. **Save Resources** → Paste a YouTube URL → it auto-fetches the title & thumbnail
4. **Resume Learning** → Click **Watch** on any saved video to jump right back
5. **Analytics** → Go to Analytics → select a target → see your progress graph
6. **Export** → Use the Export button in the sidebar to back up your data as JSON

---

## 🖼️ Screenshots

> Add screenshots here after running the app!

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

Made by Yash Joglekar

