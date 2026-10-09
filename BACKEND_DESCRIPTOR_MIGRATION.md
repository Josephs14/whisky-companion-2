# Backend migration — dram descriptor persistence

Status: **NOT DEPLOYED**. The new Drams sheet columns exist, but the deployed Apps Script backend has not been edited or verified.

## Required Apps Script changes

1. In `GET_STATE`, confirm the Drams reader uses the full header row (A:Y or wider), not a fixed A:R field list. Return these exact keys with every dram: `Nose Descriptors`, `Palate Descriptors`, `Finish Descriptors`, `Tasting Sample Type`, `Blind Mode`, `Reveal Status`, `Post-Reveal Notes`.
2. In `UPDATE_DRAM`, whitelist `Nose Descriptors`, `Palate Descriptors`, `Finish Descriptors` alongside the existing editable fields. Accept `{tastingId, changes}` and write only those columns. Never rewrite the entire row using an old 18-column schema.
3. Validate descriptor values: semicolon-separated values; no more than ten values per category; each value from the frontend option list; empty string allowed. Preserve legacy Nose/Palate/Finish Character and Free Notes.
4. Keep Whisky ID and Bottle ID protected until referential integrity, history and audit handling have been tested.
5. Record UPDATE_DRAM changes in Audit, including before/after values and timestamp. Do not log the API token.

## Safe end-to-end test

- Read an existing dram's three descriptor fields and capture originals.
- Send UPDATE_DRAM with one descriptor field only, using a valid option.
- GET_STATE must return the exact new value for the same Tasting ID.
- Restore original value and GET_STATE again.
- Verify the other fields (Score, Nose, Palate, Finish Character, Free Notes, Whisky ID, Bottle ID) are unchanged.
- Verify Audit records both edits. Do not test by creating fake whisky/bottle records.

Frontend intentionally refuses descriptor writes if GET_STATE has not exposed all three descriptor keys. This prevents a false success from older backend versions.
