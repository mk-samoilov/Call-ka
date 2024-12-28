from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_socketio import SocketIO, emit

import os, sqlite3, hashlib, random

app = Flask(__name__)
app.secret_key = os.urandom(24)

socketio = SocketIO(app)

def get_db_connection():
    conn = sqlite3.connect("users.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, token TEXT)")
    conn.close()

init_db()

def generate_phone_number():
    return f"8{random.randint(9000000000, 9999999999)}"

def generate_token(_id, phone, name):
    token_string = f"{_id}{phone}{name}"
    return hashlib.sha256(token_string.encode()).hexdigest()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form["name"]

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("INSERT INTO users (name, phone) VALUES (?, ?)", (name, generate_phone_number()))
        user_id = cursor.lastrowid

        user = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        token = generate_token(user["id"], user["phone"], user["name"])

        cursor.execute("UPDATE users SET token = ? WHERE id = ?", (token, user_id))
        conn.commit()
        conn.close()

        flash(f"Registration successful! Your token is: {token}", "success")
        return redirect(url_for("login"))

    return render_template("register.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        token = request.form["token"]

        conn = get_db_connection()
        user = conn.execute("SELECT * FROM users WHERE token = ?", (token,)).fetchone()
        conn.close()

        if user:
            session["user_id"] = user["id"]
            session["user_phone_number"] = user["phone"]
            flash("Logged in successfully!", "success")
            return redirect(url_for("index"))
        else:
            flash("Invalid token. Please try again.", "error")

    return render_template("login.html")

@app.route("/logout")
def logout():
    session.pop("user_id", None)
    flash("Logged out successfully!", "success")
    return redirect(url_for("index"))

if __name__ == "__main__":
    socketio.run(
        app=app,
        host="0.0.0.0",
        port=80,
        debug=True,
        allow_unsafe_werkzeug=True
    )
