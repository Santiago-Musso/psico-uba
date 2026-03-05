# PsicoUBA — Planificador de cursada

Aplicación web para organizar el horario semanal de las carreras de la Facultad de Psicología (UBA). Permite seleccionar cátedras, elegir comisiones prácticas y visualizar todo en un calendario semanal interactivo.

**Live:** [psico-uba.vercel.app](https://psico-uba.vercel.app)

## Stack

- Next.js 15 (App Router), React 19, TypeScript 5
- Tailwind CSS v4 (inline styles para el layout del calendario)
- Datos estáticos consumidos desde [`psico-uba-data`](https://github.com/santiago-musso/psico-uba-data) vía GitHub Pages

## Características

### Flujo de 4 pasos (sidebar stepper)
1. **Bloques de ocupado** — Marcá franjas horarias en las que no podés cursar (trabajo, idiomas, etc.)
2. **Elegí tu programa** — Psicología, Profesorado, Musicoterapia o Terapia Ocupacional
3. **Buscá tu cátedra** — Filtrá por materia o nombre del docente en tiempo real
4. **Elegí tu comisión** — Seleccioná la comisión práctica; el teórico requerido se agrega automáticamente

### Calendario
- Vista semanal de lunes a viernes por defecto
- Scroll horizontal para ver sábado y domingo cuando hay clases
- Soporte completo para clases de domingo (dayNum 7)
- Bloques grises (zonas ocupadas) con nota opcional
- Hover sobre eventos para ver preview de la cátedra completa

### Persistencia local
- Selecciones y bloques grises guardados en `localStorage` con clave por cuatrimestre
- Al guardar, el estado persiste entre sesiones en el mismo navegador

## Data source

- Base por defecto: `https://santiago-musso.github.io/psico-uba-data`
- El app fetcha: `${BASE}/${TERM}/{catedras|sections|meets|materias|sedes}.json`
- Override vía env: `NEXT_PUBLIC_DATA_BASE`

## Manejo de cuatrimestres

El cuatrimestre activo está definido en `src/app/schedule/page.tsx` como `TERM = "2025-2"`.

Las claves de localStorage son específicas por cuatrimestre:
- Selecciones: `psico-uba:selection:${TERM}`
- Bloques grises: `psico-uba:gray:${TERM}`

Para agregar un nuevo cuatrimestre:
1. Publicar los datos en el repo `psico-uba-data` bajo `/${NEW_TERM}/...`
2. Actualizar `TERM` en `src/app/schedule/page.tsx`

## Desarrollo local

```bash
npm install
npm run dev
# http://localhost:3000
```

Para apuntar a datos locales (ver psico-uba-data):

```bash
# .env.local
NEXT_PUBLIC_DATA_BASE=http://localhost:4000
```

## Estructura de archivos clave

```
src/
├── app/
│   ├── page.tsx          # Landing page con demo animada
│   └── schedule/
│       └── page.tsx      # Planificador principal (stepper + calendario)
└── lib/
    └── types.ts          # Tipos compartidos (Section, Meet, Sede, etc.)
```

## Programas soportados

| Código | Nombre |
|--------|--------|
| PS | Licenciatura en Psicología |
| PR | Profesorado en Psicología |
| LM | Licenciatura en Musicoterapia |
| TE | Licenciatura en Terapia Ocupacional |
