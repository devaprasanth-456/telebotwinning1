import asyncio
import json
import logging
import csv
import os
from datetime import datetime
from websockets import connect

# Configure the basic logger
logging.basicConfig(
    format="%(asctime)s %(message)s",
    level=logging.INFO,
)

class JSONFormatter(logging.Formatter):
    """Render logs as JSON."""
    def format(self, record):
        event = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        return json.dumps(event)

# Apply the JSON formatter
logger = logging.getLogger("GameStateLogger")
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.propagate = False

async def log_game_data(uri):
    logger.info(f"Connecting to {uri}...")
    
    MAX_ROWS = 100000
    current_file_index = 1
    
    def get_csv_filename(index):
        if index == 1:
            return "game_logger_output.csv"
        return f"game_logger_output_{index}.csv"
        
    # Find the current file index to write to (resume if script restarted)
    while True:
        fname = get_csv_filename(current_file_index)
        if not os.path.exists(fname):
            break
        with open(fname, 'r') as f:
            lines = sum(1 for _ in f)
        if lines < MAX_ROWS:
            break
        current_file_index += 1
        
    csv_file = get_csv_filename(current_file_index)
    file = open(csv_file, mode='a', newline='')
    writer = csv.writer(file)
    
    if os.stat(csv_file).st_size == 0:
        writer.writerow(['Timestamp', 'Event', 'Value', 'Predicted_Crash'])
        current_row_count = 0
    else:
        with open(csv_file, 'r') as f:
            current_row_count = sum(1 for _ in f) - 1
            if current_row_count < 0: current_row_count = 0

    def rotate_file_if_needed():
        nonlocal current_file_index, current_row_count, csv_file, file, writer
        if current_row_count >= MAX_ROWS:
            file.close()
            current_file_index += 1
            current_row_count = 0
            
            csv_file = get_csv_filename(current_file_index)
            file = open(csv_file, mode='a', newline='')
            writer = csv.writer(file)
            
            writer.writerow(['Timestamp', 'Event', 'Value', 'Predicted_Crash'])
            logger.info(f"Rotated log file to {csv_file}")

    try:
        async with connect(uri) as websocket:
            logger.info(f"Connected! Storing output in {csv_file} (max {MAX_ROWS} rows per file)")
            while True:
                try:
                    message = await websocket.recv()
                    
                    for frame in message.split('\n'):
                        if not frame.strip():
                            continue
                            
                        data = json.loads(frame)
                        pub_data = data.get('push', {}).get('pub', {}).get('data') or \
                                   data.get('pub', {}).get('data') or \
                                   data.get('result', {}).get('data')
                                   
                        if pub_data:
                            event_type = pub_data.get('eventType') or pub_data.get('event_type') or pub_data.get('type')
                            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                            
                            row_to_write = None
                            
                            if event_type == 'changeCoefficient':
                                multiplier = pub_data.get('multiplier')
                                if multiplier:
                                    logger.info(f"Live Multiplier: {multiplier}x")
                                    row_to_write = [timestamp, 'Live Multiplier', multiplier, '']
                                    
                            elif event_type == 'stopCoefficient':
                                final_val = pub_data.get('finalValue') or pub_data.get('finalCoefficient') or pub_data.get('__crash_value__')
                                if final_val:
                                    logger.info(f"CRASHED! Final Value: {final_val}x")
                                    row_to_write = [timestamp, 'Crash', final_val, '']
                                    
                            elif event_type == 'startGame':
                                future_crash = pub_data.get('__future_crash')
                                logger.info(f"Round Started! (Predicted crash: {future_crash}x)")
                                row_to_write = [timestamp, 'Round Start', '', future_crash]
                                
                            if row_to_write:
                                rotate_file_if_needed()
                                writer.writerow(row_to_write)
                                file.flush()
                                current_row_count += 1
                                
                except Exception as e:
                    logger.error(f"Connection lost or error: {e}")
                    break
    finally:
        file.close()

if __name__ == "__main__":
    # Connect to the local WebSocket broadcast on port 8080
    asyncio.run(log_game_data("ws://localhost:8080"))
