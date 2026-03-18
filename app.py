Flask backend — all API routes, weather, YouTube parsing
"""
Progress Tracker - Main Flask Application
A full-stack progress tracking app with YouTube link management,
weather integration, and beautiful analytics.
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime, date
import requests
from urllib.parse import urlparse, parse_qs
import re

app = Flask(__name__)
CORS(app)

DATA_FILE = "data/user_data.json"
os.makedirs("data", exist_ok=True)


# ─────────────────────────────────────────────
#  Data Helpers
# ─────────────────────────────────────────────

def load_data():
    if not os.path.exists(DATA_FILE):
        return {
            "user": {"name": "", "location": "", "setup_done": False},
            "targets": [],
            "resources": [],
            "sessions": []
        }
    with open(DATA_FILE, "r") as f:
        return json.load(f)


def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ─────────────────────────────────────────────
#  YouTube Utilities
# ─────────────────────────────────────────────

def extract_youtube_id(url):
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:youtu\.be\/)([0-9A-Za-z_-]{11})',
        r'(?:embed\/)([0-9A-Za-z_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_youtube_thumbnail(video_id):
    return f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"


def get_youtube_title(video_id):
    """Try to get YouTube video title via oEmbed (no API key needed)."""
    try:
        resp = requests.get(
            f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json",
            timeout=5
        )
        if resp.status_code == 200:
            return resp.json().get("title", "YouTube Video")
    except Exception:
        pass
    return "YouTube Video"


# ─────────────────────────────────────────────
#  Weather
# ─────────────────────────────────────────────

def get_weather(city="Mumbai"):
    """Fetch weather using Open-Meteo (free, no API key)."""
    try:
        # Geocode
        geo = requests.get(
            f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json",
            timeout=5
        ).json()
        if not geo.get("results"):
            return {"temp": "--", "description": "Weather unavailable", "icon": "🌤️"}
        
        r = geo["results"][0]
        lat, lon = r["latitude"], r["longitude"]

        weather = requests.get(
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,weathercode,windspeed_10m&timezone=auto",
            timeout=5
        ).json()

        temp = weather["current"]["temperature_2m"]
        code = weather["current"]["weathercode"]

        code_map = {
            0: ("Clear sky", "☀️"), 1: ("Mainly clear", "🌤️"), 2: ("Partly cloudy", "⛅"),
            3: ("Overcast", "☁️"), 45: ("Foggy", "🌫️"), 48: ("Icy fog", "🌫️"),
            51: ("Light drizzle", "🌦️"), 53: ("Drizzle", "🌦️"), 55: ("Heavy drizzle", "🌧️"),
            61: ("Light rain", "🌧️"), 63: ("Rain", "🌧️"), 65: ("Heavy rain", "🌧️"),
            71: ("Light snow", "❄️"), 73: ("Snow", "❄️"), 75: ("Heavy snow", "❄️"),
            80: ("Light showers", "🌦️"), 81: ("Showers", "🌦️"), 82: ("Heavy showers", "⛈️"),
            95: ("Thunderstorm", "⛈️"), 99: ("Thunderstorm with hail", "⛈️")
        }
        desc, icon = code_map.get(code, ("Unknown", "🌡️"))
        return {"temp": f"{temp:.0f}°C", "description": desc, "icon": icon}
    except Exception:
        return {"temp": "--", "description": "Weather unavailable", "icon": "🌤️"}


def get_greeting(name):
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return f"Good Morning, {name}! ☀️"
    elif 12 <= hour < 17:
        return f"Good Afternoon, {name}! 🌤️"
    elif 17 <= hour < 21:
        return f"Good Evening, {name}! 🌆"
    else:
        return f"Good Night, {name}! 🌙"


# ─────────────────────────────────────────────
#  Routes
# ─────────────────────────────────────────────

@app.route("/")
def index():
    data = load_data()
    if not data["user"].get("setup_done"):
        return redirect(url_for("setup"))
    return render_template("index.html")


@app.route("/setup")
def setup():
    return render_template("setup.html")


# ─── API ──────────────────────────────────────

@app.route("/api/setup", methods=["POST"])
def api_setup():
    body = request.json
    data = load_data()
    data["user"] = {
        "name": body.get("name", "User"),
        "location": body.get("location", "Mumbai"),
        "setup_done": True,
        "created_at": str(datetime.now())
    }
    save_data(data)
    return jsonify({"success": True})


@app.route("/api/dashboard")
def api_dashboard():
    data = load_data()
    user = data["user"]
    city = user.get("location", "Mumbai")

    weather = get_weather(city)
    greeting = get_greeting(user.get("name", "User"))

    # Compute stats per target
    targets = data.get("targets", [])
    for t in targets:
        logs = t.get("logs", [])
        t["log_count"] = len(logs)
        t["total_hours"] = sum(l.get("hours", 0) for l in logs)
        t["percent"] = min(100, round((t["total_hours"] / max(t.get("goal_hours", 1), 1)) * 100))

    total_hours = sum(t.get("total_hours", 0) for t in targets)
    active_targets = sum(1 for t in targets if t.get("status") != "completed")

    return jsonify({
        "greeting": greeting,
        "weather": weather,
        "user": user,
        "targets": targets,
        "resources": data.get("resources", []),
        "stats": {
            "total_targets": len(targets),
            "active_targets": active_targets,
            "total_hours": round(total_hours, 1),
            "total_resources": len(data.get("resources", []))
        }
    })


@app.route("/api/targets", methods=["GET"])
def get_targets():
    data = load_data()
    return jsonify(data.get("targets", []))


@app.route("/api/targets", methods=["POST"])
def add_target():
    body = request.json
    data = load_data()
    target = {
        "id": str(uuid.uuid4()),
        "title": body.get("title", "New Target"),
        "description": body.get("description", ""),
        "category": body.get("category", "General"),
        "goal_hours": float(body.get("goal_hours", 10)),
        "deadline": body.get("deadline", ""),
        "status": "active",
        "created_at": str(date.today()),
        "logs": []
    }
    data["targets"].append(target)
    save_data(data)
    return jsonify(target)


@app.route("/api/targets/<target_id>", methods=["PUT"])
def update_target(target_id):
    body = request.json
    data = load_data()
    for t in data["targets"]:
        if t["id"] == target_id:
            t.update({k: v for k, v in body.items() if k not in ["id", "logs", "created_at"]})
            break
    save_data(data)
    return jsonify({"success": True})


@app.route("/api/targets/<target_id>", methods=["DELETE"])
def delete_target(target_id):
    data = load_data()
    data["targets"] = [t for t in data["targets"] if t["id"] != target_id]
    save_data(data)
    return jsonify({"success": True})


@app.route("/api/targets/<target_id>/log", methods=["POST"])
def log_progress(target_id):
    body = request.json
    data = load_data()
    for t in data["targets"]:
        if t["id"] == target_id:
            log = {
                "id": str(uuid.uuid4()),
                "date": str(date.today()),
                "hours": float(body.get("hours", 0)),
                "note": body.get("note", ""),
                "timestamp": str(datetime.now())
            }
            t.setdefault("logs", []).append(log)

            total = sum(l["hours"] for l in t["logs"])
            if total >= t.get("goal_hours", 9999):
                t["status"] = "completed"
            break
    save_data(data)
    return jsonify({"success": True})


@app.route("/api/resources", methods=["GET"])
def get_resources():
    data = load_data()
    return jsonify(data.get("resources", []))


@app.route("/api/resources", methods=["POST"])
def add_resource():
    body = request.json
    data = load_data()
    url = body.get("url", "")
    resource = {
        "id": str(uuid.uuid4()),
        "url": url,
        "title": body.get("title", "Resource"),
        "target_id": body.get("target_id", ""),
        "type": "youtube" if "youtube" in url or "youtu.be" in url else "link",
        "thumbnail": "",
        "added_at": str(date.today()),
        "last_accessed": ""
    }

    # Handle YouTube
    vid_id = extract_youtube_id(url)
    if vid_id:
        resource["youtube_id"] = vid_id
        resource["thumbnail"] = get_youtube_thumbnail(vid_id)
        if not body.get("title"):
            resource["title"] = get_youtube_title(vid_id)
        resource["type"] = "youtube"

    data["resources"].append(resource)
    save_data(data)
    return jsonify(resource)


@app.route("/api/resources/<resource_id>/access", methods=["POST"])
def access_resource(resource_id):
    data = load_data()
    for r in data["resources"]:
        if r["id"] == resource_id:
            r["last_accessed"] = str(datetime.now())
            break
    save_data(data)
    return jsonify({"success": True})


@app.route("/api/resources/<resource_id>", methods=["DELETE"])
def delete_resource(resource_id):
    data = load_data()
    data["resources"] = [r for r in data["resources"] if r["id"] != resource_id]
    save_data(data)
    return jsonify({"success": True})


@app.route("/api/chart/<target_id>")
def chart_data(target_id):
    data = load_data()
    target = next((t for t in data["targets"] if t["id"] == target_id), None)
    if not target:
        return jsonify({"error": "Not found"}), 404

    logs = target.get("logs", [])
    # Group by date
    daily = {}
    for l in logs:
        d = l["date"]
        daily[d] = daily.get(d, 0) + l["hours"]

    sorted_days = sorted(daily.items())
    # Cumulative
    cumulative = []
    running = 0
    for d, h in sorted_days:
        running += h
        cumulative.append({"date": d, "hours": round(h, 2), "cumulative": round(running, 2)})

    return jsonify({
        "target": target["title"],
        "goal_hours": target["goal_hours"],
        "data": cumulative
    })


@app.route("/api/export")
def export_data():
    data = load_data()
    return jsonify(data)


@app.route("/api/import", methods=["POST"])
def import_data():
    body = request.json
    save_data(body)
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
