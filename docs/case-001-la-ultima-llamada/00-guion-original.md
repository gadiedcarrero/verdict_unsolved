# VEREDICT: UNSOLVED

## Caso 001 — La última llamada

**Tipo de documento:** guion jugable y especificación narrativa del vertical slice
**Versión:** 1.0
**Duración objetivo:** 35–50 minutos en primera partida
**Motor previsto (documento original):** Unity + Adventure Creator — *nota: reemplazado por Electron/React, ver 01-mapeo-escenas.md*
**Presentación:** aventura noir 2.5D sin desplazamiento libre; imágenes por capas, primeros planos, interfaces, sonido, viñetas y fundidos

---

## 1. Propósito del caso

Este caso debe enseñar, sin separar historia y tutorial:

- Quién aparenta ser el Director.
- La existencia de Unidad Cero y la explosión de hace tres años.
- La versión pública de que el Director quedó permanentemente en silla de ruedas.
- La oficina como centro interactivo.
- El sistema MIRROR como asistente diegético y sistema de pistas.
- Investigación de clientes y evidencias.
- Contratación de agentes.
- Compra, asignación y pérdida de equipamiento.
- Hackeo ficticio de cámaras.
- Dirección remota de agentes.
- Decisiones irreversibles y guardado automático.
- Control directo de Wraith en operaciones especiales.
- La sospecha de que todos los casos forman parte de algo mayor.

El caso debe terminar dejando tres preguntas:

1. ¿Quién utilizó un protocolo secreto de Unidad Cero para contactar al Director?
2. ¿Por qué Acheron Systems aparece conectada con la explosión?
3. ¿Quién es realmente Wraith y por qué el Director confía tanto en él?

---

## 2. Verdades secretas — solo para desarrollo

Estas verdades no se revelan en el Caso 001, pero toda escena debe ser compatible con ellas.

- El verdadero nombre del protagonista es **Adrian Cross**.
- Adrian no está paralizado. Sobrevivió a la explosión con heridas recuperables y fabricó un diagnóstico de lesión medular permanente.
- La silla de ruedas es parte de la identidad pública del **Director Gray**. Adrian explota la suposición de sus enemigos de que una persona en esa condición no puede seguir operando físicamente.
- Adrian llevaba tres años esperando una llamada realizada mediante **Protocolo Zero**. No conocía al remitente, pero sabía que alguien terminaría activándolo.
- **Director Gray** y **Wraith** son Adrian.
- Cuando Adrian opera como Wraith, **MIRROR** mantiene la presencia digital del Director: voz sintetizada, respuestas preparadas, gestión rutinaria y retransmisión de decisiones enviadas por Wraith.
- MIRROR no tiene conciencia, ambición ni autonomía narrativa. Es una herramienta leal y limitada.
- **Evelyn Marlowe**, nombre operativo **Iris**, fue compañera y pareja de Adrian en Unidad Cero. Él cree que murió. Ella sobrevivió y cree que Adrian murió.
- Iris vive bajo otra identidad y también investiga la explosión. En casos posteriores, sus operaciones parecerán hostiles.
- **Elias Voss**, instructor de The Annex, está relacionado con la traición. Su motivación exacta queda abierta para desarrollo posterior.
- La comunicación de Wraith nunca debe mostrarse como una conversación simultánea imposible entre dos humanos. MIRROR habla como el Director; Wraith responde mediante un canal cifrado que la IA retransmite.

---

## 3. Personajes del caso

### Director Gray / Adrian Cross

Antiguo jefe de Unidad Cero. Se presenta como el único superviviente conocido de la explosión y usuario permanente de silla de ruedas. Inteligente, controlado y cargado de culpa. Lleva tres años viviendo clandestinamente y realizando pequeños trabajos de información.

### MIRROR

Asistente digital creado por Adrian. Ordena datos, resume información, proporciona pistas progresivas y mantiene la identidad del Director cuando Wraith está fuera. Su voz es serena y funcional.

