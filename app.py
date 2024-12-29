from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_socketio import SocketIO, emit, join_room, leave_room

import os
import sqlite3
import hashlib
import random
import logging

app = Flask(__name__)
app.secret_key = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*")

logging.basicConfig(level=logging.DEBUG)


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


@socketio.on("connect")
def handle_connect():
    if "user_id" in session:
        join_room(session["user_phone_number"])
        logging.info(f"User {session["user_phone_number"]} connected")


@socketio.on("disconnect")
def handle_disconnect():
    if "user_id" in session:
        leave_room(session["user_phone_number"])
        logging.info(f"User {session["user_phone_number"]} disconnected")


@socketio.on("start_call")
def handle_start_call(data):
    target_number = data["target"]
    caller_number = session["user_phone_number"]
    logging.info(f"Call started from {caller_number} to {target_number}")
    emit("incoming_call", {"from": caller_number}, room=target_number)


@socketio.on("accept_call")
def handle_accept_call(data):
    caller_number = data["from"]
    logging.info(f"Call accepted by {session["user_phone_number"]} from {caller_number}")
    emit("call_accepted", {"by": session["user_phone_number"]}, room=caller_number)


@socketio.on("decline_call")
def handle_decline_call(data):
    caller_number = data["from"]
    logging.info(f"Call declined by {session["user_phone_number"]} from {caller_number}")
    emit("call_declined", {"by": session["user_phone_number"]}, room=caller_number)


@socketio.on("end_call")
def handle_end_call(data):
    target_number = data["target"]
    logging.info(f"Call ended by {session["user_phone_number"]} to {target_number}")
    emit("call_ended", {"by": session["user_phone_number"]}, room=target_number)


@socketio.on("offer")
def handle_offer(data):
    target = data["target"]
    offer = data["offer"]
    caller = session["user_phone_number"]
    logging.info(f"Offer sent from {caller} to {target}")
    emit("offer", {"offer": offer, "caller": caller}, room=target)


@socketio.on("answer")
def handle_answer(data):
    target = data["target"]
    answer = data["answer"]
    logging.info(f"Answer sent from {session["user_phone_number"]} to {target}")
    emit("answer", {"answer": answer}, room=target)


@socketio.on("ice_candidate")
def handle_ice_candidate(data):
    target = data["target"]
    candidate = data["candidate"]
    logging.info(f"ICE candidate sent from {session["user_phone_number"]} to {target}")
    emit("ice_candidate", {"candidate": candidate}, room=target)


if __name__ == "__main__":
    socketio.run(
        app=app,
        host="0.0.0.0",
        port=443,
        debug=True,
        ssl_context="adhoc",
        allow_unsafe_werkzeug=True
    )
