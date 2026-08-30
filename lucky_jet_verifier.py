import asyncio
import json
import hashlib
import hmac
import logging
import csv
import os
from datetime import datetime
from websockets import connect

logging.basicConfig(
    format="%(asctime)s %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("Verifier")
OUTPUT_FILE = "lucky_jet_verified.csv"

def sha256(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

def hmac_sha256(key, message):
    return hmac.new(
        key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def calculate_example_hash(server_seed, client_seed, nonce):
    message = f"{client_seed}:{nonce}"
    return hmac_sha256(server_seed, message)

def init_csv():
    if not os.path.exists(OUTPUT_FILE) or os.stat(OUTPUT_FILE).st_size == 0:
        with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                "Timestamp", "Event", "Server_Seed", "Client_Seed", 
                "Nonce", "Server_Seed_Hash", "Calculated_HMAC_Hash"
            ])
        logger.info(f"Created {OUTPUT_FILE} with headers.")

def log_verification_to_csv(event_type, server_seed, client_seed, nonce, server_hash, calc_hash):
    with open(OUTPUT_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        writer.writerow([
            timestamp, event_type, server_seed, client_seed, 
            nonce, server_hash, calc_hash
        ])

async def verify_live_data(uri):
    init_csv()
    logger.info(f"Connecting to {uri}...")
    try:
        async with connect(uri) as websocket:
            logger.info(f"Connected! Saving FULL verified output to {OUTPUT_FILE}")
            while True:
                try:
                    message = await websocket.recv()
                    for frame in message.split('\n'):
                        if not frame.strip():
                            continue
                        
                        try:
                            data = json.loads(frame)
                        except json.JSONDecodeError:
                            continue
                        
                        if not isinstance(data, dict):
                            continue
                        
                        # Check for pubData
                        pub_data = data.get('push', {}).get('pub', {}).get('data') or \
                                   data.get('pub', {}).get('data') or \
                                   data.get('result', {}).get('data')
                        
                        if isinstance(pub_data, dict):
                            event_type = pub_data.get('eventType') or pub_data.get('event_type') or pub_data.get('type')
                            
                            # Verification logic
                            server_seed = pub_data.get('server_seed') or pub_data.get('serverSeed')
                            client_seed = pub_data.get('client_seed') or pub_data.get('clientSeed')
                            nonce = pub_data.get('nonce')
                            
                            if server_seed:
                                nonce_str = str(nonce) if nonce is not None else "0"
                                client_seed_str = str(client_seed) if client_seed else ""
                                    
                                logger.info(f"[{event_type}] Received seeds! Performing verification.")
                                server_hash = sha256(server_seed)
                                calc_hash = calculate_example_hash(server_seed, client_seed_str, nonce_str)
                                
                                logger.info(f"  Server Hash: {server_hash}")
                                logger.info(f"  Calc Hash:   {calc_hash}")
                                
                                log_verification_to_csv("Verification", server_seed, client_seed_str, nonce_str, server_hash, calc_hash)
                                
                        # Also check connect payload for seeds
                        if data.get('connect') and isinstance(data['connect'], dict) and data['connect'].get('serverSeed'):
                            server_seed = data['connect'].get('serverSeed')
                            client_seed = data['connect'].get('clientSeed') or ""
                            nonce = data['connect'].get('nonce') or "0"
                            
                            event_type = "connect"
                            logger.info(f"[{event_type}] Received seeds! Performing verification.")
                            server_hash = sha256(server_seed)
                            calc_hash = calculate_example_hash(server_seed, str(client_seed), str(nonce))
                            
                            logger.info(f"  Server Hash: {server_hash}")
                            logger.info(f"  Calc Hash:   {calc_hash}")
                            
                            log_verification_to_csv("Verification", server_seed, str(client_seed), str(nonce), server_hash, calc_hash)
                            
                except Exception as e:
                    logger.error(f"Connection lost or error parsing message: {e}")
                    break
    except Exception as e:
        logger.error(f"Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_live_data("ws://localhost:8080"))