### Lena Hart

Cliente de 31 años. Afirma que su hermano desapareció después de investigar Acheron Systems. Está asustada, pero oculta parte de la verdad: Daniel no es periodista; trabajaba para Acheron.

### Daniel Hart

Ingeniero de seguridad de Acheron Systems. Robó un archivo denominado JANUS y preparó un contacto mediante Protocolo Zero. Se encuentra herido dentro de un edificio que Acheron vaciará antes del amanecer.

### Mara "Ghost" Vega

Infiltradora experimentada. Costosa, silenciosa y desconfiada. Reacciona mal a órdenes basadas en información incompleta.

### Noah "Patch" Mercer

Técnico electrónico brillante con poca experiencia de campo. Barato y capaz de crear accesos técnicos, pero vulnerable bajo presión.

### Isaac "Rook" Hale

Exguardia de seguridad. Resistente y disciplinado, pero poco sigiloso. Puede cargar a una persona herida sin abandonar equipo esencial.

### Wraith

Agente especial enmascarado. No figura en el mercado de contratación. Solo acepta misiones directas del Director. El jugador desconoce que es Adrian.

### Elias Voss

Instructor de vigilancia en The Annex, visto únicamente en un recuerdo. Su enseñanza sirve como tutorial de cámaras y como pista narrativa.

---

## 4. Estados persistentes

El caso debe registrar, como mínimo:

```text
SelectedAgent
AgentTrust
AgentInjured
AgentAlive
DanielAlive
JanusRecovered
ClientTruthDiscovered
AlarmLevel
EquipmentLost
WraithIdentitySuspicion
MirrorHintsUsed
CasePayment
```

No existe "misión fallida" tradicional. Toda combinación válida produce continuidad.

---

# ACTO I — LA OFICINA

## Escena 1 — Antes de la llamada

### Imagen

Pantalla negra. Lluvia intensa. Un trueno lejano. Zumbido eléctrico.

Fundido lento hacia la oficina noir. El jugador está sentado detrás del escritorio en primera persona. No existe personaje caminando. La escena principal es una ilustración por capas:

- Teléfono negro a la izquierda.
- Computadora apagada al centro.
- Lámpara, cenicero y café frío.
- Fotografía boca abajo.
- Sobre sin abrir.
- Archivadores y cajas.
- Tablero casi vacío.
- Puerta de cristal opaco.
- Tres ventanas con lluvia y neón.
- Borde parcial de una rueda visible en la zona inferior, sin subrayarlo.

### Interacciones disponibles

El teléfono no suena hasta que el jugador examine dos objetos.

#### Fotografía

Zoom mediante cámara; sonido de papel. Aparece la fotografía de Unidad Cero: Adrian, Evelyn, otros tres agentes y Voss al fondo.

Reverso:

> UNIDAD CERO — QUE NADIE QUEDE ATRÁS.

**DIRECTOR:**
Eso decíamos.

La fotografía se registra automáticamente en MIRROR.

#### Sobre

Notificación final de alquiler atrasado. La oficina será embargada en siete días.

**DIRECTOR:**
Siete días. Generoso.

Se introduce la presión económica sin tutorial explícito.

#### Cajón cerrado

**DIRECTOR:**
Ese archivo todavía no.

Contiene el expediente real de la explosión y permanece bloqueado durante el primer caso.

#### Computadora

Al encenderse:

```text
ZERO NETWORK
ESTADO: INACTIVO
AGENTES ACTIVOS: 0
FONDOS DISPONIBLES: $1,200
CASOS ABIERTOS: 0
ASISTENTE MIRROR: EN ESPERA
```

MIRROR solicita el nombre con el que los agentes se dirigirán al jugador. Por defecto: **Director**.

**MIRROR:**
Identidad de operación confirmada. Han transcurrido mil ciento cuarenta y siete días desde la última activación completa.

