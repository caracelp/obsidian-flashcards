# Prompt maestro: plugin de flashcards interactivas para Obsidian

## Rol

Actuá como desarrollador senior de plugins de Obsidian, TypeScript y UX. Implementá un plugin funcional, mantenible y documentado que transforme bloques de flashcards escritos en notas Markdown en tarjetas interactivas dentro de la vista visual de Obsidian.

**Objetivo principal:** en **Live Preview (edición visual)** y **Reading View (lectura)**, los bloques de flashcards deben aparecer como un mazo interactivo: se muestra una tarjeta por vez, se puede hacer clic para darla vuelta y avanzar o retroceder entre tarjetas. En **Source Mode (modo fuente)** debe permanecer visible y editable el Markdown original, sin reemplazos ni modificaciones automáticas.

No entregues solamente una propuesta o un mockup: implementá el código del plugin, compilalo y verificá los comportamientos descritos.

## 1. Sintaxis Markdown de entrada

El formato principal será:

```markdown
# Inducción matemática

Texto normal de la nota.

:::flashcard id=fc-001
¿Cuál es el principio de inducción matemática?
---
Si una propiedad vale en el caso base y el paso inductivo,
vale para todos los naturales del dominio considerado.
:::

:::flashcard id=fc-002
¿Qué es el caso base?
---
Es la verificación de la propiedad para el primer elemento del dominio.
:::
```

Reglas:

- `:::flashcard` inicia un bloque y `:::` lo termina.
- `id` es opcional pero recomendado; cuando existe debe servir como identificador estable.
- La primera línea delimitadora `---` dentro del bloque separa anverso y reverso; no debe interpretarse como separador YAML ni regla horizontal del documento.
- Permitir contenido Markdown multilínea en ambas caras: énfasis, listas, enlaces internos, código, imágenes y fórmulas matemáticas, siempre que Obsidian pueda renderizarlos de manera segura.
- El parser debe detectar bloques incompletos, separadores ausentes e IDs duplicados sin destruir contenido. Mostrar un aviso discreto o dejar el bloque como texto editable.
- Las flashcards pueden estar intercaladas con cualquier otro contenido de la nota.
- No reescribir automáticamente el archivo para agregar metadatos, IDs o estadísticas.

**Importante:** esta es una sintaxis personalizada, no Markdown estándar. Implementá el reconocimiento necesario sin asumir que Obsidian la soporta de forma nativa.

## 2. Experiencia de usuario

### Visualización del mazo

- Agrupar, por defecto, todas las flashcards de la nota abierta en **un mazo visual**, respetando el orden en que aparecen.
- Mostrar **una sola tarjeta a la vez**, con su anverso inicialmente visible.
- Al hacer clic en la tarjeta, alternar entre anverso y reverso, con una animación suave de volteo 3D o una transición equivalente que respete la configuración de movimiento reducido.
- Controles **Anterior** y **Siguiente**, indicador `2 / 8`, y botón opcional **Reiniciar**.
- Al pasar a otra tarjeta, mostrar inicialmente su anverso.
- Cuando no haya tarjetas, no mostrar un mazo vacío.
- Ofrecer navegación con teclado cuando el componente tenga el foco: `Enter` o `Espacio` para voltear; flechas izquierda/derecha para navegar. Evitar interferir con atajos globales y edición de texto.
- El componente debe ser accesible: foco visible, botones con etiquetas, navegación mediante teclado, contraste suficiente y soporte para lectores de pantalla.
- Debe adaptarse al ancho de la nota, al tema claro/oscuro y a dispositivos móviles, sin depender de dimensiones rígidas.
- Evitar que un clic sobre un enlace o control interno voltee accidentalmente la tarjeta.

### Comportamiento según el modo de Obsidian

1. **Reading View:** sustituir visualmente los bloques por una experiencia de mazo interactivo, sin alterar el Markdown almacenado.
2. **Live Preview:** ofrecer la misma experiencia visual en el editor, pero preservar la capacidad de editar el texto. Definir e implementar una interacción clara para editar un bloque (por ejemplo, al situar el cursor dentro del bloque o mediante una acción «Editar fuente»). No capturar pulsaciones ni bloquear la selección de texto de manera indebida.
3. **Source Mode:** mostrar exclusivamente la sintaxis original y permitir su edición normal; no imponer el mazo visual.

**Requisito técnico crítico:** no basta con un `registerMarkdownPostProcessor`, porque eso por sí solo no garantiza funcionamiento en Live Preview. Usá las APIs oficiales pertinentes de Obsidian y extensiones de CodeMirror 6 para integrar correctamente el editor visual. No dependas de clases CSS internas frágiles ni de manipulación global del DOM.

## 3. Agrupación y ubicación

Resolver explícitamente cómo se muestra un mazo único cuando las tarjetas están intercaladas con párrafos, encabezados y otros elementos:

