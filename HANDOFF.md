# CONTEXTO DE HANDOFF — Inventory Analyzer (Ferretería La Palma)

## Estado: ✅ IMPLEMENTACIÓN COMPLETA (Fase A + Fase B + Fase C verificadas)

Todo lo descrito originalmente en este documento fue implementado y verificado:

- `packages/core`: parser completo (`cortes.ts`, `inversion.ts`, `resumen.ts`, `parseWorkbook.ts`) +
  analítica completa (`filters.ts`, `metrics.ts`, `rankings.ts`) + `index.ts` con todos los exports.
  25 tests (`tests/parser.test.ts`, `tests/analytics.test.ts`, `tests/parser-multilocation.test.ts`),
  todos verdes contra los fixtures reales. `pnpm --filter @inventory/core typecheck` y `test` limpios.
  **Ver la sección "ACTUALIZACIÓN (2026-08-27)" más abajo — el modelo de datos cambió a multi-local.**
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

### Datos de referencia (fixture viejo `ferreteria.xlsx`, single-local, sin filtros)

Para el fixture nuevo multi-local ver "ACTUALIZACIÓN (2026-08-27)" más abajo.

- 18 compras, 3 cortes (11/18/18 líneas; 2/3/3 días).
- unitsSold total = 59, revenue ≈ 258.43 USD, profit total ≈ 91.87 USD.
- Suma de `profitAdrian` (columna P) del corte 1 ≈ 11.549 USD.
- `juiciest[0]` = "Bombilla recargable 15W" (≈1.91 USD/día). Taladro Percutor ≈1.76 USD/día.
- Filtro `cortes:[1]` → 20 unidades. Filtro `from:"2026-03-31"` → 39 unidades.
- Restock sugerido = ["Caja de breaker de 8 posiciones" (~8 días), "Interruptor Simple" (~15 días)].

## ⚠️ ACTUALIZACIÓN (2026-08-27): soporte multi-local

El negocio creció a **3 locales**: Palma (el original), Leo y Vedado. El Excel cambió de nombres de
hoja (`"Productos USD"` → `"Productos Palma USD"`, + hojas nuevas para Leo/Vedado) y esto reemplaza
la decisión #4 de más abajo ("solo negocio principal") — ahora la app analiza los 3 locales.

### Modelo de datos nuevo

`InventorySnapshot` pasó de tener `cortes`/`purchases`/`resumen`/`sourceCurrency` planos a
`locations: LocationSnapshot[]` (cada uno con su propio `cortes`/`purchases`/`resumen`/
`sourceCurrency`/`warnings`). `computeAnalytics(location, filters)` ahora recibe un
`LocationSnapshot`, no el snapshot completo — la UI decide cuál local pasar
(`AnalyticsContext.tsx` busca `snapshot.locations.find(l => l.id === currentLocationId)`).
`Corte.id` (secuencial, único dentro del local) reemplazó a `Corte.index` como identificador para
filtros/keys — `index`/`title` quedan solo como metadata del rótulo original.

`packages/core/src/parser/parseWorkbook.ts` descubre locales con el regex
`/^productos?(?:\s+(.+?))?\s+(usd|cup)$/i` sobre los nombres de hoja (tolera plural/singular y
formato viejo sin nombre de local, que cae por defecto en el local `"palma"`). Ignora hojas ocultas
(vía `workbook.Workbook.Sheets[].Hidden`). La hoja `Inversion` (sin sufijo de local, en este archivo)
se asigna al local `"palma"` por convención documentada en el código.

### Particularidades encontradas en el Excel real, ya manejadas por el parser

- **Vedado** titula sus cortes con **una sola fecha** (`"Corte 1(523) 14/04/26"`, sin rango).
  `parseCorteTitle` acepta 1 o 2 fechas; si falta la segunda, `cortes.ts` la rellena después de
  ordenar, usando el `startDate` del corte siguiente (o el propio si es el último — período abierto).
- Vedado reparte con **"Dinero Tienda 12%"** en vez de 50% — el alias de esa columna es genérico
  (`"dinero tienda"`, sin el porcentaje) para tolerar cualquier reparto.
