"""
SMT Agency - ML Sales Prediction Service
Linear Regression for next month sales prediction.
"""
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
CORS(app)

def prepare_features(months_sequence):
    """Convert month labels (e.g. '2024-01') to numeric features for training."""
    X = np.array([[i] for i in range(len(months_sequence))])
    return X

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        body = request.get_json() or {}
        data = body.get('data', [])
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        if len(data) < 2:
            return jsonify({'prediction': 0, 'message': 'Need at least 2 data points'})

        months = [d.get('month', '') for d in data]
        quantities = [float(d.get('quantity', 0)) for d in data]
        X = prepare_features(months)
        y = np.array(quantities).reshape(-1, 1)

        model = LinearRegression()
        model.fit(X, y)
        next_idx = len(months)
        next_pred = model.predict([[next_idx]])[0][0]
        next_pred = max(0, round(float(next_pred), 2))

        return jsonify({
            'prediction': next_pred,
            'message': 'Next month sales prediction (Linear Regression)',
            'coefficient': float(model.coef_[0][0]) if hasattr(model.coef_[0], '__len__') else float(model.coef_[0]),
            'intercept': float(model.intercept_[0]) if hasattr(model.intercept_, '__len__') else float(model.intercept_),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _predict_series(data):
    """Run linear regression on [(month, quantity), ...] and return next month prediction."""
    if not data or len(data) < 2:
        return 0.0
    months = [d.get('month', '') for d in data]
    quantities = [float(d.get('quantity', 0)) for d in data]
    X = np.array([[i] for i in range(len(months))])
    y = np.array(quantities).reshape(-1, 1)
    model = LinearRegression()
    model.fit(X, y)
    next_idx = len(months)
    next_pred = model.predict([[next_idx]])[0][0]
    return max(0.0, round(float(next_pred), 2))

@app.route('/predict-full', methods=['POST'])
def predict_full():
    """Predict overall and per-product next month quantity (Linear Regression)."""
    try:
        body = request.get_json() or {}
        overall_data = body.get('overall', body.get('data', []))
        products_data = body.get('products', [])
        result = {'prediction': 0, 'productPredictions': []}

        # First, predict overall and derive a growth factor from last month.
        overall_growth = 1.0
        if overall_data and len(overall_data) >= 2:
            overall_pred = _predict_series(overall_data)
            result['prediction'] = overall_pred
            last_overall_qty = float(overall_data[-1].get('quantity', 0) or 0)
            if last_overall_qty > 0:
                raw_growth = overall_pred / last_overall_qty
                # Clamp growth to avoid extreme jumps when data is noisy
                overall_growth = max(0.7, min(1.3, raw_growth))
        for p in products_data:
            name = p.get('productName', p.get('name', 'Unknown'))
            data_list = p.get('data', [])
            pred = 0.0
            if data_list and len(data_list) >= 2:
                # Enough history for per-product regression
                pred = _predict_series(data_list)
            elif data_list and len(data_list) == 1:
                # Only one month of history: use overall ML growth factor on last quantity
                last_qty = float(data_list[0].get('quantity', 0) or 0)
                pred_raw = last_qty * overall_growth
                pred = max(0.0, round(float(pred_raw), 2))
            result['productPredictions'].append({'productName': name, 'prediction': pred})
        result['message'] = 'Next month sales prediction (Linear Regression)'
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/train', methods=['POST'])
def train():
    """Optional: train and return model stats."""
    return predict()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
