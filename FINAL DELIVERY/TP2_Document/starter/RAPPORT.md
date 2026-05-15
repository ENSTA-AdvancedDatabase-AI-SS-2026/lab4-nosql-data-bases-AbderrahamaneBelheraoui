# Report TP2 — MongoDB: Medical Records for HealthCare DZ

**Student:** BELHERAOUI ABDERRAHMANNE
**Module:** Advanced Databases

---

## 1. Modelling Choices

### Strategy: Embedding vs Referencing

Two patterns were used depending on the nature of the data.

---

#### Embedding Pattern — Consultations inside the Patient document

```json
{
  "nom": "Bensalem",
  "consultations": [
    { "date": "...", "diagnostic": "HTA", "medicaments": [] }
  ]
}
```

**Why?**
A consultation cannot exist without its patient.
We always read them together (to display a complete medical record).
Embedding avoids a join and reduces read latency.
MongoDB recommends embedding when the relationship is **1-to-few**
and the data is always accessed together.

---

#### Referencing Pattern — Lab results in a separate collection

```json
{ "patient_id": ObjectId("..."), "type": "Glycémie", "resultat": {} }
```

**Why?**
A patient can have many lab results (dozens over time),
and they are often read independently (lab view vs doctor view).
Referencing avoids hitting the **16 MB** document size limit
and lets us manage TTL archiving on the separate collection independently.

---

### `$jsonSchema` Validation

Validation guarantees data integrity at insert time:

- **Required fields:** `cin`, `nom`, `prenom`, `dateNaissance`, `sexe`
- **Strict types:** `date` for dates, `array` for lists
- **Enumeration:** `sexe` ∈ {M, F} — `groupeSanguin` ∈ {A+, A−, B+, B−, AB+, AB−, O+, O−}

---

## 2. Aggregation Pipelines

### 3.1 — Diagnosis distribution by region (wilaya)

```
$unwind consultations
  → $group (wilaya + diagnostic) → count
    → $sort count DESC
      → $limit 20
```

`$unwind` is needed because consultations are an embedded array.
Without this step, we cannot group on their internal fields.

---

### 3.2 — Top medication by medical specialty

```
$unwind consultations → $unwind medicaments
  → $group (specialite + medicament) → count prescriptions
    → $sort → $group by specialite → $first (top 1)
```

Double `$unwind` because medications are an array inside an array.
The second `$group` with `$first` extracts the most prescribed medication
after sorting, without needing `$limit` per group.

---

### 3.3 — Monthly trend

```
$unwind → $match (last 12 months)
  → $group (year + month) → $sort chronological
    → $project: concat "YYYY-MM"
```

`$dateDiff` calculates age dynamically from `$$NOW`
rather than using a static stored value.

---

### 3.4 — High-risk patients

```
$match antecedents: { $all: ["Diabète type 2", "HTA"] }
  → $addFields age (dateDiff NOW)
    → $match age > 60
      → $sort nbAntecedents DESC
```

`$all` checks that **all** elements in the array are present,
unlike `$in` which checks if **at least one** is present.

---

### 3.5 — Doctor report

```
$unwind → $group doctor
  → uniquePatients : $addToSet(_id)
  → totalConsultations : $sum(1)
    → $addFields reconRate
        = (total - nbUnique) / nbUnique × 100
          → $sort → $limit 5
```

`$addToSet` collects patient IDs without duplicates,
which lets us distinguish *"50 consultations with 10 patients"*
from *"50 consultations with 50 different patients"*.

---

## 3. Indexes and Optimisation

### Indexes created

| Name                    | Collection | Key(s)                       | Type    | Purpose                           |
|-------------------------|------------|------------------------------|---------|-----------------------------------|
| idx_wilaya_antecedents  | patients   | wilaya + antecedents         | Compound| Geographic + medical filter       |
| idx_consultations_date  | patients   | consultations.date           | Simple  | Time-based queries                |
| idx_text_diagnostic     | patients   | consultations.diagnostic     | Text    | Full-text search on diagnoses     |
| idx_cin_unique          | patients   | cin                          | Unique  | Integrity + search by ID number   |
| idx_analyses_patient    | analyses   | patient_id                   | Simple  | Joins (`$lookup`)                 |
| idx_ttl_analyses_5ans   | analyses   | date                         | TTL     | Automatic archiving after 5 years |

---

### `explain()` comparison: before and after index

| Metric               | Without index (COLLSCAN)     | With index (IXSCAN)        |
|----------------------|------------------------------|----------------------------|
| Stage                | COLLSCAN                     | IXSCAN                     |
| Documents examined   | 20 (full collection)         | ≤ number of results        |
| Documents returned   | n                            | n                          |
| Time (ms)            | proportional to N            | nearly constant O(log N)   |

With 20 documents the difference is small, but with **1 million**
patient records, the COLLSCAN would examine 1,000,000 documents
while the IXSCAN would examine only a few dozen.

---

### TTL Index — Automatic archiving

```javascript
db.analyses.createIndex(
  { date: 1 },
  { expireAfterSeconds: 157680000 }  // 5 years
)
```

MongoDB checks every **60 seconds** for documents where
`date + 5 years < now` and deletes them automatically.
This removes the need for an external cleanup job and keeps
the collection at a manageable size over time.

---

## 4. Reflection Questions

### Q1 — Why embed consultations instead of referencing them?

Consultations are closely tied to the patient:
we never read a consultation without its patient.
Embedding makes sure we get the complete medical record
in **one single disk read** (no join needed).

**Limit:** if a patient accumulates hundreds of consultations
over 30 years, the document could approach the 16 MB limit.
In that case, we could archive consultations older than 5 years
into a separate `consultations_archivees` collection.

---

### Q2 — What would happen to performance if consultations were referenced?

Every time we display a patient record, we would need a `$lookup`
(equivalent to a JOIN), meaning **2 disk reads** instead of one.
With 10,000 simultaneous consultations, this would double the I/O load.

On the other hand, referencing would make it easier to run queries
that only look at consultations
(e.g. *"all cardiology consultations this month"*)
without needing to `$unwind` embedded arrays.

---

### Q3 — How to handle patient document growth over 10 years?

Three complementary strategies:

1. **Time-based archiving**: move consultations older than 2 years
   into a `consultations_archivees` collection with the same
   `patient_id` as a reference.

2. **Bucket pattern**: one document per year of consultations.

```json
{ "patient_id": "...", "annee": 2023, "consultations": [] }
```

3. **TTL index on analyses**: already implemented — automatic deletion
   after 5 years for lab data.
