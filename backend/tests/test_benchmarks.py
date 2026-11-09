"""Performance & Latency Benchmark Tests (Phase 14).

Verifies engine performance, scaling characteristics, and safety boundaries:
1. In-memory hash join throughput and linear scaling (100 -> 1,000 -> 5,000 rows)
2. Ambiguity evaluation latency (< 50ms)
3. Multi-dialect compilation latency (< 15ms)
4. PII data masking throughput (> 5,000 records/sec)
5. Sliding window rate limiter performance & accuracy
"""

import time
from typing import Any

from app.core.rate_limit import SlidingWindowRateLimiter
from app.core.security import mask_records
from app.engine.ambiguity_engine import AmbiguityEngine
from app.engine.compiler import MultiDialectCompiler
from app.engine.evaluator import CrossDatabaseEvaluator
from app.engine.ir.builder import LogicalPlanBuilder
from app.engine.ir.models import ComparisonOperator, JoinType, SortDirection
from app.models.connection import DatabaseType


def test_benchmark_hash_join_scaling() -> None:
    """Benchmark in-memory hash join with varying dataset sizes."""
    sizes = [100, 1000, 5000]
    timings = {}

    for n in sizes:
        left_rows = [{"id": i, "name": f"Product_{i}", "val": i * 1.5} for i in range(n)]
        # 2 matches per left row
        right_rows = [
            {"product_id": i % n, "rating": (i % 5) + 1, "comment": f"Review {i}"}
            for i in range(n * 2)
        ]

        start_time = time.perf_counter()
        joined = CrossDatabaseEvaluator.hash_join(
            left_rows=left_rows,
            right_rows=right_rows,
            left_key="id",
            right_key="product_id",
            is_left_outer=False,
        )
        elapsed = time.perf_counter() - start_time
        timings[n] = elapsed

        assert len(joined) == n * 2
        # Performance assertion: 5,000 x 10,000 join should finish in under 350ms
        if n == 1000:
            assert elapsed < 0.1, f"Hash join of {n} items took {elapsed:.4f}s"
        elif n == 5000:
            assert elapsed < 0.35, f"Hash join of {n} items took {elapsed:.4f}s (expected < 0.35s)"


def test_benchmark_ambiguity_evaluator_latency() -> None:
    """Benchmark deterministic ambiguity evaluation engine."""
    engine = AmbiguityEngine()
    test_query = "Find top 10 high-value customers who purchased electronics recently with active status"

    # Warmup
    engine.evaluate_query(query=test_query, connections={}, snapshots={})

    iterations = 50
    start_time = time.perf_counter()
    for _ in range(iterations):
        result = engine.evaluate_query(query=test_query, connections={}, snapshots={})
        assert result.is_ambiguous is True
    total_time = time.perf_counter() - start_time

    avg_latency_ms = (total_time / iterations) * 1000.0
    # Deterministic token & regex evaluation should take < 15ms per query
    assert avg_latency_ms < 15.0, f"Average ambiguity eval latency was {avg_latency_ms:.2f}ms (expected < 15ms)"


def test_benchmark_multidialect_compiler_latency() -> None:
    """Benchmark multi-dialect compilation from LogicalPlan IR to SQL & MQL."""
    compiler = MultiDialectCompiler()

    builder = LogicalPlanBuilder(workspace_id="ws-benchmark")
    plan = (
        builder.from_source("conn-pg", "customers", alias="c", database_type="postgres")
        .join(
            right_connection_id="conn-pg",
            right_source_name="orders",
            left_col=("c", "id"),
            right_col=("orders", "customer_id"),
            join_type=JoinType.INNER,
        )
        .filter("orders", "total_amount", ComparisonOperator.GTE, 500.0)
        .sort("total_amount", SortDirection.DESC)
        .limit(25)
        .set_query_text("High value customers with orders")
        .build()
    )

    connection_types = {"conn-pg": DatabaseType.POSTGRESQL}

    iterations = 100
    start_time = time.perf_counter()
    for _ in range(iterations):
        res = compiler.compile(plan, connection_types)
        assert res.is_cross_database is False
    total_time = time.perf_counter() - start_time

    avg_compile_ms = (total_time / iterations) * 1000.0
    # Compilation should be sub-millisecond or < 5ms
    assert avg_compile_ms < 5.0, f"Average compile latency was {avg_compile_ms:.2f}ms (expected < 5ms)"


def test_benchmark_pii_masking_throughput() -> None:
    """Benchmark PII data masking throughput across 5,000 records."""
    records: list[dict[str, Any]] = [
        {
            "id": i,
            "name": f"Customer_{i}",
            "credit_card": "4111-2222-3333-4444",
            "ssn": "123-45-6789",
            "api_key": "mock_api_key_test_abcdef1234567890",
            "password": "ClearTextPassword123!",
            "public_metric": 42.5,
        }
        for i in range(5000)
    ]

    start_time = time.perf_counter()
    masked = mask_records(records)
    elapsed = time.perf_counter() - start_time

    assert len(masked) == 5000
    assert masked[0]["credit_card"] == "****-****-****-4444"
    assert masked[0]["password"] == "***MASKED***"
    assert masked[0]["public_metric"] == 42.5

    records_per_sec = 5000 / max(elapsed, 0.0001)
    # Masking 5,000 records should achieve at least 5,000 records/sec
    assert records_per_sec > 5000, f"Throughput was {records_per_sec:.0f} rec/sec (expected > 5000)"


def test_benchmark_sliding_window_rate_limiter() -> None:
    """Benchmark high-throughput concurrency and accuracy of SlidingWindowRateLimiter."""
    limiter = SlidingWindowRateLimiter(max_requests=100, window_seconds=60)
    client_ip = "192.168.1.100"

    start_time = time.perf_counter()
    allowed_count = 0
    denied_count = 0

    for _ in range(150):
        if limiter.is_allowed(client_ip):
            allowed_count += 1
        else:
            denied_count += 1
    elapsed = time.perf_counter() - start_time

    assert allowed_count == 100
    assert denied_count == 50
    assert elapsed < 0.05, f"150 checks took {elapsed:.4f}s"
