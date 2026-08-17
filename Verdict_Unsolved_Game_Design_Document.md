# VERDICT: UNSOLVED — Documento base de diseño y desarrollo

**Estado:** concepto y especificación del primer prototipo  
**Versión:** 0.2  
**Plataforma inicial:** Windows / Steam  
**Tecnología propuesta:** React + TypeScript + Vite + Electron  
**Modelo comercial inicial:** juego premium, pago único, funcionamiento offline  
**Dominio principal provisional:** `verdictunsolved.com`

> Nota comercial: `VERDICT: UNSOLVED` es el nombre de trabajo seleccionado. `verdictunsolved.com` aparecía sin registro en la consulta RDAP realizada el 13 de agosto de 2026, pero el dominio no queda reservado hasta completar su compra. Antes de abrir la página de Steam también se debe realizar una búsqueda formal de marcas.

---

## 1. Resumen ejecutivo

VERDICT: UNSOLVED es un thriller de investigación digital para un solo jugador. El jugador interpreta a un investigador independiente que recibe casos de personas que no quedaron satisfechas con una investigación policial, una sentencia judicial o la respuesta de una empresa. Desde una computadora ficticia debe examinar expedientes, mensajes, fotografías, cámaras, registros de ubicación, movimientos bancarios y otros datos para reconstruir lo sucedido.

El objetivo no es simular hacking real ni enseñar programación. El hacking es una fantasía accesible que permite obtener información. La verdadera mecánica es observar, comparar, encontrar contradicciones, formular hipótesis y presentar una conclusión respaldada por evidencias.

Los contratos privados proporcionan dinero. Las investigaciones iniciadas por el protagonista proporcionan reputación. El dinero permite adquirir herramientas y la reputación desbloquea casos más delicados. Los clientes pueden estar equivocados, ocultar información o intentar utilizar al protagonista para exonerar a un culpable.

El juego debe sentirse moderno y premium sin depender de gráficos 3D costosos. Todo sucede dentro de una interfaz de computadora estilizada mediante documentos, fotografías, vídeos, mapas, aplicaciones y sonido. Los recursos visuales pueden producirse con herramientas generativas durante el desarrollo, revisarse manualmente y empaquetarse con el juego. No existe generación de IA durante la partida ni consumo de tokens por jugador.

---

## 2. Propuesta de valor

### Frase comercial

> The case was closed. The truth wasn't.

Versión en español:

> El caso fue cerrado. La verdad no.

### Pitch de una oración

Un detective digital independiente investiga asesinatos, desapariciones, robos y estafas desde su computadora, conecta pruebas y decide qué hacer con la verdad.

### Diferenciación

- **Uplink:** aporta contratos, dinero, progresión y fantasía de trabajar desde una computadora.
- **CaseCracker:** aporta búsqueda activa, lectura cuidadosa y deducción rigurosa.
- **The Operator:** aporta presentación moderna, herramientas forenses y ritmo cinematográfico.
- **Song of Farca:** aporta la fantasía de detective privada y hacker, pero VERDICT: UNSOLVED debe evitar su repetición mecánica.

La diferencia central es que otros títulos cuentan una historia de investigación digital. VERDICT: UNSOLVED busca representar una carrera como investigador digital independiente.

### Identidad de marca provisional

- **Título:** VERDICT: UNSOLVED
- **Título tipográfico:** `VERDICT: UNSOLVED`
- **Lema principal:** `The case was closed. The truth wasn't.`
- **Dominio preferido:** `verdictunsolved.com`
- **Formato de casos:** `CASE 001 — FOUR MINUTES`
- **Nombre interno del proyecto:** `verdict-unsolved`

El nombre expresa la contradicción central del juego: puede existir un veredicto oficial sin que la verdad haya sido realmente descubierta. La comunicación visual debe dar más peso a `VERDICT` y tratar `UNSOLVED` como un sello, estado de expediente o clasificación del sistema.

