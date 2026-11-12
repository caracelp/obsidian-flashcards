# Decisiones técnicas y verificación

Resumen del trabajo según el orden pedido en
`PROMPT_PLUGIN_OBSIDIAN_FLASHCARDS.md`.

## 1. APIs usadas

- **Reading View**: `registerMarkdownPostProcessor` +
  `MarkdownPostProcessorContext.getSectionInfo(el)` para mapear el elemento
  renderizado a sus líneas fuente y decidir si es el mazo (primer bloque) o
  una tarjeta posterior (se oculta vaciando el elemento, sin borrar texto).
- **Live Preview**: extensión de CodeMirror 6 registrada con
  `registerEditorExtension`: `ViewPlugin.fromClass` que emite
  `Decoration.replace({ block: true, widget })` para el primer bloque y
  `Decoration.replace({ block: true })` (colapso) para los posteriores.
  `EditorView.atomicRanges` evita que el cursor "entre" al widget con las
  flechas. Se comprueba `editorLivePreviewField` para no decorar en
  Source Mode, y `editorInfoField` para conocer la nota abierta.
- **Render de Markdown en caras**: `MarkdownRenderer.render` con un
  componente vivo: `MarkdownRenderChild` (post-procesador) o `Component`
  (widget). El widget destruye el componente y el mazo en `destroy()`.
- Los símbolos de CodeMirror se importan de `@codemirror/view` y
  `@codemirror/state`, que están en `external` de esbuild (Obsidian los
  provee en runtime).

## 2. Agrupación y ubicación del mazo único

MVP implementado como se especifica: el mazo se muestra en la posición de la
**primera flashcard**; los bloques de las tarjetas posteriores se ocultan
visualmente (en Reading View los elementos renderizados de cualquier sección
cuyas líneas caen dentro de bloques de flashcard reciben `display: none`,
incluidos los fragmentos en que Obsidian divide el bloque al renderizarlo; en
Live Preview se colapsa el rango). Los párrafos y encabezados entre tarjetas se
dejan intactos: solo se tocan secciones cuyas líneas fuente caen íntegramente
dentro de bloques de flashcards.

Regla anti-duplicados: el post-procesador solo construye el mazo en la
sección que contiene la línea de apertura de la primera tarjeta; las demás
secciones cubiertas por tarjetas se vacían. En Live Preview, los widgets se
reutilizan si su contenido serializado no cambió (`WidgetType.eq`), y el
estado del mazo (tarjeta visible y cara) se guarda por `<ruta>#<id | línea>`
para sobrevivir a re-renders, cambios de modo y de nota.

Límite documentado: si la primera tarjeta está pegada a otro texto sin línea
en blanco, la sección queda "mezclada" y se deja como texto sin mazo. Si el
plugin no pudiera comportarse de forma fiable en alguna bóveda, la
alternativa (bloque contenedor `:::flashcards ... :::`) está prevista en el
diseño del parser pero no implementada.

## 3. Interacción de edición en Live Preview

Dos caminos equivalentes:

1. Situar el cursor dentro de un bloque: la superposición selección/rango
   hace que ese bloque deje de decorarse y muestre su Markdown.
2. Botón **Editar fuente** del mazo: hace `view.dispatch` moviendo el cursor
   al inicio del bloque, lo que produce el mismo efecto.

`ignoreEvent()` del widget devuelve `true` para que clics y teclas del mazo
no los capture el editor; los rangos atómicos evitan navegación errante.

## 4. Accesibilidad y temas

- `role="region"` con etiqueta del mazo, `role="group"` en la tarjeta,
  botones con `aria-label`, indicador `aria-live="polite"`, caras con
  `aria-hidden` dinámico.
- Foco visible (`:focus-visible` con variables de Obsidian).
- Animación respetando `prefers-reduced-motion` y el ajuste del plugin.
- Estilos con variables CSS de Obsidian (tema claro/oscuro) y layout fluido
  para móvil.

## 5. Seguridad

No se usa `innerHTML` ni se ejecuta contenido de notas: todo el Markdown se
renderiza con las APIs oficiales (`MarkdownRenderer.render`), que aplican el
mismo saneamiento que Obsidian.

## 6. Comandos y comprobaciones ejecutadas

```bash
npm run test     # vitest: 12 pruebas del parser, todas en verde
npm run typecheck # tsc --noEmit, sin errores
npm run build    # esbuild producción -> main.js (12.5 kb), sin errores
```

Verificación manual pendiente (requiere una bóveda real de Obsidian):

1. Copiar `main.js`, `manifest.json`, `styles.css` a
   `.obsidian/plugins/interactive-flashcards/`.
2. Abrir `example-flashcards.md` y validar los 12 criterios de aceptación del
   prompt: mazo de 3+ tarjetas en Reading View, mismo mazo en Live Preview,
   volteo con clic, navegación con reverso automático, indicador `2 / 8`,
   Source Mode intacto, ediciones reflejadas sin duplicados, texto ajeno
   visible, Markdown e enlaces internos, cero/una/muchas tarjetas, bloques
   mal formados como texto, teclado accesible y sin listeners huérfanos.

## 7. Limitaciones pendientes

- Las listadas en el README (sintaxis a nivel de bloque, primera tarjeta
  pegada a texto, tarjetas sin `id` con claves por línea).
- El ajuste "Indicador de progreso" se aplica al instante a los mazos
  existentes; el resto de los ajustes (duración, animación, teclado) se leen
  en vivo. Cambios de contenido requieren el re-render normal de Obsidian.
- No hay pruebas de integración automatizadas del widget de CodeMirror ni
  del post-procesador (requieren el runtime de Obsidian); las pruebas cubren
  el parser, que es la lógica con reglas propias.
