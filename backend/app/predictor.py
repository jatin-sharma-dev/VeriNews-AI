import joblib
import pandas as pd
import re
import os
from scipy.sparse import hstack, csr_matrix

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models_saved')

nn_model = joblib.load(os.path.join(MODEL_DIR, 'verimail_nn_model.pkl'))
tfidf = joblib.load(os.path.join(MODEL_DIR, 'tfidf_vectorizer.pkl'))
engineered_cols = joblib.load(os.path.join(MODEL_DIR, 'engineered_cols.pkl'))
artifact_terms = joblib.load(os.path.join(MODEL_DIR, 'artifact_terms.pkl'))

URGENCY_WORDS = [
    'urgent', 'immediately', 'act now', 'verify now', 'expire', 'expires',
    'expiring', 'suspend', 'suspended', 'action required', 'limited time',
    'deadline', 'final notice', 'warning', 'alert', 'restricted',
    'unauthorized', 'immediate action', 'respond immediately'
]
CREDENTIAL_BAIT_WORDS = [
    'password', 'ssn', 'social security', 'bank account', 'credit card',
    'click here', 'verify your account', 'confirm your identity',
    'update your information', 'login', 'log in', 'sign in',
    'account suspended', 'claim your', 'winner', 'prize', 'free gift',
    'wire transfer', 'billing', 'payment failed'
]
GENERIC_GREETINGS = [
    'dear customer', 'dear user', 'dear member', 'dear valued customer',
    'dear sir', 'dear madam', 'dear account holder', 'dear friend'
]
FREE_WEBMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'virgilio.it', 'live.com', 'mail.com', 'protonmail.com', 'gmx.com',
    'yandex.com', 'icloud.com'
]
SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.click', '.work', '.link']

WEIGHTS = {
    'urgency_score': 8, 'credential_bait_score': 12, 'caps_ratio_subject': 15,
    'exclamation_count': 3, 'url_count': 5, 'has_generic_greeting': 25,
    'is_free_webmail': 6, 'suspicious_tld': 10, 'word_count_short': 6,
}
MAX_RAW_SCORE = (
    WEIGHTS['urgency_score'] * 5 + WEIGHTS['credential_bait_score'] * 5 +
    WEIGHTS['caps_ratio_subject'] * 1 + WEIGHTS['exclamation_count'] * 5 +
    WEIGHTS['url_count'] * 1 + WEIGHTS['has_generic_greeting'] * 1 +
    WEIGHTS['is_free_webmail'] * 1 + WEIGHTS['suspicious_tld'] * 1 +
    WEIGHTS['word_count_short'] * 1
)


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'http\S+|www\.\S+', ' URLPLACEHOLDER ', text)
    text = re.sub(r'\S+@\S+', ' EMAILPLACEHOLDER ', text)
    text = re.sub(r'[^a-z\s]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def strip_artifacts(text):
    text = str(text)
    for term in artifact_terms:
        text = re.sub(r'\b' + re.escape(term) + r'\b', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def extract_sender_domain(sender):
    if not sender or sender == 'unknown':
        return 'unknown'
    match = re.search(r'@([\w\.-]+)', str(sender))
    return match.group(1).lower() if match else 'unknown'


def extract_features(subject, body, sender):
    subject = subject or ''
    body = body or ''
    sender_domain = extract_sender_domain(sender)
    full_text = (subject + ' ' + body).lower()

    urgency_score = sum(full_text.count(w) for w in URGENCY_WORDS)
    credential_bait_score = sum(full_text.count(w) for w in CREDENTIAL_BAIT_WORDS)
    caps_ratio_subject = (sum(1 for c in subject if c.isupper()) / len(subject)) if subject else 0.0
    exclamation_count = full_text.count('!')
    url_count = int(bool(re.search(r'http\S+|www\.\S+', body, re.IGNORECASE)))
    has_generic_greeting = int(any(g in full_text for g in GENERIC_GREETINGS))
    is_free_webmail = int(sender_domain in FREE_WEBMAIL_DOMAINS)
    suspicious_tld = int(sender_domain != 'unknown' and any(sender_domain.endswith(t) for t in SUSPICIOUS_TLDS))
    word_count_short = int(len(body.split()) < 150)

    return {
        'urgency_score': urgency_score,
        'credential_bait_score': credential_bait_score,
        'caps_ratio_subject': caps_ratio_subject,
        'exclamation_count': exclamation_count,
        'url_count': url_count,
        'has_generic_greeting': has_generic_greeting,
        'is_free_webmail': is_free_webmail,
        'suspicious_tld': suspicious_tld,
        'word_count_short': word_count_short,
        'sender_domain': sender_domain,
    }


def compute_rating_score(feats):
    raw = (
        min(feats['urgency_score'], 5) * WEIGHTS['urgency_score'] +
        min(feats['credential_bait_score'], 5) * WEIGHTS['credential_bait_score'] +
        feats['caps_ratio_subject'] * WEIGHTS['caps_ratio_subject'] +
        min(feats['exclamation_count'], 5) * WEIGHTS['exclamation_count'] +
        min(feats['url_count'], 1) * WEIGHTS['url_count'] +
        feats['has_generic_greeting'] * WEIGHTS['has_generic_greeting'] +
        feats['is_free_webmail'] * WEIGHTS['is_free_webmail'] +
        feats['suspicious_tld'] * WEIGHTS['suspicious_tld'] +
        feats['word_count_short'] * WEIGHTS['word_count_short']
    )
    return min(100, round((raw / MAX_RAW_SCORE) * 100, 1))


def get_flagged_reasons(feats):
    reasons = []
    if feats['urgency_score'] > 0:
        reasons.append(f"Urgency language detected ({feats['urgency_score']} instance(s))")
    if feats['credential_bait_score'] > 0:
        reasons.append(f"Credential/financial bait language detected ({feats['credential_bait_score']} instance(s))")
    if feats['caps_ratio_subject'] > 0.3:
        reasons.append("Excessive capitalization in subject line")
    if feats['exclamation_count'] >= 3:
        reasons.append(f"Excessive exclamation marks ({feats['exclamation_count']})")
    if feats['url_count'] > 0:
        reasons.append("Contains embedded URL(s)")
    if feats['has_generic_greeting'] == 1:
        reasons.append("Generic greeting (e.g. 'Dear Customer') instead of personalized name")
    if feats['is_free_webmail'] == 1:
        reasons.append(f"Sent from free webmail provider ({feats['sender_domain']})")
    if feats['suspicious_tld'] == 1:
        reasons.append(f"Sender domain uses a high-risk TLD ({feats['sender_domain']})")
    if feats['word_count_short'] == 1:
        reasons.append("Unusually short message body")
    return reasons


def predict_email(subject, body, sender):
    feats = extract_features(subject, body, sender)

    cleaned = clean_text(body)
    cleaned = strip_artifacts(cleaned)  # must match training-time cleaning exactly
    tfidf_vec = tfidf.transform([cleaned])

    eng_vec = csr_matrix([[feats[c] for c in engineered_cols]])
    X = hstack([tfidf_vec, eng_vec])

    prediction = int(nn_model.predict(X)[0])
    probability = float(nn_model.predict_proba(X)[0][1])  # probability of phishing

    return {
        'is_phishing': bool(prediction),
        'ml_confidence': round(probability * 100, 1),
        'rating_score': compute_rating_score(feats),
        'flagged_reasons': get_flagged_reasons(feats),
        'sender_domain': feats['sender_domain'],
    }