---

## 3. Objetivos del proyecto

### Objetivo comercial

Crear un juego indie pequeño con potencial de alcanzar aproximadamente **USD 30.000 de facturación bruta**, manteniendo bajos el coste y el tiempo de producción.

### Objetivo del primer producto

- Precio objetivo inicial: USD 7,99–9,99.
- Duración completa prevista: 3–5 horas.
- Contenido previsto: 4 casos conectados por una trama secundaria.
- Primera validación: demo gratuita con un caso de 30–45 minutos.
- Funcionamiento completamente offline.
- Sin servidores obligatorios, suscripciones, APIs de IA ni costes posteriores por jugador.

### Objetivo del prototipo

Construir solamente un caso vertical y demostrar que estas acciones resultan entretenidas:

1. Recibir un encargo.
2. Examinar fuentes de información.
3. Encontrar pistas.
4. Conectar evidencias.
5. Formular una acusación.
6. Recibir una consecuencia coherente.

---

## 4. Público objetivo

- Jugadores de puzles, misterios y deducción.
- Personas interesadas en thrillers criminales, tecnología y true crime.
- Jugadores de CaseCracker, The Operator, Cyber Manhunt, Orwell, Her Story y The Roottrees Are Dead.
- Personas que disfrutan tomando notas y descubriendo contradicciones.
- No se requieren conocimientos de informática, Linux, redes ni programación.

---

## 5. Pilares de diseño

### 5.1 Deducción antes que búsqueda exhaustiva

El jugador no debe resolver un caso pulsando todos los elementos interactivos. Encontrar información y comprenderla son acciones diferentes. Las pruebas requieren comparación y contexto.

### 5.2 El cliente no siempre tiene razón

La solicitud inicial es solamente una versión de los hechos. Un cliente puede mentir, omitir información, estar convencido de una conclusión falsa o intentar manipular al investigador.

### 5.3 Las conclusiones deben demostrarse

No basta seleccionar a un sospechoso. El jugador debe responder preguntas y aportar evidencias compatibles:

- ¿Qué ocurrió?
- ¿Quién fue responsable?
- ¿Cuál fue el motivo?
- ¿Qué evidencia sitúa al responsable en el hecho?
- ¿Qué evidencia contradice su declaración?

### 5.4 Riesgo sin azar injusto

Puede existir incertidumbre, pero la solución principal siempre debe ser deducible. No deben existir pistas imprescindibles que dependan de suerte o de probar combinaciones aleatorias.

### 5.5 Interfaz como mundo

La computadora ficticia no es un menú: es el escenario. Transiciones, notificaciones, sonido, cambios de estado y pequeñas animaciones deben crear presencia y tensión.

### 5.6 Consecuencias visibles

Una acusación incorrecta, la publicación de una prueba o la protección de una fuente deben producir cambios observables: mensajes, noticias, reputación, dinero o disponibilidad de casos.

---

## 6. Ciclo principal de juego

1. **Bandeja de entrada:** llega un contrato, noticia o pista.
2. **Evaluación:** el jugador revisa resumen, cliente, recompensa y posibles riesgos.
3. **Investigación:** consulta fuentes, busca términos, analiza dispositivos y compara datos.
4. **Tablero:** guarda evidencias y construye relaciones entre personas, lugares y acontecimientos.
5. **Hipótesis:** completa afirmaciones estructuradas y selecciona pruebas que las respaldan.
6. **Resolución:** entrega el informe, acusa, publica, oculta o conserva la evidencia.
7. **Consecuencia:** recibe dinero/reputación y observa el efecto de su decisión.
8. **Progresión:** desbloquea nuevas herramientas y casos.

---

## 7. Sistemas previstos para el juego completo

Estos sistemas definen la visión, pero **no todos pertenecen al primer prototipo**.

### 7.1 Contratos