Opciones:

- "No esperaba volver a usarla."
- "Mantén los canales cerrados."
- "¿Alguna actividad en Protocolo Zero?"

Si se elige la tercera:

**MIRROR:**
Ninguna. Continúo vigilando.

#### Teléfono antes de sonar

El jugador levanta el auricular. Solo hay línea.

**DIRECTOR:**
Nadie llama a este número desde hace tres años.

### Activación

Después de dos interacciones, el teléfono suena violentamente. La lámpara parpadea.

El jugador puede:

- Contestar.
- Dejarlo sonar.
- Pedir a MIRROR que rastree.

Si se deja sonar, vuelve a llamar después de doce segundos. En el tercer intento MIRROR interviene:

**MIRROR:**
La llamada utiliza Protocolo Zero.

El Director deja de fingir indiferencia.

---

## Escena 2 — La última llamada

### Conversación

**LENA:**
¿Estoy hablando con Zero?

Opciones:

- "Ese nombre ya no existe."
- "¿Quién le dio este número?"
- "Depende de quién pregunte."
- Colgar.

Si se cuelga, Lena vuelve a llamar y dice:

**LENA:**
Daniel dijo que haría eso. Dijo que mencionara Acheron.

La palabra provoca un breve ruido grave. No hay flashback completo.

Lena explica:

- Daniel desapareció hace cuarenta y ocho horas.
- La policía considera que se marchó voluntariamente.
- Ella recibió un mensaje programado: "Si vienen por mí, busca a Zero".
- Daniel dejó algo en el edificio Halcyon, programado para ser vaciado a las 05:00.
- Paga $800 por recuperar el objeto y $400 adicionales por encontrar a Daniel.
- Ofrece $300 de adelanto.

El jugador puede preguntar por la profesión de Daniel. Lena responde que era periodista independiente. Esa afirmación es falsa.

**LENA:**
Necesito que entre usted.

La cámara baja lentamente hacia la rueda visible y las piernas inmóviles. Una sola ilustración, sin animación corporal.

**DIRECTOR:**
Yo ya no entro en edificios. Me aseguro de que los demás salgan.

El jugador acepta o rechaza. Si rechaza, MIRROR informa que el pago del alquiler vence en siete días y que Protocolo Zero solo era conocido por seis personas. La llamada puede retomarse. El caso debe continuar, pero el rechazo queda registrado como tono de personalidad.

### Guardado irreversible

Al aceptar:

```text
CASO 001 REGISTRADO
LA ÚLTIMA LLAMADA
GUARDADO CONTINUO ACTIVADO
LAS DECISIONES NO PUEDEN DESHACERSE
```

---

# ACTO II — INVESTIGAR ANTES DE ARRIESGAR

## Escena 3 — Verificar al cliente

MIRROR abre cuatro áreas:

- Perfil de Lena.
- Mensaje de Daniel.
- Registros del edificio Halcyon.
- Base de datos de Acheron.

### Objetivo

Descubrir al menos una contradicción antes de contratar.

### Evidencias

1. Lena y Daniel son hermanos; confirmado.
2. Daniel no figura como periodista.
3. Daniel fue ingeniero de seguridad de Acheron hasta tres días antes.
4. El edificio Halcyon pertenece a una filial de Acheron.
5. El mensaje contiene una firma cifrada idéntica a Protocolo Zero.

### MIRROR como ayuda

Si el jugador se traba:

**Pista 1:**
La relación familiar es auténtica. La profesión declarada todavía no.

**Pista 2:**
Busque a Daniel como empleado, no como periodista.

**Solución:**
Daniel trabajaba para Acheron Systems. Lena ocultó esa información.

El jugador puede confrontar a Lena.

**LENA:**
Daniel dijo que si mencionaba Acheron antes de que usted aceptara, colgaría. No sabía en quién confiar.

Opciones:

