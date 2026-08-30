import pandas as pd
import numpy as np
import os
import math

# Helper to convert hash to multiplier
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

def run_dashboard(csv_file="lucky_jet_verified.csv"):
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found.")
        return

    print("Loading data for Statistical Auditing...\n")
    df = pd.read_csv(csv_file)
    df['Multiplier'] = df['Calculated_HMAC_Hash'].apply(hash_to_multiplier)
    
    total_rounds = len(df)
    crashes_1_00 = len(df[df['Multiplier'] == 1.00])
    
    # 1. House Edge Analysis
    expected_1_00_rate = 1 / 33  # roughly 3.03%
    actual_1_00_rate = crashes_1_00 / total_rounds
    
    print("========================================")
    print(" [STATISTICAL ANALYSIS DASHBOARD] ")
    print("========================================")
    print(f"Total Rounds Tracked: {total_rounds}")
    print(f"Total Instant Crashes (1.00x): {crashes_1_00}")
    print(f"Actual 1.00x Rate: {actual_1_00_rate * 100:.2f}%")
    print(f"Expected 1.00x Rate: {expected_1_00_rate * 100:.2f}%")
    
    # Alert mechanism
    if actual_1_00_rate > (expected_1_00_rate * 1.2): # 20% higher than expected
        print("\n[ALERT] House edge is significantly higher than mathematically expected!")
        print("    The casino may be tweaking the RNG algorithm. Stop playing.")
    elif actual_1_00_rate < (expected_1_00_rate * 0.8):
        print("\n[NOTICE] House edge is lower than expected. (Running lucky)")
    else:
        print("\n[VERIFIED] The game is operating within mathematically fair cryptographic limits.")
        
    # 2. Probability Distribution
    print("\n--- Crash Distribution ---")
    thresholds = [1.5, 2.0, 5.0, 10.0]
    for t in thresholds:
        count_above = len(df[df['Multiplier'] >= t])
        actual_rate = count_above / total_rounds
        expected_rate = 1 / t * (32/33) # Rough theoretical expectation
        print(f"Rounds >= {t}x: {actual_rate * 100:.2f}% (Expected: ~{expected_rate * 100:.2f}%)")

if __name__ == "__main__":
    run_dashboard()