- En el MVP, mostrar el mazo en la posición de la **primera flashcard** de la nota y ocultar visualmente las demás tarjetas ya incluidas en ese mazo, sin eliminar el contenido fuente.
- No ocultar párrafos ni otros elementos que estén entre tarjetas.
- Evitar duplicar mazos, tarjetas o controles durante cambios de modo, desplazamiento, re-renderizado o edición.
- Si la solución anterior no puede implementarse de manera fiable en Live Preview, documentar la limitación y ofrecer una alternativa explícita, como un bloque contenedor `:::flashcards ... :::`, sin afirmar que el requisito está resuelto cuando no lo está.

## 4. Arquitectura y calidad técnica

- TypeScript y estructura estándar de plugin de Obsidian (`manifest.json`, `main.ts` compilado a `main.js`, `styles.css` y archivos de configuración necesarios).
- Separar responsabilidades: parser, modelo de tarjeta, estado del mazo, renderizado, integración con Reading View, integración con Live Preview y configuración.
- Para renderizar Markdown dentro de las caras, usar las APIs de renderizado de Obsidian y gestionar correctamente el ciclo de vida de componentes, enlaces, recursos y eventos.
- Usar identificadores estables cuando existan; para tarjetas sin ID, emplear claves temporales basadas en archivo y posición, documentando sus límites al editar.
- Reaccionar a cambios del documento sin reconstrucciones innecesarias; preservar la tarjeta seleccionada y su cara cuando sea razonable, salvo que el contenido deje de existir.
- Limpiar listeners, observadores, extensiones y recursos al cerrar vistas o desactivar el plugin.
- No usar servicios externos ni telemetría. El funcionamiento básico debe ser completamente local.
- Respetar la seguridad: evitar inyección de HTML arbitrario, uso inseguro de `innerHTML` y ejecución de código procedente de las notas.
- Evitar dependencias pesadas cuando las APIs oficiales y CSS sean suficientes.

## 5. Configuración mínima

Crear una pestaña de ajustes con:

- Activar/desactivar animación de volteo.
- Activar/desactivar navegación por teclado.
- Mostrar/ocultar indicador de progreso.
- Duración de la animación (con valores razonables).

Persistir preferencias mediante las APIs de Obsidian. No implementar todavía repetición espaciada, calificaciones, estadísticas, sincronización externa ni base de datos: este plugin es, inicialmente, **un visor interactivo de flashcards existentes en Markdown**.

## 6. Criterios de aceptación

El trabajo estará completo únicamente si se verifica que:

1. Una nota con tres bloques `:::flashcard` muestra un mazo de tres tarjetas en Reading View.
2. El mazo funciona también en Live Preview, no solo en Reading View.
3. Hacer clic voltea la tarjeta; Siguiente y Anterior cambian de tarjeta y vuelven al anverso.
4. El indicador de posición se actualiza correctamente.
5. Source Mode conserva el texto original editable.
6. Las modificaciones hechas en Source Mode o Live Preview se reflejan en el mazo sin duplicaciones.
7. El texto ajeno a las flashcards permanece visible en su posición original.
8. Las tarjetas admiten Markdown básico y enlaces internos sin romper la navegación.
9. El plugin se comporta correctamente con cero, una o muchas tarjetas y con bloques mal formados.
10. La navegación por teclado es accesible y no interfiere con la edición normal.
11. Cambiar de nota, modo o tema no deja componentes duplicados ni listeners huérfanos.
12. La compilación termina sin errores y el plugin puede cargarse en una bóveda de prueba.

## 7. Entregables

1. Código fuente completo del plugin.
2. `manifest.json`, `styles.css`, configuración de compilación y `main.js` generado.
3. `README.md` con instalación manual, sintaxis, uso, limitaciones y capturas o descripción de la interfaz.
4. Una nota de ejemplo `example-flashcards.md` con al menos cinco tarjetas, contenido intercalado y casos de prueba.
5. Pruebas del parser y, cuando sea viable, pruebas de los componentes y de integración.
6. Resumen final de las decisiones técnicas, comandos de compilación, comprobaciones ejecutadas y limitaciones pendientes.

## 8. Orden de trabajo

1. Revisar las APIs actuales y documentadas de Obsidian y CodeMirror 6 necesarias para Reading View y Live Preview.
2. Definir el modelo de datos y construir el parser con pruebas.
3. Implementar el componente de mazo reutilizable, accesible y adaptable.
4. Integrarlo en Reading View.
5. Integrarlo en Live Preview preservando la edición.
6. Implementar los ajustes, estilos y limpieza del ciclo de vida.
7. Compilar, probar casos límite y corregir errores.
8. Entregar todos los archivos y explicar cualquier limitación real.

**Prioridad absoluta:** que el mazo sea verdaderamente interactivo en la vista visual de Obsidian y que el Markdown original siga siendo la fuente de verdad. No sacrificar la edición de notas para conseguir la animación.
