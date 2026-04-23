#!/bin/bash
set -e

# Wait for clickhouse to be available just in case, though the image guarantees it locally inside entrypoint
clickhouse-client -n <<-EOSQL
    CREATE DATABASE IF NOT EXISTS observability;

    CREATE TABLE IF NOT EXISTS observability.telemetry_metrics (
        timestamp DateTime,
        service_name String,
        endpoint String,
        http_status UInt16,
        latency_ms Float64,
        cpu_usage_percent Float32,
        memory_mb UInt32,
        disk_io Float32,
        net_tx Float32,
        net_rx Float32,
        hostname String,
        pod_name String,
        environment String,
        trace_id String,
        span_id String,
        user_id String,
        region String,
        instance_type String,
        error_message String,
        user_tier String,
        db_latency_ms Float64,
        cache_hit UInt8,
        transaction_value Float64,
        response_size_kb Float64
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMMDD(timestamp)
    ORDER BY (service_name, timestamp);

    CREATE USER IF NOT EXISTS '${DB_VIEWER_USER}' IDENTIFIED BY '${DB_VIEWER_PASS}';
    
    -- In ClickHouse, privileges are granted with GRANT
    GRANT SELECT ON observability.* TO '${DB_VIEWER_USER}';
    
    -- We grant select on system tables so the LLM can discover the schema if queried
    GRANT SELECT ON system.tables TO '${DB_VIEWER_USER}';
    GRANT SELECT ON system.columns TO '${DB_VIEWER_USER}';
EOSQL
echo "[INIT] ClickHouse initialization complete."