- Los casos solicitados por clientes pagan dinero.
- El contrato establece una pregunta, no necesariamente la verdad.
- El pago puede depender de satisfacer al cliente o de entregar la conclusión verdadera.
- Algunos clientes ofrecen bonos por discreción o por recuperar información concreta.

### 7.2 Investigaciones propias

- Surgen de noticias, pistas encontradas o cabos sueltos.
- Consumen tiempo o recursos y no garantizan dinero.
- Aumentan reputación si producen resultados verificables.
- Pueden revelar conexiones entre casos aparentemente independientes.

### 7.3 Reputación

Primera versión completa sugerida:

- **Pública:** confianza de víctimas y ciudadanos.
- **Profesional:** confianza de abogados, periodistas e investigadores.
- **Clandestina:** acceso a informantes y mercados grises.
- **Integridad:** percepción de que el protagonista no fabrica ni vende pruebas.

Para el prototipo solo se implementará una cifra general de reputación.

### 7.4 Economía

El dinero permitirá adquirir herramientas, bases de datos, capacidad de análisis y mejoras de la oficina digital. Para el prototipo solo se mostrará la recompensa; no se implementará todavía una tienda completa.

### 7.5 Herramientas

- Buscador de expedientes.
- Analizador de metadatos.
- Visor de cámaras.
- Recuperación de mensajes eliminados.
- Comparador de ubicaciones y cronologías.
- Analizador de transacciones.
- Tablero de evidencias.
- Constructor de informe final.

Las herramientas son puzles ficticios y accesibles. No deben reproducir instrucciones operativas para vulnerar sistemas reales.

---

## 8. Primer caso: «Cuatro minutos»

### Premisa

Elena Vargas contrata al protagonista para investigar la muerte de su hermano Daniel Vargas. La policía concluyó que Daniel perdió el control del automóvil durante la madrugada y murió en un accidente. Elena afirma que Daniel era cuidadoso, que el informe se cerró demasiado rápido y que faltan cuatro minutos en la grabación de una cámara cercana.

### Pregunta inicial

¿La muerte de Daniel fue realmente un accidente?

### Duración objetivo

30–45 minutos para un jugador nuevo.

### Personajes

1. **Daniel Vargas — víctima.** Analista financiero. Había descubierto movimientos irregulares en su empresa.
2. **Elena Vargas — cliente y hermana.** Está convencida de que Daniel fue asesinado, pero oculta que accedió a su apartamento después de la muerte.
3. **Marcos Leiva — compañero de trabajo.** Dice que Daniel abandonó la oficina solo a las 22:10.
4. **Lucía Mora — expareja.** Recibió un mensaje de Daniel esa noche y eliminó parte de la conversación.
5. **Tomás Rivas — jefe de seguridad de la empresa.** Controlaba el sistema de cámaras y tenía acceso al vehículo corporativo.

### Verdad canónica del prototipo

Daniel descubrió una estafa interna. Tomás intentó recuperar una memoria con documentos antes de que Daniel los entregara. Lo interceptó en el estacionamiento, hubo una confrontación y alteró posteriormente registros de cámara. Daniel escapó en su automóvil, pero Tomás había dañado deliberadamente una línea del freno durante la confrontación. Marcos conocía la estafa, pero no participó en la muerte; mintió sobre la hora para ocultar que salió de la oficina con documentos de la empresa. Elena entró al apartamento y retiró el portátil de Daniel por miedo a que la policía lo confiscara, contaminando parte de la cadena de evidencia.

### Evidencias esenciales

- Informe policial con hora estimada del accidente: 22:48.
- Registro del estacionamiento: vehículo de Daniel sale a las 22:31.
- Declaración de Marcos: Daniel salió de la oficina a las 22:10.
- Cámara del ascensor: Daniel aparece a las 22:27.
- Cámara del estacionamiento: segmento 22:24–22:28 ausente.
- Registro administrativo: Tomás inició sesión en el sistema de cámaras a las 22:23.
- Mensaje recuperado de Daniel a Lucía: «Si mañana no respondo, busca la carpeta Marea».
- Transferencias que vinculan una empresa ficticia con Tomás.
- Metadatos de una fotografía de Elena que demuestran que estuvo en el apartamento después de la muerte.
- Diagnóstico mecánico: daño incompatible con desgaste normal.