- "Una mentira más y termino el contrato."
- "Hizo bien en desconfiar."
- "Su hermano conocía demasiado sobre mí."

`ClientTruthDiscovered = true` si se encuentra la contradicción antes de la operación. Esto dará una ventaja posterior.

---

## Escena 4 — Contratar al primer agente

MIRROR abre el mercado clandestino. Se muestran tres candidatos mediante retratos y expedientes. No caminan ni visitan físicamente la oficina.

### Ghost

```text
COSTO: $450
INFILTRACIÓN: ALTA
TÉCNICA: MEDIA
RESISTENCIA: BAJA
CONFIANZA INICIAL: BAJA
```

Ventaja: reduce detección y puede esconderse durante el tutorial real.
Desventaja: no puede cargar simultáneamente a Daniel y todo el equipo.

### Patch

```text
COSTO: $300
INFILTRACIÓN: BAJA
TÉCNICA: ALTA
RESISTENCIA: BAJA
CONFIANZA INICIAL: MEDIA
```

Ventaja: instala un puente físico que simplifica el hackeo interior.
Desventaja: puede entrar en pánico durante el cierre de seguridad.

### Rook

```text
COSTO: $375
INFILTRACIÓN: BAJA
TÉCNICA: BAJA
RESISTENCIA: ALTA
CONFIANZA INICIAL: MEDIA
```

Ventaja: puede rescatar a Daniel sin abandonar equipo.
Desventaja: genera más ruido y aumenta la probabilidad de patrulla.

El jugador entrevista mediante llamada a los tres o contrata directamente. MIRROR puede resumir:

> Ghost es la opción segura para entrar. Patch es la opción eficiente para los sistemas. Rook es la opción segura si esperamos resistencia física.

No existe opción perfecta.

---

## Escena 5 — Equipamiento

Presupuesto restante después de contratación. Tienda inicial:

| Equipo | Precio | Función | Riesgo al perderlo |
|---|---:|---|---:|
| Cámara corporal | $120 | Transmisión visual | Medio |
| Teléfono cifrado | $90 | Comunicación segura | Alto: compromete contactos |
| Inyector de red | $160 | Acceso a cámaras internas | Alto |
| Kit médico | $100 | Estabiliza heridas | Medio |
| Chaleco ligero | $140 | Reduce lesión grave | Medio |
| Ganzúa electrónica | $110 | Abre accesos | Medio |

El jugador no puede comprar todo. Debe asignar un loadout.

MIRROR advierte una sola vez:

> El equipo permanece con el agente. Si no regresa o es capturado, debemos considerarlo perdido.

La decisión queda guardada al confirmar.

---

# ACTO III — LA LECCIÓN DE LAS CÁMARAS

## Escena 6 — Llegada al Halcyon

Imagen fija exterior: edificio viejo bajo la lluvia. El agente envía una fotografía.

**AGENTE:**
Estoy en posición. Dos cámaras cubren la entrada. Necesito una ventana.

El Director abre el módulo EYE. Un sonido específico activa un recuerdo.

---

## Escena 7 — Recuerdo: The Annex

Se oyen pasos sobre un pasillo. Son los pasos de Adrian cuando podía caminar según la versión que conoce el jugador.

Viñeta: Adrian joven, de pie frente a una puerta.

```text
THE ANNEX
PROMOCIÓN 17
ENTRENAMIENTO DE VIGILANCIA
```

Fundido hacia un terminal. Elias Voss aparece tras un cristal.

**VOSS:**
Una puerta cerrada detiene a un intruso. Una cámara identifica a todos los que vinieron con él. ¿Cuál neutraliza primero?

Opciones:

- La puerta.
- La cámara.
- La alarma.
- "Depende de quién esté mirando."

Voss reacciona de forma distinta, pero el tutorial continúa.

### Tutorial EYE

#### Fase 1 — Detectar

