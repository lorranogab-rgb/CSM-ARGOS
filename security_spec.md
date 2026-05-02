# Security Specification - ARGOS Fleet Management

## Data Invariants
- A vehicle must have a valid placa, modelo, and chassi.
- An inspection must be linked to an existing vehicle (by placa/id).
- Users can only perform inspections if they are authenticated and their email is verified.
- Vehicles are uploaded by authenticated users.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a vehicle with `uploadedBy` set to another user's UID.
2. **State Shortcutting**: Attempt to create an inspection with a terminal status without going through the wizard logic (if applicable).
3. **Resource Poisoning**: Create a vehicle with a 1MB string in the `placa` field.
4. **Unauthenticated Write**: Attempt to write to `vehicles` without being signed in.
5. **Unauthorized Inspection**: Attempt to read all inspections without being a member of the organization.
6. **Email Spoofing**: Signed in with unverified email attempting to delete a vehicle.
7. **Phantom Document**: Create an inspection for a non-existent vehicle ID.
8. **Shadow Field**: Adding `isAdmin: true` to a vehicle document.
9. **PII Leak**: Authenticated user trying to read another user's private info (if we had a users collection).
10. **Query Scraping**: Attempting to list all vehicles without a proper filter.
11. **Negative Score**: Attempt to save an inspection with a negative `nota`.
12. **Future Date**: Saving an inspection with a date in the future (relative to `request.time`).

## The Test Runner
Execution of rules verification via `firestore.rules.test.ts` (conceptual for this turn).