### Pistas opcionales

- Una noticia antigua sobre irregularidades de la empresa.
- Un recibo que confirma dónde estaba Lucía.
- Un correo en el que Marcos expresa miedo, no intención homicida.
- Una copia parcial de la carpeta Marea.

### Conclusiones posibles

1. **Accidente:** conclusión incorrecta pero posible si el jugador ignora contradicciones.
2. **Marcos asesinó a Daniel:** conclusión plausible pero incorrecta.
3. **Tomás causó la muerte y manipuló registros:** conclusión correcta.
4. **Evidencia insuficiente:** conclusión prudente; menor recompensa y reputación neutral.

### Informe correcto mínimo

- Responsable: Tomás Rivas.
- Método: sabotaje del vehículo.
- Motivo: impedir que Daniel revelara la estafa.
- Evidencia de oportunidad: acceso de Tomás al sistema durante el segmento eliminado.
- Evidencia física: diagnóstico mecánico.
- Evidencia de motivo: transferencias y carpeta Marea.

### Giro final de la demo

Después de entregar el informe aparece un mensaje anónimo: «Daniel no fue el primero». Incluye el identificador de otro expediente cerrado, creando el gancho para el juego completo.

---

## 9. Aplicaciones del escritorio ficticio

### Para el primer prototipo

1. **Correo:** contrato, mensajes y entrega del informe.
2. **Expediente:** resumen, personajes y documentación policial.
3. **Archivos:** fotografías, PDFs ficticios y conversaciones.
4. **Base de datos:** búsqueda por nombres, matrículas, empresas o identificadores.
5. **Cámaras:** selección de cámara y línea temporal simplificada.
6. **Tablero:** guardar y relacionar evidencias.
7. **Informe:** responder preguntas y adjuntar pruebas.

### Después del prototipo

- Mercado de herramientas.
- Noticias.
- Banco y economía.
- Analizador de teléfonos.
- Mapa y cronología comparada.
- Contactos e informantes.

---

## 10. Experiencia de usuario

### Pantalla principal

- Escritorio a pantalla completa, sin marco de navegador.
- Barra lateral o dock con aplicaciones.
- Área central con ventanas internas.
- Barra superior con hora ficticia, dinero, reputación y estado del caso.
- Centro de notificaciones.

### Dirección visual

- Thriller tecnológico sobrio, no «hacker verde con lluvia de código».
- Fondos grafito o azul casi negro.
- Texto de alto contraste.
- Color de énfasis ámbar o cian.
- Fotografías realistas tratadas como evidencia.
- Animaciones breves y funcionales.
- Glitches solamente cuando tengan significado narrativo.

### Accesibilidad mínima

- Tamaño de texto configurable.
- Opción para reducir animaciones.
- Subtítulos para todo audio.
- No depender únicamente del color para comunicar estados.
- Navegación con ratón y teclado.

---

## 11. Sonido

- Música ambiental discreta durante lectura.
- Capas adicionales al encontrar contradicciones o acercarse a la resolución.
- Sonidos diferenciados para mensajes, descubrimientos y errores.
- Evitar una única pista repetida continuamente.
- Control independiente de música, efectos y voces.

---

## 12. Arquitectura técnica

### Stack

- React.
- TypeScript estricto.
- Vite.
- Electron.
- Zustand para estado.
- React Router si resulta necesario.
- Framer Motion para animaciones de UI.
- Howler.js para audio.
- Vitest para pruebas unitarias.
- Playwright para flujos críticos de interfaz.

### Restricciones técnicas

