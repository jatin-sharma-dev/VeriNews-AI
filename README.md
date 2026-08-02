# 📰 VeriNews AI — Real-Time ML & NLP News Verification Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://verinews-ai-7mma.onrender.com/)

VeriNews AI is a production-ready, full-stack machine learning web application designed to evaluate news article credibility in real time. The platform analyzes natural language patterns, cross-references publisher domain reputations, extracts key topics, and dynamically generates queries for third-party fact-checking services.

🔗 **Live Demo:** [verinews-ai-7mma.onrender.com](https://verinews-ai-7mma.onrender.com/)

---

## Table of Contents

* [Executive Summary](#executive-summary)
* [Repository Structure](#repository-structure)
* [Model Evaluation & Performance](#model-evaluation--performance)
* [System Architecture](#system-architecture)
* [Feature Engineering & ML Pipeline](#feature-engineering--ml-pipeline)
* [Known Limitations & Edge Cases](#known-limitations--edge-cases)
* [API Specification & Payload Schema](#api-specification--payload-schema)
* [Local Development & Setup](#local-development--setup)
* [Deployment Strategy](#deployment-strategy)
* [Contributing & Contact](#contributing--contact)
* [License](#license)

---

## Executive Summary

Digital misinformation and clickbait headlines pose challenges to modern news consumption. VeriNews AI addresses these issues using a multi-stage evaluation engine built on machine learning and natural language processing:

* **Sublinear TF-IDF Extraction** — Converts raw news body text and headline structures into a 25,000-dimensional sparse feature matrix using unigrams and bigrams.
* **Max-Margin Classification** — Utilizes an optimized Linear Support Vector Classifier (Linear SVC) trained on a benchmark dataset of over 72,000 articles.
* **Source Reputation Parser** — Parses domain names using `tldextract` to cross-reference input URLs against verified newsrooms and flagged domain databases.
* **NLP Topic Extraction & Recommender** — Leverages `NLTK` and `TextBlob` to extract key noun phrases and construct automated verification links for Reuters, AP News, and FactCheck.org.
* **Micro-Backend Web Service** — Implemented with Flask, Gunicorn, and a responsive Tailwind CSS frontend utilizing asynchronous request rendering.

---

## Repository Structure

```text
VeriNews-AI/
├── app.py                 # Main Flask application & REST API endpoints
├── train.py               # End-to-end ML training & evaluation pipeline
├── build.sh                # Shell script for automated cloud deployment & NLTK setup
├── requirements.txt       # Production dependencies
├── README.md              # Project documentation
├── models/                # Trained model artifacts & vectorizers
│   ├── best_model.joblib          # Linear SVC model artifact
│   └── tfidf_vectorizer.joblib    # Fitted 25k-feature TF-IDF vectorizer
├── src/                   # Core application modules
│   ├── preprocessing.py       # Regex NLP text normalization pipeline
│   ├── insights_engine.py     # Explainability & natural language reasoning module
│   ├── source_verifier.py     # Domain parser & source reputation engine
│   └── recommender.py         # Topic extraction & fact-check query builder
├── templates/
│   └── index.html         # Application user interface markup
└── static/
    ├── css/style.css      # Custom interface styling
    └── js/app.js          # Asynchronous API handlers & dynamic DOM rendering
```

---

## Model Evaluation & Performance

The classification engine was trained and validated on a dataset containing **72,095 valid news samples**. An 80/20 train-test split using stratified sampling yielded a holdout test partition of **14,253 samples** (7,006 Real News / 7,247 Fake News).

**Dataset:** [Fake News Classification](https://www.kaggle.com/datasets/saurabhshahane/fake-news-classification) (Kaggle, via saurabhshahane)

### Primary Metrics (Champion Linear SVC Model)

| Metric | Score | Technical Context |
| --- | --- | --- |
| **Accuracy** | **97.28%** | Overall correct classification rate on test partition |
| **Precision** | **97.00%** | Minimizes legitimate articles incorrectly flagged as unverified |
| **Recall** | **97.68%** | Maximizes identification of unverified or clickbait text patterns |
| **F1-Score** | **97.34%** | Harmonic mean balancing precision and recall stability |
| **Test Partition** | **14,253** | Stratified holdout test set size |
| **Inference Latency** | **~22 ms** | Average runtime per text request payload on standard CPU |

### Benchmark Model Comparison

Seven distinct machine learning algorithms were benchmarked using identical preprocessing and cross-validation protocols:

| Model Paradigm | Algorithm Category | Test Accuracy | Status |
| --- | --- | --- | --- |
| **Linear SVC (Max Margin)** | Support Vector Machine | **97.28%** | Production Model |
| **Voting Ensemble (LR + SVC + PA)** | Hard Voting Ensemble | 97.23% | Benchmark Model |
| **Passive Aggressive Classifier** | Online Linear Model | 97.07% | Benchmark Model |
| **Logistic Regression** | Parametric Classifier | 96.98% | Benchmark Model |
| **Neural Network (MLP)** | Multi-Layer Perceptron | 96.81% | Benchmark Model |
| **Random Forest Classifier** | Tree Ensemble | 95.20% | Benchmark Model |
| **K-Nearest Neighbors (k=5)** | Non-Parametric | 88.93% | Baseline Model |

### Confusion Matrix Breakdown (Test Set)

* **True Negatives** (Legitimate news correctly identified): 6,787 articles
* **False Positives** (Legitimate news flagged as unverified): 219 articles
* **False Negatives** (Unverified news missed): 168 articles
* **True Positives** (Unverified news correctly identified): 7,079 articles

> **Optimization Context:** High recall (97.68%) ensures that misleading or sensationalized linguistic structures are caught effectively, minimizing undetected misinformation.

---

## System Architecture

```text
+-----------------------------------------------------------------------+
|                            USER INTERFACE                             |
|                 (HTML5 / Tailwind CSS / Vanilla JS)                   |
|                        Host: Render Web App                           |
+-----------------------------------------------------------------------+
                                   |
                            JSON POST /api/analyze
                                   |
                                   v
+-----------------------------------------------------------------------+
|                          FLASK REST BACKEND                           |
|                    Host: Render Web Service (Python)                  |
+-----------------------------------------------------------------------+
                                   |
        +--------------------------+--------------------------+
        |                                                     |
        v                                                     v
+-------------------------------+             +-------------------------------+
|     TEXT PREPROCESSING &      |             |   SOURCE REPUTATION ENGINE    |
|      TF-IDF VECTORIZER        |             |  - URL Domain Extraction      |
|  - Regex Cleaning & Lowering  |             |  - Cross-references Whitelist |
|  - Sublinear TF Scaling       |             |    & Blacklist Domains        |
+-------------------------------+             +-------------------------------+
        |                                                     |
        v                                                     |
+-------------------------------+                             |
|      LINEAR SVC CLASSIFIER    |                             |
|  - Predicts Truth Verdict     |                             |
|  - Probabilities & Confidence |                             |
+-------------------------------+                             |
        |                                                     |
        +--------------------------+--------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                    INSIGHTS & RECOMMENDER ENGINE                      |
|  - Generates Plain-English Explainability Insights                    |
|  - Uses NLTK / TextBlob for Noun Phrase & Topic Extraction            |
|  - Generates Verification Search Queries (Reuters, AP, FactCheck)     |
+-----------------------------------------------------------------------+
                                   |
                       Complete Verification JSON
                                   |
                                   v
+-----------------------------------------------------------------------+
|                           DYNAMIC FRONTEND                            |
|             Visual Score Gauge, Breakdown & Fact-Check Links          |
+-----------------------------------------------------------------------+
```

---

## Feature Engineering & ML Pipeline

The ingestion engine processes incoming text through a modular sequence:

1. **Text Normalization** (`src/preprocessing.py`)
   * Strips URLs, HTML markup, non-alphanumeric noise, and excessive whitespace.
   * Converts character casing to lowercase while preserving key structural boundaries.

2. **Sublinear TF-IDF Vectorization**
   * Captures word-level unigram and bigram token pairs (`ngram_range=(1,2)`).
   * Constrained to 25,000 primary features based on term frequency criteria (`max_features=25000`, `min_df=3`, `max_df=0.75`).
   * Applies sublinear scaling (`sublinear_tf=True`) to replace standard term frequency $tf$ with $1 + \log(tf)$, reducing the influence of repetitive phrases.

3. **Domain Verification** (`src/source_verifier.py`)
   * Extracts top-level domains using `tldextract`.
   * Evaluates target links against categorized lists of established news outlets and flagged domains.

4. **Topic Extraction & Fact-Check Generation** (`src/recommender.py`)
   * Uses `NLTK` tokenization and `TextBlob` noun-phrase chunking to isolate central topic terms.
   * Dynamically creates query URLs directed to external verification services (Reuters, Associated Press, FactCheck.org).

---

## Known Limitations & Edge Cases

When evaluating system performance, consider the following technical boundaries:

* **Language Support** — The feature vocabulary and training corpus are optimized strictly for English-language payloads.
* **Satire Identification** — High-quality satirical content (e.g., The Onion) uses similar linguistic structures to authentic journalism, presenting a challenge for standalone text classification.
* **Domain Coverage** — The domain lookup mechanism uses static evaluation lists. Unlisted or newly registered domains return an "Unverified / Unknown Source" classification.
* **Out-of-Vocabulary Terms** — Breaking news events containing novel proper nouns outside the 25,000 TF-IDF features rely on broader sentence construction and domain context.

---

## API Specification & Payload Schema

### `POST /api/analyze`

Processes a text passage or URL input and returns a structured credibility assessment.

#### Request Headers

```http
Content-Type: application/json
```

#### Request Body

```json
{
  "text": "BREAKING: Secret official document reveals shocking truth about upcoming global economic shutdown! Read before it gets deleted!",
  "url": "https://example-news-blog.com/article-123"
}
```

#### Response Body (200 OK)

```json
{
  "verdict": "Unreliable / Clickbait",
  "confidence_score": 96.85,
  "is_authentic": false,
  "domain_info": {
    "extracted_domain": "example-news-blog.com",
    "status": "Unverified / Unknown Source"
  },
  "insights": [
    "High usage of sensationalized emotional triggers detected.",
    "Linguistic patterns closely match unverified clickbait datasets."
  ],
  "recommended_fact_checks": [
    {
      "source": "Reuters",
      "url": "https://www.reuters.com/site-search/?query=global+economic+shutdown"
    },
    {
      "source": "FactCheck.org",
      "url": "https://www.factcheck.org/search/#gsc.q=global%20economic%20shutdown"
    }
  ]
}
```

---

## Local Development & Setup

### Prerequisites

* **Python Version:** Python 3.10+ (Tested on Python 3.11.x)
* **Git**

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/jatin-sharma-dev/VeriNews-AI.git
   cd VeriNews-AI
   ```

2. **Create a Virtual Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies & NLTK Resources**
   ```bash
   chmod +x build.sh
   ./build.sh
   ```

4. **Train Models (Optional)**
   ```bash
   python3 train.py
   ```

5. **Run the Application**
   ```bash
   python3 app.py
   ```

   The development server will run at `http://127.0.0.1:5001`

---

## Deployment Strategy

### Production Hosting

The system is deployed using a WSGI web service setup:

* **Web Service:** Deployed on [Render](https://render.com/) using `gunicorn app:app`.
* **Build Command:** Runs `./build.sh` to install dependencies from `requirements.txt` and download required NLTK datasets (`punkt`, `stopwords`, `punkt_tab`).
* **Continuous Deployment:** Configured via GitHub webhooks on push events to the `main` branch.

### Environment Variables

| Variable | Default Value | Purpose |
| --- | --- | --- |
| `FLASK_ENV` | `production` | Controls Flask execution mode (development or production) |
| `PORT` | `5001` | Server port binding |
| `SECRET_KEY` | *(set in environment)* | Flask session security key |

---

## Contributing & Contact

Pull requests and issues are welcome. Feel free to submit feedback or open a discussion thread.

* **Author:** Jatin Sharma
* **GitHub:** [@jatin-sharma-dev](https://github.com/jatin-sharma-dev)

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
