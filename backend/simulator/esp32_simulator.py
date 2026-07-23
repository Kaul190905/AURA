import time
import random
import logging
import httpx
from datetime import datetime, timezone
import uuid
import sys

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("ESP32Simulator")

class ESP32Simulator:
    """
    IoT Simulator behaving like an ESP32 device, sending telemetry data to a backend.
    """
    def __init__(
        self,
        api_url: str,
        user_id: str,
        interval_seconds: int = 5,
        noise_range: tuple = (30.0, 100.0),
        temp_range: tuple = (35.5, 39.5),
        hr_range: tuple = (60.0, 120.0),
        lat_range: tuple = (40.7, 40.8), # Example: New York latitude bounds
        lon_range: tuple = (-74.0, -73.9) # Example: New York longitude bounds
    ):
        self.api_url = api_url
        self.user_id = user_id
        self.interval_seconds = interval_seconds
        
        # Configurable ranges
        self.noise_range = noise_range
        self.temp_range = temp_range
        self.hr_range = hr_range
        self.lat_range = lat_range
        self.lon_range = lon_range

    def _generate_telemetry(self) -> dict:
        """Generate random sensor telemetry within configured ranges."""
        return {
            "user_id": self.user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "noise": round(random.uniform(*self.noise_range), 2),
            "temperature": round(random.uniform(*self.temp_range), 2),
            "heart_rate": round(random.uniform(*self.hr_range), 1),
            "latitude": round(random.uniform(*self.lat_range), 6),
            "longitude": round(random.uniform(*self.lon_range), 6)
        }

    def _send_data(self, data: dict):
        """Send data to the backend API."""
        try:
            # We use httpx synchronously here for simplicity in a loop,
            # but httpx.AsyncClient could be used if async is preferred.
            # Passing user_id as query parameter since authentication is temporarily disabled
            url = f"{self.api_url}?dev_user_id={self.user_id}"
            # Removing user_id from payload as it was removed from SensorDataCreate schema
            payload = {k: v for k, v in data.items() if k != "user_id"}
            response = httpx.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            logger.info(f"Successfully sent data: {payload}")
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error occurred: {e}")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")

    def run(self):
        """Start the simulator loop until interrupted."""
        logger.info(f"Starting ESP32 Simulator. Sending data to {self.api_url} every {self.interval_seconds}s.")
        try:
            while True:
                telemetry = self._generate_telemetry()
                self._send_data(telemetry)
                time.sleep(self.interval_seconds)
        except KeyboardInterrupt:
            logger.info("Simulator stopped by user (Ctrl+C). Exiting gracefully.")

if __name__ == "__main__":
    # Default execution for testing purposes.
    # Note: Replace with a valid user_id from your database
    TEST_USER_ID = "7737ba79-0d30-46e1-b6eb-4f41615bf10c"
    API_ENDPOINT = "http://localhost:8000/api/v1/sensor-data/"
    
    simulator = ESP32Simulator(
        api_url=API_ENDPOINT,
        user_id=TEST_USER_ID,
        interval_seconds=5
    )
    
    simulator.run()
