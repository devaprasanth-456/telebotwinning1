import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import math
import os
import sys
import hashlib

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------
# 1. HELPER FUNCTIONS: HASH CALCULATIONS & CONVERSIONS
# ---------------------------------------------------------
def hash_to_multiplier(hash_hex):
    """
    Standard Provably Fair algorithm to convert a hex hash into a crash multiplier.
    """
    if pd.isna(hash_hex) or not isinstance(hash_hex, str):
        return 1.0

    h = hash_hex[:13]
    try:
        e = int(h, 16)
    except ValueError:
        return 1.0

    X = 4503599627370496 # 2^52
    if e % 33 == 0:
        return 1.00 
    
    multiplier = math.floor((100 * X - e) / (X - e)) / 100.0
    return max(1.0, multiplier)

def sha512_crash_point(server_hash, config_hash="f01049740de6678d"):
    """
    SHA-512 provably fair algorithm from predictor-fixed.js
    """
    if not server_hash or not isinstance(server_hash, str):
        return 1.00
    combined = (server_hash[:64] + config_hash).encode('utf-8')
    digest = hashlib.sha512(combined).hexdigest()
    result_decimal = int(digest[:8], 16)
    final_number = result_decimal % 10000
    multiplier = 1.0 + (final_number / 5000.3)
    return round(max(1.00, multiplier), 2)

# ---------------------------------------------------------
# 2. LOAD AND PREPARE THE DATA FROM LUCKY_JET_VERIFIED.CSV
# ---------------------------------------------------------
csv_file = "lucky_jet_verified.csv"

if not os.path.exists(csv_file):
    print(f"Error: {csv_file} not found in this directory.")
    sys.exit(1)

print(f"🚀 Loading verified dataset from {csv_file}...")
df = pd.read_csv(csv_file)

if len(df) < 10:
    print("Error: Not enough data in the CSV.")
    sys.exit(1)

# Convert HMAC Hashes into Multipliers
df['Multiplier'] = df['Calculated_HMAC_Hash'].apply(hash_to_multiplier)

# Target: 1 if >= 2.0x, else 0 (Under 2x)
df['Target_Above_2x'] = (df['Multiplier'] >= 2.0).astype(int)

# Multi-lag features
feature_cols = []
for i in range(1, 4):
    col_name = f'Prev_{i}_Multiplier'
    df[col_name] = df['Multiplier'].shift(i)
    feature_cols.append(col_name)

# Rolling mean feature
df['Rolling_3_Mean'] = df['Multiplier'].shift(1).rolling(3).mean()
feature_cols.append('Rolling_3_Mean')

df = df.dropna().copy()
print(f"✅ Total verified rounds used for training: {len(df)}")

X = df[feature_cols]
y = df['Target_Above_2x']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)

# ---------------------------------------------------------
# 3. TRAIN XGBOOST CLASSIFIER
# ---------------------------------------------------------
print("\n🧠 Training XGBoost Under/Over 2X AI Model...")
model = xgb.XGBClassifier(
    n_estimators=120,
    learning_rate=0.08,
    max_depth=3,
    eval_metric='logloss',
    random_state=42
)
model.fit(X_train, y_train)

# ---------------------------------------------------------
# 4. EVALUATION
# ---------------------------------------------------------
predictions = model.predict(X_test)
probs = model.predict_proba(X_test)[:, 1]
accuracy = accuracy_score(y_test, predictions)

print("==================================================")
print(f"🎯 MODEL ACCURACY: {accuracy * 100:.2f}%")
print("==================================================")
print(classification_report(y_test, predictions, target_names=['Under 2x (0)', 'Over 2x (1)'], zero_division=0))

# ---------------------------------------------------------
# 5. LIVE PREDICTION FUNCTION
# ---------------------------------------------------------
def predict_next(recent_multipliers):
    """
    Accepts a list of recent multipliers [prev1, prev2, prev3...]
    Returns: (is_over_2x, prob_over_2x, recommendation)
    """
    if len(recent_multipliers) < 3:
        recent_multipliers = (list(recent_multipliers) + [2.0, 1.5, 3.0])[:3]
    
    p1 = float(recent_multipliers[0])
    p2 = float(recent_multipliers[1])
    p3 = float(recent_multipliers[2])
    r_mean = (p1 + p2 + p3) / 3.0
    
    sample = pd.DataFrame([[p1, p2, p3, r_mean]], columns=feature_cols)
    prob_over = float(model.predict_proba(sample)[0][1])
    is_over = prob_over >= 0.50
    
    label = "OVER 2X" if is_over else "UNDER 2X"
    signal = "SIGNAL LOCKED (SAFE)" if is_over else "EXIT EARLY (< 2X)"
    
    return {
        "is_over_2x": is_over,
        "prob_over_2x": round(prob_over * 100, 1),
        "label": label,
        "signal": signal
    }

# Live CLI test
if __name__ == "__main__":
    test_rounds = [1.67, 1.21, 1.05]
    res = predict_next(test_rounds)
    print(f"\n🔮 Live Prediction for recent rounds {test_rounds}:")
    print(f"   ▶ Signal: {res['label']} ({res['prob_over_2x']}%)")
    print(f"   ▶ Recommendation: {res['signal']}\n")