Escanear señales y seleccionar la transmisión correspondiente a la cámara exterior mediante hora, orientación y elementos visibles.

#### Fase 2 — Enrutar

Construir una ruta ficticia:

```text
ORIGEN → REPETIDOR → PANEL → CÁMARA
```

No se utilizan instrucciones reales de intrusión.

#### Fase 3 — Sincronizar

Rompecabezas visual: alinear tres fragmentos de señal. Los errores reinician sin consecuencia porque es un recuerdo de entrenamiento.

#### Fase 4 — Elegir intervención

- Apagar: fácil, evidente.
- Desviar: temporal.
- Crear bucle: más seguro.

El tutorial exige crear un bucle seleccionando un tramo sin personas ni cambios bruscos de luz.

**VOSS:**
En una simulación puede repetir. En el campo, si se equivoca, alguien no vuelve a casa.

La frase se mezcla con la voz actual del agente.

**AGENTE:**
Director… ¿sigue ahí?

**DIRECTOR:**
Sí. Solo recordaba una lección.

---

## Escena 8 — Primera cámara real

El jugador repite el proceso sobre la cámara exterior. Esta vez existe un medidor de detección, pero el agente está oculto y no puede morir durante esta primera prueba.

Al completar:

**DIRECTOR:**
Tiene cuarenta y cinco segundos. Entre.

Sonido de puerta. Cambio a imagen interior.

---

# ACTO IV — LO QUE LENA OCULTÓ

## Escena 9 — La cámara que no estaba en los planos

El agente encuentra una cámara interior nueva. Ahora sí existe riesgo.

Opciones:

- Ordenar que se oculte y hackear.
- Usar el inyector de red, si fue comprado.
- Apagar el circuito completo.
- Cruzar rápidamente.

Consecuencias dependen del agente y equipo.

- Ghost puede esconderse sin aumentar alerta.
- Patch reduce la dificultad con el inyector.
- Rook puede destruir físicamente la cámara, elevando la alerta.

Si la alerta supera el límite, se activa una patrulla antes de tiempo.

---

## Escena 10 — El despacho 2B

El agente encuentra:

- Una unidad de almacenamiento marcada JANUS.
- Sangre reciente.
- Un teléfono roto.
- Una fotografía antigua de Unidad Cero tomada en The Annex.
- Daniel herido detrás de una división falsa.

Daniel está consciente apenas unos segundos.

**DANIEL:**
No fue una explosión… fue una selección.

Antes de poder explicar, pierde el conocimiento.

MIRROR detecta movimiento: un equipo de Acheron entra al edificio. Cierre de seguridad en tres minutos.

### Decisión irreversible principal

El agente no puede garantizar recuperar a Daniel, JANUS y todo su equipamiento sin ayuda.

Opciones iniciales:

1. Priorizar a Daniel.
2. Priorizar JANUS.
3. Intentar ambos.
4. Ocultar a Daniel y volver después.
5. Solicitar extracción especial.

La quinta opción activa a Wraith, pero requiere sacrificar parte del pago y revela al jugador que el Director posee un recurso secreto.

Si el jugador investigó la mentira de Lena, sabe que Daniel diseñó el sistema y obtiene una ruta de servicio adicional.

---

# ACTO V — WRAITH

## Escena 11 — Activación

Si se solicita extracción especial, o si el agente queda atrapado, el Director observa un expediente sin fotografía:

```text
AGENTE: WRAITH
ESTADO: DISPONIBLE
COSTO: NO REGISTRADO
AUTORIZACIÓN: DIRECTOR
```

**AGENTE CONTRATADO:**
¿Quién demonios es Wraith?

**DIRECTOR:**
La razón por la que todavía puedo prometer que alguien saldrá.

Fundido a negro.

El jugador ve por primera vez el terreno desde la perspectiva de Wraith. Es una sucesión de escenarios estáticos en primera persona, no un personaje caminando.

En el auricular se escucha la voz del Director. En realidad es MIRROR.