- El juego debe funcionar offline después de instalarse.
- No debe requerir base de datos remota.
- No debe enviar información personal.
- Los guardados deben almacenarse localmente.
- La lógica del caso debe estar separada de los componentes visuales.
- Los casos deben cargarse desde paquetes JSON validados.
- El código específico de Electron debe estar aislado del frontend.
- No integrar Steamworks durante el primer prototipo; preparar una interfaz adaptadora para añadirlo después.

### Estructura sugerida

```text
src/
  app/
  components/
  desktop/
  applications/
    mail/
    dossier/
    files/
    database/
    cameras/
    evidence-board/
    report/
  game-engine/
    case-loader/
    progression/
    evidence/
    deduction/
    save-system/
  cases/
    case-001-four-minutes/
      case.json
      characters.json
      evidence.json
      records.json
      conversations.json
      conclusions.json
  electron/
  assets/
  tests/
```

### Modelo mínimo de evidencia

```ts
type Evidence = {
  id: string;
  title: string;
  description: string;
  source: string;
  discovered: boolean;
  tags: string[];
  relatedEntityIds: string[];
  assetPath?: string;
};
```

### Modelo mínimo de conclusión

```ts
type ConclusionRequirement = {
  questionId: string;
  acceptedAnswerIds: string[];
  requiredEvidenceIds: string[];
};

type CaseEnding = {
  id: string;
  requirements: ConclusionRequirement[];
  rewardMoney: number;
  rewardReputation: number;
  outcomeMessage: string;
};
```

### Guardado

Para el prototipo será suficiente un archivo JSON local versionado que contenga:

- caso activo;
- evidencias descubiertas;
- aplicaciones desbloqueadas;
- relaciones creadas;
- borrador del informe;
- dinero y reputación;
- versión del esquema de guardado.

---

## 13. Uso de IA durante la producción

### Permitido

- Asistencia para escribir y refactorizar código.
- Generación de pruebas automatizadas.
- Borradores de expedientes, chats y documentos.
- Retratos de personajes ficticios.
- Fotografías de vigilancia y localizaciones ficticias.
- Logotipos de empresas inventadas.
- Apoyo en traducción, sonido y música con licencias comerciales adecuadas.

### Reglas

- No existe IA generativa durante la partida.
- Todo contenido se genera previamente, revisa y empaqueta.
- No solicitar imitaciones exactas del estilo de artistas vivos.
- No usar rostros de celebridades, marcas ni personajes protegidos.
- Conservar registro de herramienta, fecha, licencia y finalidad de cada recurso.
- Corregir artefactos y mantener coherencia visual.
- Revisar manualmente cronología, pistas y solución de cada caso.
- Declarar honestamente el contenido generado con IA en Steamworks.

---

## 14. Qué NO construir todavía

- Mundo abierto.
- Casos procedurales.
- Chat libre con personajes.
- Multijugador.
- Servidor backend.
- Aplicación móvil.
- Mercado completo.
- Cuatro reputaciones independientes.
- Árbol extenso de habilidades.
- Integración Steamworks.
- Voces para todos los diálogos.
- Editor visual de casos.
- Cuatro casos completos.

El propósito inmediato es validar una sola investigación.

---

## 15. Plan de implementación

### Fase 0 — Base técnica

- Crear React + TypeScript + Vite.
- Configurar Electron en desarrollo y producción.
- Configurar lint, formato y pruebas.
- Crear sistema de rutas/ventanas internas.
- Implementar guardado local mínimo.

### Fase 1 — Escritorio jugable

- Escritorio a pantalla completa.
- Dock de aplicaciones.
- Sistema de ventanas.
- Correo, expediente y archivos con datos de prueba.
- Estado global del juego.

### Fase 2 — Investigación

- Carga del caso desde JSON.
- Base de datos con búsqueda controlada.
- Visor de cámaras.
- Descubrimiento y marcado de evidencias.
- Tablero de relaciones.

