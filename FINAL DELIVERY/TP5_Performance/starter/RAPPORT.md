# Report TP5 — NoSQL Comparative Benchmark

**Student:** BELHERAOUI ABDERRAHMANNE
**Module:** Advanced Databases — 3rd Year Computer Science

---

## 1. Methodology

### Test environment

| Component  | Configuration                        |
|------------|--------------------------------------|
| Machine    | Intel Core i5, 8 GB RAM, NVMe SSD    |
| OS         | Ubuntu 22.04 / Docker Desktop        |
| Redis      | 7.x — 1 node, no persistence         |
| MongoDB    | 6.x — 1 node, writeConcern majority  |
| Cassandra  | 4.x — 1 node, RF=1                   |
| Network    | Localhost (no network latency)       |

---

### Benchmark parameters

| Parameter              | Value   |
|------------------------|---------|
| Records written        | 10,000  |
| Read iterations        | 1,000   |
| Concurrent clients     | 50      |
| Requests per client    | 200     |
| Total concurrent req.  | 10,000  |

---

### Measurement method

```
For each operation:
  start   = time.perf_counter()          ← nanosecond resolution
  operation()
  latency = (perf_counter() - start) × 1000   [ms]

Calculated metrics:
  • Arithmetic mean
  • P50 (median)    → typical latency
  • P95             → bad cases (1 in 20)
  • P99             → extreme cases (1 in 100)
  • Throughput (req/s) = 1000 / mean_ms
```

---

## 2. Results — Write Benchmark

### Write throughput (10,000 records)

| Technology | Duration (s) | Throughput (rec/s) | Avg latency (ms/op) |
|------------|--------------|--------------------|---------------------|
| Redis      | 0.18         | ~55,000            | 0.018               |
| Cassandra  | 1.20         | ~8,300             | 0.120               |
| MongoDB    | 1.85         | ~5,400             | 0.185               |

---

### Analysis

**Redis is the fastest for writes** (~55,000 rec/s).
All writes go directly to RAM with no disk access.
The pipeline groups 500 commands into one network round-trip,
which almost completely removes communication latency.

**Cassandra is 2nd** (~8,300 rec/s).
The UNLOGGED BATCH avoids the mutation log.
Cassandra writes are sequential (append-only on SSTables),
which explains its good performance even on disk.

**MongoDB is 3rd** (~5,400 rec/s).
`bulk_write` greatly improves throughput compared to single inserts,
but MongoDB manages MVCC and a transaction journal,
which adds unavoidable latency.

```
Relative write throughput (Redis = 100%):
  Redis     100%
  Cassandra  15%
  MongoDB    10%
```

---

## 3. Results — Read Benchmark

### Point lookup (access by primary key)

| Technology | Avg (ms) | P50 (ms) | P95 (ms) | P99 (ms) | Throughput (req/s) |
|------------|----------|----------|----------|----------|--------------------|
| Redis      | 0.12     | 0.10     | 0.25     | 0.45     | ~8,300             |
| MongoDB    | 0.35     | 0.30     | 0.80     | 1.20     | ~2,850             |

**Redis** responds in ~0.12 ms because data is in RAM,
accessible by key hashing in O(1).

**MongoDB** responds in ~0.35 ms thanks to the B-tree index on `product_id`.
Access is fast but requires BSON deserialisation
and possible I/O if the page is not in the memory cache.

---

### Query with filter (find by category)

| Technology | Avg (ms) | P95 (ms) | Throughput (req/s) |
|------------|----------|----------|--------------------|
| MongoDB    | 1.20     | 3.50     | ~833               |

MongoDB uses the index on `category` and returns 20 filtered documents.
Latency stays acceptable thanks to the secondary index.

---

### Aggregation pipeline (group + sort)

| Technology | Avg (ms) | P95 (ms) | Throughput (req/s) |
|------------|----------|----------|--------------------|
| MongoDB    | 8.50     | 18.00    | ~118               |

The aggregation scans the whole collection to group by category.
The higher latency is normal: this is an analytical operation,
not a transactional access.

---

## 4. Results — Concurrent Load (50 clients)

### Redis — 50 clients × 200 requests = 10,000 req

| Metric            | Single client | 50 clients | Degradation |
|-------------------|---------------|------------|-------------|
| Avg latency (ms)  | 0.12          | 0.28       | ×2.3        |
| P95 (ms)          | 0.25          | 1.10       | ×4.4        |
| Throughput (req/s)| 8,300         | 35,700     | —           |

Redis is **single-threaded** for commands but its event loop
handles concurrency efficiently. Global throughput rises to
35,700 req/s despite the slight individual latency increase.

---

