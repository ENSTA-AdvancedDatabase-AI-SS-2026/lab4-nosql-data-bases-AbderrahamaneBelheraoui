# Report TP3 — Cassandra: SmartGrid DZ

**Student:** BELHERAOUI ABDERRAHMANNE
**Module:** Advanced Databases

---

## 1. Why These Partition Keys?

### Table `mesures_par_capteur` → `(capteur_id, date_jour)`

| Option considered          | Problem                                                                      |
|----------------------------|------------------------------------------------------------------------------|
| `(capteur_id)` alone       | 90 days × 1,440 readings = **129,600 rows/partition** → too large            |
| `(wilaya, date_jour)`      | Algiers = 4,000 sensors × 1,440 = **5.76 M rows/partition** → hot partition |
| `(capteur_id, date_jour)`  | **1,440 rows/partition** — stable and predictable size                       |

The daily bucket `date_jour` is the key design decision.
It makes sure that a partition never grows beyond **1,440 rows**
(one reading per minute over 24 hours).
After 90 days, the TTL deletes whole partitions,
freeing disk space in a predictable way.

---

### Table `alertes_par_wilaya` → `(wilaya, date_jour)`

| Option considered            | Problem                                                         |
|------------------------------|-----------------------------------------------------------------|
| `(wilaya)` alone             | Years of alerts in one partition → no limit on size             |
| `(capteur_id, date_jour)`    | Impossible to read all alerts for one region                    |
| `(wilaya, date_jour)`        | Maximum ~500 alerts/day/region — natural query pattern          |

The business query is *"alerts in Algiers today"*.
So the partition key must contain both `wilaya` AND `date_jour`
to run this query without a full cluster scan.

---

### Table `agregats_horaires` → `(wilaya, date_jour)`

24 rows per partition (one per hour).
Very small partition, ultra-fast read for the dashboard.
The 5-year TTL keeps history for long-term analysis.

---

## 2. Why `ALLOW FILTERING` Is Dangerous in Production

### What Cassandra does without `ALLOW FILTERING`

```
Request → hash(partition_key) → responsible node → local read
Latency: < 1 ms
```

### What Cassandra does with `ALLOW FILTERING`

```
Request → broadcast to ALL nodes
         → each node scans ALL its partitions
         → filters matching rows
         → coordinator aggregates results
Latency: seconds to minutes
```

### Real impact on SmartGrid DZ

```
10,000 sensors × 90 days = 900,000 partitions

ALLOW FILTERING on mesures_par_capteur:
  → 900,000 partitions read
  → ~129 million rows scanned
  → CPU load: 100% on all nodes
  → Latency: timeout (30 s by default)
  → Risk: cascade of timeouts → cluster becomes unavailable
```

### Rule to follow

> For every frequent query → create a dedicated table
> with a partition key that matches that query.

`ALLOW FILTERING` is acceptable **only** if the partition is already
targeted and the extra filter applies to a small known number of rows.

---

## 3. Comparison: TWCS vs STCS vs LCS

| Criterion                | STCS                                   | TWCS                                  | LCS                                  |
|--------------------------|----------------------------------------|---------------------------------------|--------------------------------------|
| **Principle**            | Groups SSTables of similar size        | Groups by time window                 | Groups by size level                 |
| **Write throughput**     | Excellent                              | Excellent                             | Medium (write amplification)         |
| **Read latency**         | Variable                               | Variable                              | Stable and low                       |
| **TTL cleanup speed**    | Slow                                   | Fast (per window)                     | Slow                                 |
| **Disk usage**           | Unpredictable                          | Predictable                           | Compact                              |
| **CPU complexity**       | Low                                    | Low                                   | High                                 |

### When to use each one?

**TWCS — time series data (our choice for `mesures_par_capteur`)**
- Timestamped data with TTL
- Massive continuous ingestion (IoT, logs, metrics)
- Past data is never updated
- The compaction window must match the partition key bucket

```sql
-- Window = 1 day because date_jour is our bucket
'compaction_window_unit' : 'DAYS',
'compaction_window_size' : 1
```

**STCS — write-heavy workload without TTL**
- Data without an expiry date
- Few reads, many writes
- Use case: permanent event logs

**LCS — read-heavy workload with few writes**
- Data read very frequently
- Few new writes (stable data)
- Use case: `agregats_horaires` table (dashboard read constantly, written once per hour)

---

### Summary for SmartGrid DZ

| Table                  | Strategy  | Reason                                       |
|------------------------|-----------|----------------------------------------------|
| `mesures_par_capteur`  | **TWCS**  | IoT timestamped, TTL 90 days, massive ingest |
| `alertes_par_wilaya`   | **TWCS**  | IoT timestamped, TTL 1 year, less frequent   |
| `agregats_horaires`    | **LCS**   | Few writes, continuous dashboard reads       |