- **Leo reinicia su numeración de corte** a mitad de hoja (hay dos "Corte 1", dos "Corte 2"...). Por
  eso `Corte.id` (secuencial 1..N por local) es el identificador real; `Corte.index`/`title` pueden
  repetirse y NO deben usarse para filtros ni `key` de React.
- Solo Palma tiene compras itemizadas (`Inversion`) y hoja de ganancias propia; Leo y Vedado quedan
  con `purchases: []`/`resumen: []` — es así en los datos reales, no un bug.
- La hoja `Ganancias Palma Adrian y Ale` trae filas de plantilla vacía para cortes futuros —
  `resumen.ts` corta en la primera fila donde `totalSales`/`moneyReceived`/`investment` son los 3
  `null`.
- Hay productos vendidos por peso/cantidad fraccionaria (ej. "Alambre de soldar"), así que
  `unitsSold`/`stockRemaining`/etc. pueden traer decimales largos — la UI siempre debe formatearlos
  con `fmtQty` (`apps/pwa/src/lib/format.ts`), nunca mostrarlos como string crudo.
- Fuera de alcance (no pedido, sigue ignorado): hoja `Inventario` (comparación manual de stock entre
  locales — no es una de las 4 hojas fuente de verdad por local).

### Datos de prueba

- `packages/core/tests/fixtures/ferreteria.xlsx` (viejo, formato sin nombre de local) sigue siendo el
  test de regresión del formato single-local — cae en el local `"palma"` por defecto.
- `packages/core/tests/fixtures/ferreteria-multilocal.xlsx` (nuevo, gitignored) +
  `tests/parser-multilocation.test.ts` cubren el descubrimiento de los 3 locales y las
  particularidades de arriba. Palma real: 44 cortes / 40 compras / 101 productos.
- La key de IndexedDB de la PWA subió a `v2` (`apps/pwa/src/lib/persistence.ts`) porque la forma de
  `InventorySnapshot` cambió — un snapshot viejo cacheado en el navegador de alguien simplemente deja
  de leerse (pide reimportar) en vez de crashear.
- Probado manualmente en navegador con el Excel multi-local real: importar, cambiar entre los tabs
  Palma/Vedado/Leo en el Header, filtros, drawer de producto — sin errores de consola. De paso se
  encontró y arregló un bug de formato preexistente (no específico de multi-local): varias páginas
  mostraban `unitsSold`/`stockRemaining` como número crudo sin redondear
  (`String(totals.unitsSold)` etc.) — pasaba desapercibido porque el fixture viejo solo tenía enteros;
  con productos vendidos por peso (decimales largos) se hizo visible. Ahora todas usan `fmtQty`.

## Distribución / deploy

- Repo público: https://github.com/adrianfdez469/inventory-analyzer-la-palma (rama `main`).
- Deploy automático a GitHub Pages vía `.github/workflows/deploy-pages.yml` en cada push a `main`
  (o manualmente con `gh workflow run deploy-pages.yml -R adrianfdez469/inventory-analyzer-la-palma`).
- URL pública (instalable como PWA en Windows/Android desde Chrome): 
  https://adrianfdez469.github.io/inventory-analyzer-la-palma/
- `apps/pwa/vite.config.ts` lee `VITE_BASE` (env var) para el `base` de Vite — el workflow lo fija a
  `/inventory-analyzer-la-palma/`; en local sin esa var usa `/` (para `pnpm dev`/`pnpm preview`).
- `packages/core/tests/fixtures/ferreteria.xlsx` es una copia REAL del Excel del negocio (precios,
  proveedores, márgenes) — está en `.gitignore`, NUNCA se sube al repo público. Los tests que lo usan
  (`parser.test.ts`, `analytics.test.ts`) usan `describe.skipIf(!hasFixture)` así que se saltan solos
  en CI (donde el archivo no existe) y corren normal en local.
- Nota de pnpm: `pnpm-workspace.yaml` necesita `allowBuilds: { esbuild: true }` además de
  `onlyBuiltDependencies: [esbuild]` — solo lo segundo no basta en esta versión de pnpm y el install
  falla en CI con `ERR_PNPM_IGNORED_BUILDS`.

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
4. ~~Solo negocio principal~~ **SUPERADO** — ver "ACTUALIZACIÓN (2026-08-27): soporte multi-local"
   más abajo. Se sigue ignorando la hoja `Inventario` y las hojas ocultas.
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