**DIRECTOR/MIRROR:**
Enlace confirmado. La ruta preparada permanece válida durante noventa segundos.

El jugador controla a Wraith:

- Selecciona accesos.
- Usa equipamiento.
- Elige rutas.
- Neutraliza sistemas.
- Encuentra al agente y a Daniel.

### Pistas discretas

- La etiqueta dice "ENLACE SEGURO", nunca "TRANSMISIÓN EN VIVO".
- La voz del Director no respira.
- El ruido de lluvia de la oficina se repite en un bucle perfecto.
- Wraith conoce la ubicación de un interruptor que no aparece en los planos.
- MIRROR utiliza una frase de Voss exactamente como se escuchó en el recuerdo.

Ninguna pista debe ser subrayada.

---

## Escena 12 — Extracción

Wraith llega al despacho. El agente contratado sostiene a Daniel o JANUS según la decisión previa.

El jugador debe repartir cargas:

- Wraith puede cargar a Daniel.
- El agente puede llevar JANUS.
- El equipo pesado puede abandonarse.
- Un agente herido reduce opciones.

Si el jugador no compró comunicación cifrada, Acheron intercepta parte de la extracción.

### Elección final de ruta

#### Túnel de servicio

Más seguro si se descubrió la verdad sobre Daniel. Mantiene a todos vivos, pero parte del equipo queda atrás.

#### Vestíbulo

Más corto. Requiere superar una cámara y puede causar lesión o captura.

#### Azotea

Permite conservar JANUS, pero Daniel puede morir si no existe kit médico.

#### Separarse

Wraith atrae a Acheron y el agente evacua. Protege al agente, pero eleva la sospecha sobre Wraith.

No existe temporizador falso. Si el juego presenta cuenta regresiva, debe corresponder a estados reales.

---

# ACTO VI — CONSECUENCIAS

## Escena 13 — Regreso a la oficina

Fundido. Volvemos a la vista original. El Director está nuevamente detrás del escritorio. No se muestra cómo llegó ni cómo se sentó.

MIRROR presenta un informe, pero nunca atribuye decisiones a sí misma.

### Variantes

#### Daniel y JANUS recuperados

Lena paga $1,200. Daniel queda hospitalizado bajo identidad falsa. Antes de perder la conciencia, entrega una clave:

```text
JANUS / FASE 0 / VOSS
```

#### Daniel vivo, JANUS perdido

Lena paga $800. Daniel promete reconstruir parte del archivo cuando despierte. Acheron conserva ventaja.

#### JANUS recuperado, Daniel muerto

Lena paga solo el adelanto y culpa al Director. JANUS contiene información, pero parte está cifrada con una clave biométrica de Daniel.

#### Agente muerto o capturado

No aparece pantalla de fracaso. Su retrato cambia de estado. El equipo asignado se marca como perdido. Los candidatos restantes preguntarán en futuras entrevistas qué ocurrió.

#### Wraith no utilizado

El jugador puede completar el caso con una combinación excepcional de investigación, agente y equipo. Wraith aparece de todos modos en la escena posterior, preparando una investigación privada sobre Acheron.

---

## Escena 14 — La fotografía

MIRROR compara la fotografía encontrada en el Halcyon con la foto de la oficina.

**MIRROR:**
Coincidencia visual confirmada. Esta copia fue producida después de la fecha oficial de destrucción de Unidad Cero.

**DIRECTOR:**
Entonces alguien conservó los archivos.

**MIRROR:**
O alguien de la fotografía continúa vivo.

La cámara se acerca lentamente al rostro de Evelyn. No se revela su supervivencia.

En el borde de la foto existe una figura desenfocada que puede ser Voss.

---

## Escena 15 — Cierre secreto

Después de terminar el informe, el jugador puede cerrar el caso. La oficina queda en silencio.

El Director activa un canal privado.

