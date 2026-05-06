# Project Rules and Constraints

## Módulo Mímico (Mimic Module)
- **Identification:** The "Módulo Mímico" consists of the `MimicoFormI` and `MimicoFormIV` components, as well as the rendering logic associated with the `activeTab === 'mimico'` in `src/App.tsx`.
- **Constraint:** These components and their layout/formatting are **FROZEN**. Do not modify their internal structure, styles, or logic unless explicitly requested to fix a critical bug.
- **Interference:** Any new features, tabs, or UI changes added to the application must not interfere with, overlap, or alter the appearance and behavior of the Módulo Mímico.
- **Layout Consistency:** The fixed dimensions (210mm x 297mm) and the specific typography used in these forms must be preserved.
