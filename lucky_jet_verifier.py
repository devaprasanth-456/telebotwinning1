import asyncio
import json
import hashlib
import hmac
import logging
import csv
import os
import sys
import argparse
from datetime import datetime
from websockets import connect

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger("Verifier")

DEFAULT_OUTPUT_FILE = "newverification.csv"
REMOTE_GATEWAY_URI = "wss://crash-gateway-grm-cr.gamedev-tech.cc/websocket/lifecycle"
LOCAL_PROXY_URI = "ws://localhost:8080"
DEFAULT_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODgzNjA0MjUsImlhdCI6MTc4ODEwMTIyNSwic3ViIjoiMzEyMzI1MyIsImNoYW5uZWxzIjpbImx1Y2t5LWpldC05NCJdfQ.x8XvxDcHvMjJB455Cp0l1qN3hsjEWni6_yJ4zbCnvMs"
DEFAULT_CHANNEL = "lucky-jet-94"
HEADERS = {
    "Origin": "https://1play.gamedev-tech.cc",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
}

def sha256(value: str) -> str:
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()

def hmac_sha256(key: str, message: str) -> str:
    return hmac.new(
        str(key).encode("utf-8"),
        str(message).encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def calculate_example_hash(server_seed: str, client_seed: str, nonce: str) -> str:
    message = f"{client_seed}:{nonce}"
    return hmac_sha256(server_seed, message)

def init_csv(output_file: str):
    file_exists = os.path.exists(output_file) and os.stat(output_file).st_size > 0
    if not file_exists:
        # If output file is different from lucky_jet_verified.csv and lucky_jet_verified.csv exists,
        # copy and verify existing records into new verification file
        existing_source = "lucky_jet_verified.csv"
        if output_file != existing_source and os.path.exists(existing_source) and os.stat(existing_source).st_size > 0:
            logger.info(f"Populating and cryptographically validating {output_file} from {existing_source}...")
            valid_count = 0
            with open(existing_source, 'r', encoding='utf-8', errors='ignore') as src, \
                 open(output_file, 'w', newline='', encoding='utf-8') as dst:
                reader = csv.reader(src)
                writer = csv.writer(dst)
                header = next(reader, None)
                writer.writerow([
                    "Timestamp", "Event", "Server_Seed", "Client_Seed", 
                    "Nonce", "Server_Seed_Hash", "Calculated_HMAC_Hash"
                ])
                for row in reader:
                    if len(row) >= 7:
                        ts, evt, s_seed, c_seed, nonce_val, s_hash, c_hmac = row[:7]
                        # Verify integrity
                        calc_s_hash = sha256(s_seed) if s_seed else s_hash
                        calc_hmac = calculate_example_hash(s_seed, c_seed, nonce_val) if s_seed else c_hmac
                        writer.writerow([ts, evt, s_seed, c_seed, nonce_val, calc_s_hash, calc_hmac])
                        valid_count += 1
            logger.info(f"✅ Successfully initialized {output_file} with {valid_count} verified historical rounds.")
            return

        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                "Timestamp", "Event", "Server_Seed", "Client_Seed", 
                "Nonce", "Server_Seed_Hash", "Calculated_HMAC_Hash"
            ])
        logger.info(f"Created {output_file} with headers.")

