# Security Specification - ARGOS Fleet Management

## Data Invariants
- **ADM Master Global Authority**: Accounts `cbmpr.leilao@gmail.com` and `lorranogab@gmail.com` (verified email) have global read/write access to all `/users`, `/vehicles`, and `/inspections`, including listing all users, assigning categories (`admin`, `vistoriador`, `visualizador`), and restricting `allowedPatios` to registered system yard addresses.
- **Registered Yard Address Scoping**: Non-master users may only be assigned `'TODOS'` or registered yard addresses (e.g., `CCT - Ponta Grossa`, `Patio Cachoeira - 6 BBM`). Users with `allowedPatios: []` fail closed and cannot operate on fleet records.
- **Role-Based Write Enforcement**:
  - `pending` and `inactive` users are denied reads and writes on `/vehicles` and `/inspections`.
  - `visualizador` (`active`) is strictly read-only on `/vehicles` and `/inspections` and cannot create, update, or delete records.
  - `vistoriador` and `admin` (`active` with valid `allowedPatios`) may create, update, and delete `/vehicles` and `/inspections`.
- **Self-Registration & Anti-Escalation**:
  - Unprivileged users (Google or Email/Password) creating their own `/users/{uid}` profile must match `request.auth.uid == userId` and `request.auth.token.email.lower()`, and can only initialize as `role: 'visualizador'`, `status: 'pending'`, `allowedPatios: []` OR (with verified email) claim a matching admin-authored pre-registration document (`preRegId`) with identical `email`, `role`, `status`, and `allowedPatios`.
  - Self-updates to `/users/{uid}` are strictly limited to profile metadata (`displayName`, `photoURL`, `lastLogin`, `updatedAt`) with `email`, `role`, `status`, and `allowedPatios` immutable.

## The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Self-Escalation to Admin or Vistoriador on Create**: Non-master user creates `/users/{uid}` with `role: 'admin'` or `'vistoriador'`, `status: 'active'`, or non-empty `allowedPatios` without matching verified pre-registration -> `PERMISSION_DENIED`.
2. **Self-Modification of Role/Yards on Update**: Active `vistoriador` updates `/users/{uid}` changing `role` to `'admin'` or adding `'TODOS'` to `allowedPatios` -> `PERMISSION_DENIED`.
3. **Unprivileged User Enumeration**: Non-master signed-in user attempts `list` on `/users` -> `PERMISSION_DENIED`.
4. **Cross-User PII Read**: Non-master user attempts `get` on another user's `/users/{otherUid}` document -> `PERMISSION_DENIED`.
5. **Email Spoofing**: Unverified email token matching an ADM Master email attempts to list `/users` or write `/vehicles` -> `PERMISSION_DENIED`.
6. **Visualizador Mutation**: Active user with `role: 'visualizador'` attempts `create`, `update`, or `delete` on `/vehicles` or `/inspections` -> `PERMISSION_DENIED`.
7. **Pending User Data Scraping**: User with `status: 'pending'` or `status: 'inactive'` attempts `list` or `get` on `/vehicles` or `/inspections` -> `PERMISSION_DENIED`.
8. **Zero-Yard Operator Write**: Active `vistoriador` with `allowedPatios: []` attempts to write to `/vehicles` or `/inspections` -> `PERMISSION_DENIED`.
9. **Unauthenticated Fleet Read/Write**: Signed-out client attempts to read or write `/vehicles`, `/inspections`, or `/users` -> `PERMISSION_DENIED`.
10. **Resource Poisoning (Oversized Fields/IDs)**: Authenticated operator submits a 10KB document ID or a 100KB `placa` string on `/vehicles` -> `PERMISSION_DENIED`.
11. **Negative Inspection Score / Invalid Schema**: Operator attempts to save an inspection with `nota: -5` or missing required fields (`placa`, `modelo`, `fullData`) -> `PERMISSION_DENIED`.
12. **Shadow Field Injection on User Profile Update**: User attempts `update` on `/users/{uid}` injecting `{ isMaster: true }` alongside `displayName` -> `PERMISSION_DENIED`.
