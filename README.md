# Interactive Flashcards (Obsidian)

Plugin de Obsidian que convierte bloques de flashcards escritos en Markdown en
**mazos de tarjetas interactivas** dentro de la vista visual: una tarjeta por
vez, clic para voltear, navegación Anterior/Siguiente y navegación por teclado.

- Funciona en **Live Preview** (editor visual) y en **Reading View**.
- En **Source Mode** el Markdown original permanece intacto y editable.
- El Markdown almacenado **nunca se modifica**: es la fuente de verdad.

## Instalación manual

1. Copiá `main.js`, `manifest.json` y `styles.css` a
   `<tu-bóveda>/.obsidian/plugins/interactive-flashcards/`.
2. Activá el plugin en *Configuración → Plugins de la comunidad*
   (desactivá el modo restringido si hace falta).
3. Abrí la nota de ejemplo `example-flashcards.md` (copiala a la bóveda) y
   probá el mazo en Reading View y en Live Preview.

También podés descargar los tres archivos de la
[última release](https://github.com/caracelp/obsidian-flashcards/releases) o
instalarlo con [BRAT](https://github.com/TfTHacker/obsidian42-brat)
(`caracelp/obsidian-flashcards`).

Requiere Obsidian 1.4.0 o superior. Funciona en escritorio y móvil.

## Sintaxis

```markdown
:::flashcard id=fc-001
Anverso (Markdown multilínea)
---
Reverso (Markdown multilínea)
:::
```

- `:::flashcard` abre el bloque; `:::` lo cierra.
- `id` es opcional pero recomendado: sirve como identificador estable para
  recordar la tarjeta visible del mazo entre renders.
- La primera línea `---` separa anverso y reverso; el parser no la confunde
  con reglas horizontales ni YAML.
- Las caras admiten Markdown multilínea: énfasis, listas, enlaces internos,
  código, fórmulas, etc.
- El `id` admite comillas si necesita espacios: `id="fc mi tema"`.
- Para una regla horizontal dentro del contenido usá `***` (el primer `---`
  a nivel de línea actúa como separador).

## Uso

- **Clic en la tarjeta**: voltea entre anverso y reverso (con animación 3D si
  está activada).
- **← Anterior / Siguiente →**: cambian de tarjeta y muestran el anverso.
- **Reiniciar**: vuelve a la primera tarjeta.
- **Editar fuente** (solo Live Preview): lleva el cursor al bloque y muestra
  el Markdown original para editarlo. Situar el cursor dentro de un bloque
  también muestra su fuente automáticamente.
- **Teclado** con el mazo enfocado: `Enter` o `Espacio` voltean, flechas
  izquierda/derecha navegan. No interfiere con los atajos globales ni con la
  edición de texto.
- Los enlaces internos dentro de una tarjeta se abren al hacer clic, sin
  voltear la tarjeta.

## Ajustes

Pestaña *Interactive Flashcards* en la configuración de Obsidian:

| Ajuste | Descripción |
| --- | --- |
| Animación de volteo | Activa/desactiva el giro 3D (se desactiva sola con movimiento reducido del sistema). |
| Duración de la animación | 0–800 ms (por defecto 300). |
| Navegación por teclado | Enter/Espacio y flechas cuando el mazo tiene el foco. |
| Indicador de progreso | Muestra u oculta `2 / 8`. |

## Cómo funciona (resumen técnico)

- **Parser propio por líneas** (`src/parser.ts`): detecta bloques completos,
  ignora cercas de código y reporta bloques sin cerrar, sin separador e IDs
  duplicados sin destruir contenido. Los bloques mal formados quedan como
  texto editable.
- **Reading View** (`src/reading-view.ts`): `registerMarkdownPostProcessor`
  reemplaza el primer bloque por el mazo y oculta visualmente los bloques de
  las tarjetas posteriores, conservando todo lo demás.
- **Live Preview** (`src/live-preview.ts`): extensión de CodeMirror 6
  (`ViewPlugin` + `Decoration.replace` con widget de bloque). El primer
  bloque se reemplaza por el widget del mazo; los bloques posteriores se
  colapsan. Cuando el cursor entra en un bloque, este deja de decorarse y se
  muestra la fuente. Los rangos son atómicos (`EditorView.atomicRanges`) para
  que las flechas no se pierdan dentro del widget.
- El Markdown de las caras se renderiza con `MarkdownRenderer.render` usando
  componentes con ciclo de vida gestionado (`MarkdownRenderChild` en Reading
  View, `Component` propio en el widget).
- La tarjeta visible y su cara se preservan entre renders mediante un mapa
  clave/estado (`src/deck-state.ts`).
- Todo es local: sin servicios externos ni telemetría.

## Limitaciones conocidas

- El mazo del MVP se muestra en la **posición de la primera flashcard** de la
  nota; las demás tarjetas se ocultan visualmente aunque haya párrafos entre
  ellas. No se ocultan nunca párrafos u otros elementos ajenos.
- Si la primera tarjeta está pegada a otro texto sin línea en blanco, esa
  sección mezclada se deja como texto y el mazo no aparece: dejá siempre una
  línea en blanco entre el bloque `:::flashcard` y el resto del contenido.
- Tarjetas dentro de citas, listas o llamadas (`> :::flashcard`) no se
  detectan: la sintaxis debe ir a nivel de bloque.
- Tarjetas sin `id` usan como clave la posición por línea: si editás el
  archivo y las líneas cambian, la tarjeta recordada puede moverse. Con
  `id=`, la tarjeta recordada es estable.
- El primer `---` dentro del bloque siempre actúa como separador de caras.
- El contenido se renderiza una sola vez por tarjeta visible; no hay
  repetición espaciada, calificaciones ni estadísticas (fuera del alcance del
  MVP por diseño).

## Desarrollo

```bash
npm install      # dependencias
npm run test     # pruebas del parser (vitest)
npm run build    # typecheck + main.js de producción
npm run dev      # main.js con sourcemap inline para depurar
```

Los detalles de decisiones técnicas están en `docs/DECISIONS.md` y la
especificación original en `docs/PROMPT_PLUGIN_OBSIDIAN_FLASHCARDS.md`.
