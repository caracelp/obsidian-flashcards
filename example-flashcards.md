# Inducción matemática

Texto normal de la nota, que convive con las flashcards sin problemas.

:::flashcard id=fc-001
¿Cuál es el principio de inducción matemática?
---
Si una propiedad vale en el caso base y el paso inductivo,
vale para todos los naturales del dominio considerado.
:::

Un párrafo entre tarjetas: **permanece visible** en su posición original,
tanto en Reading View como en Live Preview.

:::flashcard id=fc-002
¿Qué es el *caso base*?
---
Es la verificación de la propiedad para el primer elemento del dominio
(usualmente $n = 0$ o $n = 1$).
:::

## Contenido multilínea

:::flashcard id=fc-003
¿Qué pasos tiene la prueba de la desigualdad de Bernoulli?

1. Verificar el caso base.
2. Asumir el paso inductivo.
3. Concluir el paso $n+1$.
---
La **desigualdad de Bernoulli** afirma que $(1+x)^n \geq 1 + nx$ para
$x \geq -1$.

```js
// También se admiten bloques de código en el reverso
const n = 5;
console.log((1 + 1) ** n >= 1 + n);
```
:::

Otro párrafo normal, también visible entre el mazo y el resto del contenido.

:::flashcard
Tarjeta **sin ID**: funciona igual, pero se recomienda siempre declarar uno.
El anverso es esta pregunta, y el reverso es…
---
…esta respuesta, con un enlace interno a [[Fundamentos de la inducción]].
:::

## Bloques mal formados (casos de prueba)

Este bloque no tiene separador `---`: el plugin lo reporta y lo deja como
texto editable, sin romper el mazo.

:::flashcard id=fc-incompleta
¿Bloque sin separador?
:::

Este otro no tiene cierre `:::`: también queda como texto editable.

:::flashcard id=fc-sin-cierre
¿Bloque sin cerrar?
---
Su contenido no llega nunca al final.
