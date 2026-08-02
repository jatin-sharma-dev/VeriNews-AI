from flask import Flask, request, jsonify
from flask_cors import CORS
from app.predictor import predict_email

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "VeriMail AI backend is running"})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data or 'body' not in data:
        return jsonify({"error": "Request must include 'body' field"}), 400

    result = predict_email(
        subject=data.get('subject', ''),
        body=data['body'],
        sender=data.get('sender', '')
    )
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5001)