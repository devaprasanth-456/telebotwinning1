import pandas as pd
import math
import os

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

def simulate_bot(csv_file="lucky_jet_verified.csv", starting_balance=100.0, base_bet=1.0, auto_cashout=1.50):
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found.")
        return

    print("Loading data for Betting Bot Simulation...\n")
    df = pd.read_csv(csv_file)
    df['Multiplier'] = df['Calculated_HMAC_Hash'].apply(hash_to_multiplier)
    
    # -------------------------------------------------------------
    # Strategy: Flat Betting vs Risk-Adjusted (Martingale)
    # -------------------------------------------------------------
    
    # Simulation 1: Flat Betting
    balance_flat = starting_balance
    
    # Simulation 2: Martingale (Double on loss, reset on win)
    balance_mart = starting_balance
    current_bet_mart = base_bet
    
    wins_flat, losses_flat = 0, 0
    wins_mart, losses_mart = 0, 0
    
    # Safety limit: Don't bet more than 20% of bankroll on Martingale
    max_bet = starting_balance * 0.20 
    
    for _, row in df.iterrows():
        crash = row['Multiplier']
        
        # --- FLAT BETTING LOGIC ---
        if balance_flat >= base_bet:
            balance_flat -= base_bet
            if crash >= auto_cashout:
                balance_flat += (base_bet * auto_cashout)
                wins_flat += 1
            else:
                losses_flat += 1
                
        # --- MARTINGALE LOGIC ---
        if balance_mart >= current_bet_mart:
            balance_mart -= current_bet_mart
            if crash >= auto_cashout:
                balance_mart += (current_bet_mart * auto_cashout)
                wins_mart += 1
                current_bet_mart = base_bet # Reset on win
            else:
                losses_mart += 1
                current_bet_mart *= 2.0 # Double on loss
                if current_bet_mart > max_bet:
                    current_bet_mart = base_bet # Cap to avoid total bankruptcy instantly
        else:
            # Bankrupt or can't afford current bet
            current_bet_mart = base_bet
            
    print("========================================")
    print(" [ALGORITHMIC BOT SIMULATION RESULTS] ")
    print("========================================")
    print(f"Auto-Cashout Strategy: {auto_cashout}x")
    print(f"Starting Bankroll: ${starting_balance:.2f} | Base Bet: ${base_bet:.2f}")
    print("----------------------------------------")
    print("1. FLAT BETTING (Consistent Risk)")
    print(f"Final Balance: ${balance_flat:.2f} (Profit: ${balance_flat - starting_balance:.2f})")
    print(f"Win Rate: {(wins_flat / (wins_flat + losses_flat)) * 100:.2f}% ({wins_flat} W / {losses_flat} L)")
    print("----------------------------------------")
    print("2. MARTINGALE CAPPED (High Risk)")
    print(f"Final Balance: ${balance_mart:.2f} (Profit: ${balance_mart - starting_balance:.2f})")
    print(f"Win Rate: {(wins_mart / (wins_mart + losses_mart)) * 100:.2f}% ({wins_mart} W / {losses_mart} L)")
    print("========================================")
    print("\nTakeaway: Even with advanced bet-sizing, a house edge exists.")
    print("The bot prevents emotional 'tilt' betting, but mathematical constraints remain.")

if __name__ == "__main__":
    simulate_bot()