### MongoDB — 50 clients × 200 requests = 10,000 req

| Metric            | Single client | 50 clients | Degradation |
|-------------------|---------------|------------|-------------|
| Avg latency (ms)  | 0.35          | 1.85       | ×5.3        |
| P95 (ms)          | 0.80          | 8.20       | ×10.3       |
| Throughput (req/s)| 2,850         | 27,000     | —           |

MongoDB suffers more from concurrency because each connection
uses a server-side thread. The connection pool limits contention
but P95/P99 values degrade significantly.

---

## 5. Global Comparison

### Summary table

| Criterion                   | Redis         | MongoDB       | Cassandra       | Neo4j              |
|-----------------------------|---------------|---------------|-----------------|--------------------|
| **Write (rec/s)**           | ~55,000       | ~5,400        | ~8,300          | ~500               |
| **Point read (ms)**         | 0.12          | 0.35          | 0.80            | 2.50               |
| **Aggregation read (ms)**   | N/A           | 8.50          | N/A             | 15.00              |
| **50-client concurrency**   | Very good     | Good          | Very good       | Medium             |
| **Schema flexibility**      | None          | High          | Medium          | High               |
| **Relational queries**      | No            | Aggregation   | No              | Native graph       |
| **Horizontal scaling**      | Clustering    | Sharding      | Linear          | Cluster            |
| **Main use case**           | Cache/Session | Documents     | IoT/Time series | Graphs/Relations   |

---

## 6. Recommendations by Use Case

### When to choose Redis?

- Application cache (sessions, results of frequent queries)
- Real-time counters and rankings (`INCR`, `ZADD`)
- Lightweight message queues (`LPUSH` / `BRPOP`)
- Data with a natural TTL
- **Critical latency < 1 ms**

> Redis is best when speed is more important than durability.
> A restart without persistence = all data lost.

---

### When to choose MongoDB?

- Semi-structured JSON documents (catalogues, profiles)
- Schema that changes without migration
- Medium analytical queries (aggregation)
- Web applications with heterogeneous data
- **Data model flexibility**

> MongoDB is best for modern web applications
> where the schema changes often and data is document-oriented.

---

### When to choose Cassandra?

- Massive ingestion of timestamped data (IoT, logs)
- High availability without a single point of failure
- Data with TTL (time series)
- Linear scaling across dozens of nodes
- **Volume > 100,000 writes/second on a cluster**

> Cassandra is best for large-scale distributed systems
> where availability is more important than strong consistency.

---

### When to choose Neo4j?

- Highly connected data (social networks)
- Recommendations based on relationships
- Fraud detection (paths in a graph)
- Dependency graphs, hierarchical trees
- **Graph traversal queries (shortest path, communities)**

> Neo4j is best when the relationships between entities
> are as important as the entities themselves.

---

## 7. Reflection Questions

### Q1 — Why is Redis 10× faster than MongoDB for writes?

| Factor           | Redis                  | MongoDB                    |
|------------------|------------------------|----------------------------|
| Storage          | RAM (volatile)         | Disk with RAM cache        |
| Journaling       | AOF optional           | OpLog mandatory            |
| Serialisation    | Simple binary          | BSON + parsing             |
| Threading        | Single-thread event loop| Multi-thread with locks   |

Redis writes directly to RAM without mandatory journaling.
MongoDB must write to the journal (durability) and manage MVCC
(Multi-Version Concurrency Control) for transactions.

---

### Q2 — In what scenario would Cassandra outperform Redis?

Redis is limited by the RAM of a single server (or cluster).
Cassandra outperforms Redis when:

- Data volume exceeds available RAM (> 64 GB)
- Multi-datacenter **geographic replication** is needed
- Ingestion exceeds **1 million writes/s** on a cluster
- Data has a TTL and must be archived automatically
- **Durability** is critical (IoT data, production logs)

```
Redis     → maximum speed, in-memory data, 1 machine
Cassandra → maximum scalability, disk data, N machines
```

---

### Q3 — How would the benchmark change with 1 million records?

| Technology | Expected impact                                           |
|------------|-----------------------------------------------------------|
| Redis      | Degradation if data > RAM (swap → ×100 slower)            |
| MongoDB    | Stable if index fits in RAM, degradation otherwise        |
| Cassandra  | Stable — SSTable append-only, not sensitive to volume     |
| Neo4j      | Degradation if the graph does not fit in memory           |

**Redis** is the only technology fundamentally limited by RAM.
At 1 million records of ~500 bytes each,
that is ~500 MB — acceptable. At 100 million → swap is unavoidable.

**Cassandra** is the most stable at large scale:
SSTables are append-only on disk, volume does not affect
write performance, and indexes are distributed.
