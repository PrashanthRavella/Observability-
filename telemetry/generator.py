import time
import random
import os
import datetime
import uuid
from clickhouse_connect import get_client

# Environment variables or defaults
CH_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CH_PORT = int(os.getenv("CLICKHOUSE_PORT", 8123))
CH_USER = os.getenv("CLICKHOUSE_USER", "admin")
CH_PASS = os.getenv("CLICKHOUSE_PASSWORD", "admin_password")

SERVICES = ["api-gateway", "auth-service", "order-engine", "payment-processor"]
ENDPOINTS = ["/login", "/checkout", "/status", "/metrics", "/query"]
STATUS_CODES = [200, 201, 400, 401, 403, 500, 502, 503]
STATUS_WEIGHTS = [70, 10, 5, 5, 2, 3, 3, 2]

REGIONS = ["us-east-1", "us-west-2", "eu-central-1", "ap-southeast-1"]
INSTANCE_TYPES = ["t3.medium", "m5.large", "c6g.xlarge"]
ENVIRONMENTS = ["prod", "staging", "dev"]
HOSTNAMES = ["aws-node-01", "aws-node-02", "gcp-instance-01", "azure-vm-01"]
POD_SUFFIXES = ["a1b2", "c3d4", "e5f6", "g7h8"]
ERROR_MESSAGES = [
    "Connection timeout",
    "Database lock contention",
    "Dependency 'auth-service' unreachable",
    "Cache miss rate above threshold",
    "Invalid token format",
    "Null pointer exception in order processor",
    "Insufficient disk space on /tmp"
]

TIERS = ["free", "pro", "enterprise"]
TIER_WEIGHTS = [60, 30, 10]

def generate_telemetry_batch(batch_size=100):
    data = []
    now = datetime.datetime.now(datetime.timezone.utc)
    for _ in range(batch_size):
        spike = random.random() < 0.05
        base_latency = random.uniform(10.0, 150.0)
        latency_ms = base_latency * random.uniform(5.0, 20.0) if spike else base_latency
        status = random.choices(STATUS_CODES, weights=STATUS_WEIGHTS)[0]
        
        error_msg = ""
        if spike:
            status = random.choice([500, 502, 503, 504])
            error_msg = random.choice(ERROR_MESSAGES)

        service = random.choice(SERVICES)
        env = random.choice(ENVIRONMENTS)
        host = random.choice(HOSTNAMES)
        pod = f"{service}-{random.choice(POD_SUFFIXES)}"
        
        # Resource Metrics
        cpu_usage = random.uniform(10.0, 95.0) if not spike else random.uniform(80.0, 100.0)
        memory_mb = int(random.uniform(256, 4096))
        disk_io = random.uniform(0.1, 50.0)
        net_tx = random.uniform(1.0, 100.0)
        net_rx = random.uniform(1.0, 100.0)

        # Advanced/Business Metrics
        user_tier = random.choices(TIERS, weights=TIER_WEIGHTS)[0]
        db_latency_ms = random.uniform(2.0, 50.0) * (3.0 if spike else 1.0)
        cache_hit = 1 if random.random() > 0.3 else 0
        transaction_value = random.uniform(10.0, 500.0) if service == "payment-processor" else 0.0
        response_size_kb = random.uniform(1.0, 2048.0)

        data.append([
            now,
            service,
            random.choice(ENDPOINTS),
            status,
            latency_ms,
            cpu_usage,
            memory_mb,
            disk_io,
            net_tx,
            net_rx,
            host,
            pod,
            env,
            str(uuid.uuid4()), # trace_id
            str(uuid.uuid4())[:16], # span_id
            f"user_{random.randint(1000, 9999)}", # user_id
            random.choice(REGIONS),
            random.choice(INSTANCE_TYPES),
            error_msg,
            user_tier,
            db_latency_ms,
            cache_hit,
            transaction_value,
            response_size_kb
        ])
    return data

def main():
    print(f"Connecting to ClickHouse at {CH_HOST}:{CH_PORT} with user {CH_USER}...")
    client = None
    for attempt in range(10):
        try:
            client = get_client(host=CH_HOST, port=CH_PORT, username=CH_USER, password=CH_PASS, database='observability')
            print("Connected successfully!")
            break
        except Exception as e:
            print(f"Connection failed, retrying in 5 seconds... ({e})")
            time.sleep(5)
            
    if not client:
        print("Failed to connect to ClickHouse. Exiting.")
        return

    print("Starting telemetry loop (30s interval)...")
    try:
        while True:
            # Batch size increased slightly but keeping user preference
            batch = generate_telemetry_batch(batch_size=random.randint(50, 200))
            client.insert(
                'telemetry_metrics', 
                batch, 
                column_names=[
                    'timestamp', 'service_name', 'endpoint', 'http_status', 'latency_ms',
                    'cpu_usage_percent', 'memory_mb', 'disk_io', 'net_tx', 'net_rx',
                    'hostname', 'pod_name', 'environment', 'trace_id', 'span_id',
                    'user_id', 'region', 'instance_type', 'error_message',
                    'user_tier', 'db_latency_ms', 'cache_hit', 'transaction_value', 'response_size_kb'
                ]
            )
            time.sleep(30)
    except KeyboardInterrupt:
        print("Telemetry loop stopped.")

if __name__ == "__main__":
    main()
