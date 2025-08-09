## Psico UBA – Planificador de cursada

Planner built on Next.js (App Router) to organize the week across multiple cátedras, with support for:

- Selecting prácticas (Prac) and automatically including the required Teóricos/Seminarios based on the official “Oblig.” mapping
- Keeping selections across cátedra changes (multi‑cátedra plan)
- Hover previews (Prac + its Teo/Sem)
- Custom “grey zones” (busy blocks) you can add/remove and save locally
- Local save/restore per academic term

Data is consumed from a separate static dataset repo and versioned per term.

### Data source

- Default base: `https://santiago-musso.github.io/psico-uba-data`
- App fetches files at: `${BASE}/${TERM}/{catedras|sections|meets}.json`
- You can override the base via env: `NEXT_PUBLIC_DATA_BASE`

### Term handling (IMPORTANT)

- The app is currently configured for `TERM = 2025-2`.
- Local storage keys are namespaced by term, so saved selections and grey zones are term‑specific and will not auto‑apply to a new term.
- When the next term is published (e.g., `2026-1`):
  1. Publish the new dataset to the data repo under `/${NEW_TERM}/...`
  2. Update `TERM` in `src/app/schedule/page.tsx` (or make it an env var)
  3. (Optional) Provide a term selector in the UI

Local storage keys used:

- Selections (Prac): `psico-uba:selection:${TERM}`
- Grey zones: `psico-uba:gray:${TERM}`

### Development

```bash
npm run dev
# open http://localhost:3000
```

Environment (optional):

```bash
# to point to another dataset base
NEXT_PUBLIC_DATA_BASE=https://<user>.github.io/psico-uba-data
```

### Features in the UI

- Prac selection: check in the left sidebar. The calendar card shows an “✕” to remove that Prac (and its Teo/Sem) from the plan
- Save button: stores selections and grey zones in local storage for the active term
- Grey zones: add a day/time range and an optional note; remove on the calendar with “✕”

### Notes

- Teo/Sem mapping comes from the official website’s “Oblig.” field and is enforced per Prac. Changing Teo means choosing a different Prac that requires that Teo
- Parser logic in the data repo only records `chairLabel` when explicitly formatted as `LABEL - ...`. Otherwise it is left empty so docente names remain intact

