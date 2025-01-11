# Call-ka Phone

Call-ka Phone is a web-based phone application that allows users to make voice calls using WebRTC technology. This project is built with Flask, SQLite, and Socket.IO for real-time audio communication.

## Technologies Used:

- Backend: Flask, SQLite, Socket.IO
- Frontend: HTML, CSS, JavaScript
- WebRTC for peer-to-peer communication

## Setup and Installation for local machine:

1. Clone the repository:
   ```
   git clone https://github.com/mk-samoilov/Call-ka.git
   cd Call-ka
   ```

2. Install the required dependencies:
   ```
   pip3 install -r requirements.txt
   ```

3. Run the application:
   ```
   python3 app.py
   ```

4. Access the application in your web browser at `https://localhost:443`

## File Structure:

- `app.py`: Main Flask application
- `templates/`: HTML templates
- `static/`: Static assets (CSS, JavaScript)
- `users.db`: SQLite database for user management

### License:
This project is open source and available under the MIT License.