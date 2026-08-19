# Estrategia comercial — NarraDos vs. los juegos hechos con ella

> Complementa `docs/plataforma/00-vision-ia.md` (pipeline técnico, nombre de
> la plataforma: **NarraDos**). Este doc es sobre **cuándo y cómo vender**,
> no sobre cómo se construye el motor.

## La estrategia

**No vender la herramienta todavía.** Usarla primero para producir juegos
propios — la idea es unas **10 novelas gráficas/juegos**, rápido, gracias al
pipeline asistido por IA. Recién cuando esos juegos generen resultado propio
(**orden de USD 200.000–500.000** mencionado como referencia), evaluar vender
la plataforma como producto.

**Por qué esperar:** si el pipeline funciona tan bien como para hacer juegos
"fácil", vender la herramienta ya mismo arriesga **saturar el mercado** con
competidores usando el mismo atajo antes de sacarle provecho propio primero.
Literal: "no quiero vender las gallinas de los huevos de oro tan rápido."

## Decisión: escritorio ahora, no SaaS/login

Para producir los primeros ~10 juegos (un solo usuario: el propio equipo) no
hace falta backend, cuentas, ni facturación — el modelo actual (Electron,
100% local, keys propias en `userData`, ver `docs/plataforma/00-vision-ia.md`)
alcanza. Construir infraestructura multi-usuario **antes** de tener un cliente
sería trabajo tirado si la estrategia comercial cambia (y en este caso, el
plan es literalmente esperar antes de vender).

**Cuándo se reconsidera:** si en algún momento se decide vender la
plataforma en sí (no solo los juegos hechos con ella), ahí sí vale evaluar
un modelo con cuentas/creditos gestionados — ver la sección de migración
abajo para cuánto costaría ese cambio.

## Migración futura: escritorio → web

Evaluada para saber si "esperar" sale caro más adelante. **Conclusión: no
tanto, porque el trabajo pesado queda concentrado en un solo lugar.**

- **Se lleva casi intacto:** todo el motor de juego, el editor visual, el
  render de escenas, diálogo, menú de acción — es React/TypeScript
  corriendo en Chromium, igual adentro de Electron que en una pestaña de
  navegador. Es la parte más grande y más difícil de lo ya construido.
- **Hay que reconstruir:** la capa de persistencia. Hoy todo pasa por
  `window.api` (`shared/desktop-api.ts`) → IPC → Node escribiendo archivos
  locales (`src/games/**/*.json`, `userData` para keys/saves). Sin
  filesystem del lado del navegador, esa capa se reemplaza por llamadas
  HTTP a un backend real con base de datos/storage.
- **No es trabajo extra:** es el mismo backend que ya se necesitaría el día
  que se decida vender por suscripción con cuentas gestionadas (ver
  `00-vision-ia.md`, decisión de keys por proveedor). Esperar no duplica
  esfuerzo — el día que se construya, sirve para las dos cosas a la vez.

**Práctica a mantener desde ya (no cuesta nada extra hoy):** seguir usando
`window.api`/`DesktopApi` como la **única puerta** de lectura/escritura de
datos — ya es la convención en todo el código (`saveGame`, `saveSceneLayout`,
`readAiIntegrations`, etc.). El día de la migración, se cambia lo que hay
*detrás* de esa puerta (IPC → HTTP), no el código que la llama.

## Pendiente: API key de Claude

`AiIntegrationsPanel` (ver `00-vision-ia.md`) no tiene slot para Claude
todavía — hoy "Claude asiste la programación" significa literalmente una
sesión de Claude Code con el usuario, no una llamada en runtime del producto
final. Agregar el slot es trivial (mismo patrón que los otros 4 proveedores)
pero no tiene sentido hasta que exista una función concreta que la llame
(p. ej. un asistente in-app) — decisión ligada a si/cuándo se construye el
modelo con backend.
