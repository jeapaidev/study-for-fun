# Fix: Multi-Tab Session Lock

## Problema Identificado

Cuando un usuario abre dos pestañas simultáneamente y hace clic en "Estudiar" en ambas, cada pestaña ejecuta su propio timer de manera independiente, causando:

- Duplicación de tiempo de estudio
- Balance inconsistente entre pestañas
- Riesgo de corrupción de datos en localStorage

## Solución Implementada

### 1. **Sistema de Lock de Sesión Única**

Cada pestaña tiene un ID único (`TAB_ID`) generado al cargar la aplicación. Cuando un timer se inicia, se guarda el `tabId` en `localStorage` junto con los datos de la sesión activa.

### 2. **Detección de Sesión Activa en Otra Pestaña**

Función `isAnotherTabActive()`:

- Verifica si existe una sesión activa en `localStorage`
- Compara el `tabId` de la sesión guardada con el `tabId` de la pestaña actual
- Retorna `true` si hay otra pestaña con un timer activo

### 3. **Bloqueo de UI en Pestañas Secundarias**

Función `handleTabLock()`:

- Desactiva todos los botones de acción (Estudiar, Ocio, Préstamo)
- Muestra mensaje: "⚠️ Sesión activa en otra pestaña"
- Se ejecuta cada 5 segundos para verificar cambios

### 4. **Sincronización Automática con Storage Events**

Event listener `storage`:

- Escucha cambios en `localStorage` desde otras pestañas
- Cuando se detecta una nueva sesión activa, bloquea la pestaña actual
- Cuando la sesión termina, desbloquea las otras pestañas automáticamente

### 5. **Validación Antes de Iniciar Timers**

En `handleStudyClick()` y `startLeisureSession()`:

- Valida que no haya otra pestaña activa antes de iniciar
- Muestra mensaje de error si intenta iniciar con otra pestaña activa
- Solo permite iniciar si la pestaña actual es la única activa

## Archivos Modificados

### `v1/src/main.js`

- ✅ Agregado `TAB_ID` único por pestaña
- ✅ Agregado `isTabLocked` state
- ✅ Función `isAnotherTabActive()`
- ✅ Función `handleTabLock()`
- ✅ Validación en `handleStudyClick()`
- ✅ Validación en `startLeisureSession()`
- ✅ Listener de `storage` events
- ✅ Check periódico cada 5 segundos

### `v1/src/timer.js`

- ✅ Agregado parámetro `tabId` a `startStudyTimer()`
- ✅ Almacenamiento de `tabId` en `timerState`
- ✅ `saveActiveSession()` guarda el `tabId`
- ✅ `tabId` se incluye en auto-save cada minuto

### `v1/src/i18n.js`

- ✅ Agregado texto `anotherTabActive` en inglés
- ✅ Agregado texto `anotherTabActive` en español
- ✅ Agregado texto `anotherTabActive` en francés

## Comportamiento Esperado

### Escenario 1: Usuario abre segunda pestaña con timer activo

1. Usuario está estudiando en Pestaña A
2. Usuario abre Pestaña B
3. **Resultado**: Pestaña B muestra "⚠️ Sesión activa en otra pestaña"
4. Botones deshabilitados en Pestaña B

### Escenario 2: Usuario intenta iniciar timer en segunda pestaña

1. Usuario tiene timer activo en Pestaña A
2. Usuario intenta hacer clic en "Estudiar" en Pestaña B
3. **Resultado**: Mensaje de error temporal por 3 segundos
4. No se inicia segundo timer

### Escenario 3: Timer termina en pestaña activa

1. Usuario está estudiando en Pestaña A
2. Usuario detiene el timer en Pestaña A
3. **Resultado**: Pestaña B detecta el cambio automáticamente
4. Pestaña B se desbloquea y muestra botones habilitados

### Escenario 4: Usuario cierra pestaña activa

1. Usuario tiene timer activo en Pestaña A
2. Usuario cierra Pestaña A
3. **Resultado**: Sesión se guarda automáticamente
4. Pestaña B detecta que no hay sesión activa (en 5 seg máx)
5. Pestaña B se desbloquea

## Testing Manual

### Test 1: Bloqueo Básico

- [ ] Abrir pestaña 1, iniciar timer de estudio
- [ ] Abrir pestaña 2
- [ ] Verificar que pestaña 2 muestra mensaje de bloqueo
- [ ] Verificar que botones están deshabilitados en pestaña 2

### Test 2: Intento de Inicio Dual

- [ ] Abrir pestaña 1, iniciar timer de estudio
- [ ] En pestaña 2, intentar hacer clic en "Estudiar"
- [ ] Verificar mensaje de error temporal
- [ ] Verificar que no se inicia segundo timer

### Test 3: Desbloqueo Automático

- [ ] Tener timer activo en pestaña 1
- [ ] Detener timer en pestaña 1
- [ ] Esperar hasta 5 segundos
- [ ] Verificar que pestaña 2 se desbloquea automáticamente

### Test 4: Sincronización de Balance

- [ ] Iniciar estudio en pestaña 1 (1 minuto)
- [ ] Abrir pestaña 2 durante el estudio
- [ ] Detener en pestaña 1
- [ ] Verificar que balance se actualiza en pestaña 2

### Test 5: Recuperación de Sesión

- [ ] Iniciar timer en pestaña 1
- [ ] Cerrar navegador completo
- [ ] Reabrir una sola pestaña
- [ ] Verificar que sesión se recupera correctamente

## Ventajas de la Solución

✅ **Sin duplicación de datos**: Solo una pestaña puede ejecutar timer a la vez
✅ **Sincronización automática**: Cambios se reflejan en todas las pestañas
✅ **UX clara**: Mensajes explícitos sobre el estado
✅ **Desbloqueo automático**: No requiere intervención manual
✅ **Recuperación de sesión**: Funciona con el sistema existente
✅ **Zero dependencies**: Usa APIs nativas del navegador
✅ **Backward compatible**: No afecta uso de una sola pestaña

## Limitaciones

⚠️ **Delay de 5 segundos**: El check periódico puede tardar hasta 5 segundos en detectar cambios (además del evento storage que es inmediato)
⚠️ **localStorage requerido**: No funciona en modo privado o si localStorage está bloqueado
⚠️ **Mismo origen**: Solo funciona entre pestañas del mismo dominio (como es esperado)

## Próximos Pasos (Opcional)

- [ ] Agregar visual indicator más prominente cuando hay bloqueo
- [ ] Permitir "forzar" desbloqueo después de X minutos de inactividad
- [ ] Agregar notificación cuando otra pestaña termina su sesión
- [ ] Persistir TAB_ID en sessionStorage para detectar refresh vs nueva pestaña
