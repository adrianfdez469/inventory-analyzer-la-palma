# CONTEXTO DE HANDOFF — Inventory Analyzer (Ferretería La Palma)

## Estado: ✅ IMPLEMENTACIÓN COMPLETA (Fase A + Fase B + Fase C verificadas)

Todo lo descrito originalmente en este documento fue implementado y verificado:

- `packages/core`: parser completo (`cortes.ts`, `inversion.ts`, `resumen.ts`, `parseWorkbook.ts`) +
  analítica completa (`filters.ts`, `metrics.ts`, `rankings.ts`) + `index.ts` con todos los exports.
  17 tests en `tests/parser.test.ts` y `tests/analytics.test.ts`, todos verdes contra el fixture real
  (`tests/fixtures/ferreteria.xlsx`). `pnpm --filter @inventory/core typecheck` y `test` limpios.
- `apps/pwa`: app React 19 + Vite 7 + Tailwind v4 + vite-plugin-pwa completa (store, persistencia con
  idb-keyval, todas las páginas: Import/Dashboard/Rankings/Products/Restock + drawer de detalle +
  FilterBar + toggle de moneda USD/CUP). Iconos PWA generados con `pnpm icons` (script sin
  dependencias, usa `node:zlib`). Probada manualmente en navegador con Claude in Chrome: importar el
  fixture real funciona end-to-end, 0 warnings, todos los KPIs/rankings/cuadrantes/reposición
  coinciden con los números esperados (ver sección "Datos de referencia" abajo). Sin errores de
  consola.
- Verificación completa: `pnpm -r build`, `pnpm -r test`, `pnpm -r typecheck` — todo pasa.
  Smoke test de `pnpm preview`: `/` → 200, `/sw.js` → 200.

### Detalle no obvio descubierto durante la implementación

- **Warnings de continuidad de stock**: el Excel real tiene 4 casos donde el "stock inicial" del
  corte N+1 es 1 unidad MAYOR que el "restante" reportado en el corte N (p.ej. Pila de lavamanos:
  restante corte 2 = 49, inicial corte 3 = 50). Esto ocurre porque hubo una compra (ver hoja
  Inversion) dentro del rango del corte anterior y la persona reescribió la cantidad nominal en vez
  de la cantidad real cargada. La regla de warning implementada en `parseCortesSheet`
  (`packages/core/src/parser/cortes.ts`) solo dispara si el stock inicial es MENOR al restante previo
  (inventario "perdido" — sospechoso); un stock inicial mayor se interpreta como reposición normal y
  NO genera warning. Con esta regla el fixture real da 0 warnings de continuidad, como se esperaba.

### Datos de referencia (fixture real, sin filtros) — para validar futuros cambios

- 18 compras, 3 cortes (11/18/18 líneas; 2/3/3 días).
- unitsSold total = 59, revenue ≈ 258.43 USD, profit total ≈ 91.87 USD.
- Suma de `profitAdrian` (columna P) del corte 1 ≈ 11.549 USD.
- `juiciest[0]` = "Bombilla recargable 15W" (≈1.91 USD/día). Taladro Percutor ≈1.76 USD/día.
- Filtro `cortes:[1]` → 20 unidades. Filtro `from:"2026-03-31"` → 39 unidades.
- Restock sugerido = ["Caja de breaker de 8 posiciones" (~8 días), "Interruptor Simple" (~15 días)].

## Cómo levantar el proyecto

```
pnpm install
pnpm icons          # regenera los PNG si se borran (ya están en apps/pwa/public/)
pnpm -r build
pnpm -r test
pnpm -r typecheck
pnpm dev             # build de core + vite dev server para la PWA
pnpm preview          # sirve el build de producción de la PWA
```

## Decisiones ya aprobadas por el usuario (contexto, no cambiar sin confirmar)

1. **PWA web (monorepo)** — elegida en vez de Flutter. Instalable en Windows y Android, offline.
2. **Solo análisis** — la app importa el Excel y muestra insights; NO registra ventas nuevas. El Excel
   sigue siendo la fuente de verdad.
3. **"Días sin vencerse" = días sin vender** (no hay fechas de vencimiento; es ferretería).
4. **Solo negocio principal**: hojas `Inversion`, `Productos USD` (fuente de verdad; `Productos CUP`
   es espejo), `Ganancias Adrian y Ale`. Se ignoran hojas ocultas.
5. Moneda base de cálculo: **USD**. Toggle visual a CUP usando el tipo de cambio del corte
   (`displayRate`).

## Convenciones del proyecto

- Comentarios y UI en ESPAÑOL (usuario cubano, negocio en CUP/USD).
- Sin librerías de UI externas; Tailwind puro, tema oscuro slate-950/900.
- `toNum` ignora strings tipo `#DIV/0!`. `'Precio de compra '` tiene espacio final;
  `'Porductos restantes'`/`'Acumaldo'` tienen typos originales del Excel — el parser los tolera, NO se
  corrige el Excel.
- NO crear README ni docs extra no solicitados.

## Posibles próximos pasos (no solicitados aún, sugerir antes de implementar)

- Empaquetado/firma para distribución en Android e instalación offline verificada en un dispositivo
  real (hasta ahora solo probado en navegador de escritorio).
- Ajustar `manualChunks` en `vite.config.ts` si el bundle de ~1MB (recharts incluido) resulta un
  problema real en dispositivos de gama baja.
- Tests de los componentes React (actualmente solo se probó manualmente vía navegador).