```text
PROTOCOLO MIRROR
PRESENCIA DEL DIRECTOR: ACTIVA
RESPONDER LLAMADAS: SÍ
AUTORIZAR DECISIONES: NO
CANAL WRAITH: CIFRADO
```

**DIRECTOR:**
MIRROR, mantén la oficina despierta.

**MIRROR:**
Presencia preparada.

Fundido a negro.

Se oye una hebilla, tela y un compartimento metálico. No se muestra al protagonista levantándose.

Nueva viñeta: una figura enmascarada bajo la lluvia, vista de espaldas.

```text
AGENTE WRAITH
OBJETIVO: ORIGEN DE LA LLAMADA
```

El jugador interpreta que el Director acaba de enviar a Wraith. La verdad permanece oculta.

---

# 5. Sistema de ayuda de MIRROR

MIRROR debe tener pistas manuales para cada objetivo. Nunca genera soluciones mediante una API.

Cada acertijo dispone de:

1. **Resumen:** recuerda hechos conocidos.
2. **Orientación:** indica una relación o herramienta.
3. **Pista fuerte:** reduce el espacio de búsqueda.
4. **Solución:** explica la acción exacta.

Pedir pistas no cambia la historia. Delegar decisiones no existe en el Caso 001.

Toda pista sonora importante debe tener:

- Subtítulo descriptivo opcional.
- Registro reproducible.
- Representación visual.
- Anotación de MIRROR.

---

# 6. Reglas de presentación y alcance

## No requiere

- Personajes caminando.
- Animación esquelética.
- Escenario 3D.
- IA generativa durante la partida.
- Movimiento libre.
- Sincronización labial compleja.

## Requiere

- Una oficina maestra dividida por capas.
- Primeros planos de objetos.
- Retratos con dos o tres expresiones.
- Viñetas noir.
- Escenarios estáticos en primera persona para Wraith.
- Interfaces de investigación y cámaras.
- Zoom, parallax, fundidos, lluvia, humo y luces.
- Voces, ambiente y diseño sonoro.

---

# 7. Lista inicial de recursos

## Fondos

1. Oficina principal, noche lluviosa.
2. The Annex, pasillo.
3. The Annex, terminal de vigilancia.
4. Halcyon exterior.
5. Halcyon pasillo.
6. Despacho 2B.
7. Túnel de servicio.
8. Vestíbulo.
9. Azotea.

## Personajes

- Director: solo fragmentos, fotografías y silueta.
- Lena: 3 expresiones.
- Ghost: 3 expresiones.
- Patch: 3 expresiones.
- Rook: 3 expresiones.
- Daniel: consciente e inconsciente.
- Voss: instructor.
- Wraith: silueta y manos enguantadas.
- Evelyn/Iris: fotografía de Unidad Cero.

## Interfaces

- ZERO NETWORK.
- MIRROR.
- Mercado de agentes.
- Tienda y loadout.
- Módulo EYE.
- Cámara corporal.
- Registro de evidencias.
- Informe de consecuencias.

## Audio

- Lluvia y neón.
- Teléfono.
- Voces completas.
- Pasos del recuerdo.
- Rueda sutil en la oficina.
- Puertas, alarmas y cámaras.
- Respiración de agentes.
- Ausencia intencional de respiración en MIRROR.

---

# 8. Criterio de éxito del vertical slice

El caso funciona si al terminar el jugador:

- Comprende el ciclo investigar–contratar–equipar–dirigir–asumir consecuencias.
- Siente responsabilidad por el agente.
- Puede explicar cómo hackear una cámara dentro de las reglas ficticias.
- Desea saber quién provocó la explosión.
- Cree que el Director está permanentemente en silla de ruedas.
- Percibe a Wraith como un agente distinto.
- Entiende a MIRROR como asistente útil y natural.
- Quiere jugar el Caso 002.

La revelación de que el Director puede caminar debe permanecer completamente intacta.