### Fase 3 — Resolución

- Constructor de informe.
- Validación de conclusiones.
- Final correcto e incorrectos.
- Recompensa y mensaje final.

### Fase 4 — Pulido de demo

- Recursos visuales definitivos.
- Música y sonido.
- Accesibilidad.
- Pruebas con jugadores.
- Corrección de pistas ambiguas.
- Compilación de Windows.

---

## 16. Criterios de éxito del prototipo

El prototipo es satisfactorio si:

- Un jugador entiende qué hacer sin explicación externa.
- Puede terminarlo en 30–45 minutos.
- La mayoría identifica correctamente al responsable usando evidencias.
- Quienes fallan comprenden posteriormente qué interpretaron mal.
- Ninguna pista esencial requiere hacer clic indiscriminadamente.
- La interfaz se siente como un producto, no como un panel administrativo.
- La partida funciona sin conexión.
- El juego puede compilarse como ejecutable de Windows.

---

## 17. Instrucción inicial para Claude

Copiar desde aquí y entregar junto con este documento:

```text
Actúa como arquitecto y desarrollador principal de este proyecto. Lee completamente el documento antes de proponer código.

Vamos a construir únicamente la Fase 0 y una parte mínima de la Fase 1. No implementes aún el caso completo, Steamworks, economía avanzada ni sistemas no solicitados.

Objetivo de esta iteración:
1. Crear un proyecto React + TypeScript + Vite.
2. Integrarlo con Electron para desarrollo y build de Windows.
3. Crear un escritorio ficticio responsive a pantalla completa.
4. Añadir un dock con tres aplicaciones: Mail, Dossier y Files.
5. Implementar ventanas internas que puedan abrirse, enfocarse, minimizarse y cerrarse.
6. Cargar contenido de demostración desde archivos JSON locales.
7. Crear un store Zustand con dinero, reputación, caso activo y aplicaciones abiertas.
8. Incluir Vitest y pruebas para la lógica de ventanas y carga del caso.

Restricciones:
- TypeScript estricto, sin `any` salvo justificación explícita.
- Componentes pequeños y reutilizables.
- Separar lógica de juego, datos y presentación.
- No usar backend ni servicios externos.
- No llamar APIs de IA durante la ejecución.
- No inventar funcionalidades fuera del alcance.
- Antes de escribir archivos, presenta el árbol de proyecto y las decisiones técnicas importantes.
- Después de implementar, ejecuta lint, typecheck, tests y build; corrige los errores encontrados.
- Incluye instrucciones exactas para ejecutar el proyecto.

Dirección visual inicial:
- Fondo grafito/azul oscuro.
- Acento ámbar.
- Tipografía legible y moderna.
- Sensación de thriller tecnológico sobrio.
- Nada de lluvia verde de código ni estética hacker cliché.

Datos de demostración:
- Un correo de Elena Vargas solicitando investigar la muerte de Daniel Vargas.
- Un expediente policial resumido.
- Tres archivos ficticios: informe policial, registro del estacionamiento y fotografía del vehículo.

Primero confirma que entendiste el alcance y presenta el plan de implementación. No construyas fases posteriores.
```

---

## 18. Decisiones pendientes después del prototipo

- Nombre definitivo y disponibilidad comercial.
- Idioma inicial: inglés, español o ambos.
- Grado de violencia visible.
- Si el tablero permite conexiones libres o solamente relaciones válidas.
- Si una acusación incorrecta permite continuar o cierra el caso definitivamente.
- Herramienta y licencia para imágenes, música y voces generadas.
- Política de guardado y repetición de decisiones.
- Alcance final: cuatro casos o lanzamiento episódico.

---

## 19. Regla rectora

Cuando exista una decisión entre añadir contenido y profundizar la deducción, debe elegirse la deducción. El producto se venderá por hacer que el jugador se sienta inteligente, no por la cantidad de ventanas, textos o imágenes incluidas.