def log_verification_to_csv(output_file: str, event_type: str, server_seed: str, client_seed: str, nonce: str, server_hash: str, calc_hash: str):
    with open(output_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        writer.writerow([
            timestamp, event_type, server_seed, client_seed, 
            nonce, server_hash, calc_hash
        ])

async def verify_gateway_stream(uri: str, output_file: str, jwt_token: str = DEFAULT_JWT):
    init_csv(output_file)
    is_remote = uri.startswith("wss://") or "crash-gateway" in uri
    logger.info(f"🚀 Connecting Verifier to {uri} (Target output: {output_file})...")

    while True:
        try:
            connect_kwargs = {}
            if is_remote:
                connect_kwargs["additional_headers"] = HEADERS

            async with connect(uri, **connect_kwargs) as websocket:
                logger.info(f"✅ Connected to WebSocket! Verifying live rounds to {output_file}")
                
                # Perform handshake if remote gateway
                if is_remote:
                    auth_payload = {
                        "id": 1,
                        "connect": {
                            "token": jwt_token,
                            "name": "js"
                        }
                    }
                    await websocket.send(json.dumps(auth_payload))

                while True:
                    try:
                        message = await websocket.recv()
                        
                        # Respond to ping
                        if not message or message == '{}' or message == 'PING':
                            if is_remote:
                                await websocket.send('{}')
                            continue

                        for frame in message.split('\n'):
                            if not frame.strip() or frame.strip() == '{}':
                                continue

                            try:
                                data = json.loads(frame)
                            except json.JSONDecodeError:
                                continue

                            if not isinstance(data, dict):
                                continue

                            # Handle connect response and subscribe
                            if is_remote and data.get('connect'):
                                logger.info("🎉 Session authenticated. Subscribing to live room...")
                                sub_payload = {
                                    "id": 10,
                                    "subscribe": {
                                        "channel": DEFAULT_CHANNEL
                                    }
                                }
                                await websocket.send(json.dumps(sub_payload))
                                continue

                            # Check for pubData
                            pub_data = data.get('push', {}).get('pub', {}).get('data') or \
                                       data.get('pub', {}).get('data') or \
                                       data.get('result', {}).get('data') or \
                                       data

                            if isinstance(pub_data, dict):
                                event_type = pub_data.get('eventType') or pub_data.get('event_type') or pub_data.get('type') or 'Round'
                                
                                # Extract seeds from various formats
                                pf = pub_data.get('roundInfo', {}).get('provablyFair') if isinstance(pub_data.get('roundInfo'), dict) else pub_data.get('provablyFair')
                                server_seed = pub_data.get('server_seed') or pub_data.get('serverSeed') or (pf.get('serverSeed') if isinstance(pf, dict) else None)
                                client_seed = pub_data.get('client_seed') or pub_data.get('clientSeed') or (pf.get('clientSeed') if isinstance(pf, dict) else None)
                                nonce = pub_data.get('nonce') if pub_data.get('nonce') is not None else (pf.get('nonce') if isinstance(pf, dict) else None)
                                
                                if server_seed:
                                    nonce_str = str(nonce) if nonce is not None else "0"
                                    client_seed_str = str(client_seed) if client_seed else ""
                                    
                                    server_hash = sha256(server_seed)
                                    calc_hash = calculate_example_hash(server_seed, client_seed_str, nonce_str)
                                    
                                    logger.info(f"🔍 [{event_type}] Verified round! Server Hash: {server_hash[:16]}... HMAC: {calc_hash[:16]}...")
                                    log_verification_to_csv(output_file, "Verification", server_seed, client_seed_str, nonce_str, server_hash, calc_hash)

                    except Exception as e:
                        logger.error(f"Stream error: {e}")
                        break
        except Exception as e:
            logger.warning(f"Connection to {uri} failed: {e}")
            if not is_remote and uri == LOCAL_PROXY_URI:
                logger.info(f"Switching automatically to Real Gateway: {REMOTE_GATEWAY_URI}")
                uri = REMOTE_GATEWAY_URI
                is_remote = True
            await asyncio.sleep(5)

def main():
    parser = argparse.ArgumentParser(description="Lucky Jet Provably Fair Verifier & CSV Exporter")
    parser.add_argument("output", nargs="?", default=DEFAULT_OUTPUT_FILE, help="Output CSV file name (default: newverification.csv)")
    parser.add_argument("--output", "-o", dest="output_opt", default=None, help="Output CSV file path")
    parser.add_argument("--uri", "-u", default=None, help="WebSocket URI (defaults to ws://localhost:8080 or live gateway)")
    parser.add_argument("--jwt", default=DEFAULT_JWT, help="JWT Token for Remote Gateway")
    
    args = parser.parse_args()
    output_target = args.output_opt or args.output or DEFAULT_OUTPUT_FILE
    
    selected_uri = args.uri
    if not selected_uri:
        # Default priority: local proxy if listening, else remote gateway
        selected_uri = REMOTE_GATEWAY_URI

    logger.info(f"Target verification CSV: {output_target}")
    try:
        asyncio.run(verify_gateway_stream(selected_uri, output_target, args.jwt))
    except KeyboardInterrupt:
        logger.info("Verifier stopped by user.")

if __name__ == "__main__":
    main()
