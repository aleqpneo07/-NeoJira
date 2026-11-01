# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Identity & Ownership**: Every document in `/tasks/{taskId}` and `/subtasks/{subtaskId}` belongs to a single verified user (`request.auth.uid == data.ownerId` and `request.auth.token.email_verified == true`).
2. **Relational Integrity (Master Gate)**: A `Subtask` cannot be created, read, updated, or deleted unless its parent `/tasks/$(taskId)` exists and belongs to the same authenticated `request.auth.uid`.
3. **Immutable Provenance**: `ownerId`, `createdAt`, and (for subtasks) `taskId` are strictly immutable once created.
4. **Temporal Integrity**: `createdAt` on creation and `updatedAt` on both creation and update must strictly equal `request.time`.
5. **Strict Key & Volumetric Boundaries**: Every write enforces `hasAll` + `hasOnly` key allowlists and bounded string/number ranges matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on Task Create**: `ownerId: "victim_uid"` while authenticated as `"attacker_uid"` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` creating a Task -> `PERMISSION_DENIED`.
3. **Shadow / Ghost Field Injection**: Adding `"isAdmin": true` to a Task payload -> `PERMISSION_DENIED`.
4. **Orphaned Subtask Creation**: Creating a Subtask pointing to a non-existent `taskId` -> `PERMISSION_DENIED`.
5. **Cross-Tenant Subtask Hijack**: Creating a Subtask pointing to a `taskId` owned by another user -> `PERMISSION_DENIED`.
6. **Owner Mutation on Update**: Updating `ownerId` on an existing Task -> `PERMISSION_DENIED`.
7. **CreatedAt Tampering on Update**: Modifying `createdAt` during a Task update -> `PERMISSION_DENIED`.
8. **Client Timestamp Forgery**: Supplying a past or future timestamp instead of `request.time` for `updatedAt` -> `PERMISSION_DENIED`.
9. **Denial-of-Wallet String Overflow**: Supplying a 5,000-character string for `title` (limit 120) -> `PERMISSION_DENIED`.
10. **Invalid Enum Value**: Setting `status: "hacked"` instead of `pendiente | en_marcha | terminado` -> `PERMISSION_DENIED`.
11. **Out-of-Bounds Progress Value**: Setting `progress: 999` or `-10` -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Listing `/tasks` without filtering by `ownerId == request.auth.uid` -> `PERMISSION_DENIED`.
