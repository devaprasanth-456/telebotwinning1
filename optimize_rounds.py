import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import math
import os

def hash_to_multiplier(hash_hex):
    if pd.isna(hash_hex) or not isinstance(hash_hex, str):
        return 1.0
    h = hash_hex[:13]
    try:
        e = int(h, 16)
    except ValueError:
        return 1.0
    X = 4503599627370496 
    if e % 33 == 0:
        return 1.00 
    multiplier = math.floor((100 * X - e) / (X - e)) / 100.0
    return max(1.0, multiplier)

csv_file = "lucky_jet_verified.csv"
df_full = pd.read_csv(csv_file)
df_full['Multiplier'] = df_full['Calculated_HMAC_Hash'].apply(hash_to_multiplier)
df_full['Target_Above_2x'] = (df_full['Multiplier'] >= 2.0).astype(int)

best_accuracy = 0
best_rounds = 0

print("Testing different numbers of previous rounds to find the best accuracy...")

for rounds in range(1, 31):
    df = df_full.copy()
    feature_cols = []
    for i in range(1, rounds + 1):
        col_name = f'Prev_{i}_Multiplier'
        df[col_name] = df['Multiplier'].shift(i)
        feature_cols.append(col_name)
    
    df = df.dropna().copy()
    
    if len(df) < 100:
        break
        
    X = df[feature_cols]
    y = df['Target_Above_2x']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)
    
    model = xgb.XGBClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=3,
        eval_metric='logloss',
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    
    print(f"Rounds: {rounds:2d} | Accuracy: {accuracy * 100:.2f}%")
    
    if accuracy > best_accuracy:
        best_accuracy = accuracy
        best_rounds = rounds

print("========================================")
print(f"BEST ACCURACY: {best_accuracy * 100:.2f}% (using {best_rounds} previous rounds)")
print("========================================")
