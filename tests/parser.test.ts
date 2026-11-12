import { describe, expect, it } from "vitest";
import { parseFlashcards, parseBlockParams } from "../src/parser";

describe("parseFlashcards", () => {
	it("parsea dos bloques con IDs y respeta el orden", () => {
		const text = `# Título

Texto normal.

:::flashcard id=fc-001
¿Pregunta uno?
---
Respuesta uno.
:::

Texto intercalado.

:::flashcard id=fc-002
¿Pregunta dos?
---
Respuesta dos.
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(issues).toHaveLength(0);
		expect(cards).toHaveLength(2);
		expect(cards[0].id).toBe("fc-001");
		expect(cards[0].front).toBe("¿Pregunta uno?");
		expect(cards[0].back).toBe("Respuesta uno.");
		expect(cards[1].id).toBe("fc-002");
		// Posiciones por línea (0-based) para ubicar el mazo y ocultar bloques.
		expect(cards[0].startLine).toBe(4);
		expect(cards[0].endLine).toBe(8);
		expect(cards[1].startLine).toBe(12);
		expect(cards[1].endLine).toBe(16);
	});

	it("acepta contenido multilínea en ambas caras", () => {
		const text = `:::flashcard
Paso 1: algo
Paso 2: otra cosa

- lista a
- lista b
---
# Encabezado del reverso

Texto con **énfasis** y [enlace interno](Otra%20nota).
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(issues).toHaveLength(0);
		expect(cards).toHaveLength(1);
		expect(cards[0].front).toBe(
			"Paso 1: algo\nPaso 2: otra cosa\n\n- lista a\n- lista b"
		);
		expect(cards[0].back).toBe(
			"# Encabezado del reverso\n\nTexto con **énfasis** y [enlace interno](Otra%20nota)."
		);
	});

	it("funciona sin ID y con parámetros con comillas", () => {
		const text = `:::flashcard id="fc 003" tag=mate
P
---
R
:::

:::flashcard
P2
---
R2
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(issues).toHaveLength(0);
		expect(cards[0].id).toBe("fc 003");
		expect(cards[1].id).toBeNull();
	});

	it("reporta bloque sin separador y deja intactas las tarjetas previas y siguientes", () => {
		const text = `:::flashcard id=a
P
---
R
:::

:::flashcard id=b
Solo anverso
:::

:::flashcard id=c
P
---
R
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(cards.map((c) => c.id)).toEqual(["a", "c"]);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe("missing-separator");
		expect(issues[0].line).toBe(6);
	});

	it("reporta bloque sin cerrar y sigue parseando después de él", () => {
		const text = `:::flashcard id=a
P
---
R
:::

:::flashcard id=mala
P
---
R

:::flashcard id=c
P
---
R
:::
`;
		const { cards, issues } = parseFlashcards(text);
		// El bloque 'mala' se corta en el próximo ':::flashcard', de modo
		// que la tarjeta 'c' no se pierde.
		expect(cards.map((c) => c.id)).toEqual(["a", "c"]);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe("unclosed-block");
	});

	it("reporta IDs duplicados sin descartar tarjetas", () => {
		const text = `:::flashcard id=dup
P1
---
R1
:::

:::flashcard id=dup
P2
---
R2
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(cards).toHaveLength(2);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe("duplicate-id");
	});

	it("ignora bloques :::flashcard dentro de cercas de código", () => {
		const text = `Antes.

\`\`\`md
:::flashcard
falso
---
positivo
:::
\`\`\`

:::flashcard id=real
P
---
R
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(issues).toHaveLength(0);
		expect(cards).toHaveLength(1);
		expect(cards[0].id).toBe("real");
	});

	it("ignora la sintaxis dentro de cercas cuando el contenido de la tarjeta las usa", () => {
		const text = `:::flashcard id=code
¿Cómo se imprime?
---
\`\`\`js
console.log("hola");
\`\`\`
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(issues).toHaveLength(0);
		expect(cards).toHaveLength(1);
		expect(cards[0].back).toBe('```js\nconsole.log("hola");\n```');
	});

	it("no encuentra tarjetas en una nota vacía o sin bloques", () => {
		expect(parseFlashcards("").cards).toHaveLength(0);
		expect(parseFlashcards("# Nota normal\n\npárrafo\n").cards).toHaveLength(0);
	});

	it("tolera CRLF", () => {
		const text = ":::flashcard id=win\r\nP\r\n---\r\nR\r\n:::\r\n";
		const { cards, issues } = parseFlashcards(text);
		expect(issues).toHaveLength(0);
		expect(cards).toHaveLength(1);
		expect(cards[0].front).toBe("P");
		expect(cards[0].back).toBe("R");
	});

	it("acepta un cierre ':::' pegado al final de una línea de contenido", () => {
		const text = `:::flashcard id=a
¿Pregunta?
---
Respuesta larga. :::

:::flashcard id=b
P2
---
R2
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(issues).toHaveLength(0);
		expect(cards).toHaveLength(2);
		expect(cards[0].back).toBe("Respuesta larga.");
		expect(cards[1].front).toBe("P2");
	});

	it("acepta un cierre pegado como primera línea del reverso", () => {
		const text = `:::flashcard id=a
¿Pregunta?
---
:::
`;
		const { cards, issues } = parseFlashcards(text);
		expect(issues).toHaveLength(0);
		expect(cards).toHaveLength(1);
		expect(cards[0].back).toBe("");
	});

	it("un separador --- dentro del anverso termina el anverso en el primero", () => {
		// Documentado: para una regla horizontal dentro del contenido usar ***.
		const text = `:::flashcard
Línea A
---
Línea B
***
Línea C
:::
`;
		const { cards } = parseFlashcards(text);
		expect(cards).toHaveLength(1);
		expect(cards[0].front).toBe("Línea A");
		expect(cards[0].back).toBe("Línea B\n***\nLínea C");
	});
});

describe("parseBlockParams", () => {
	it("extrae clave=valor con y sin comillas", () => {
		// Las claves sin '=' se ignoran (no son parámetros válidos).
		expect(parseBlockParams("id=fc-1 tag=a")).toEqual({
			id: "fc-1",
			tag: "a",
		});
		expect(parseBlockParams('id="con espacio"')).toEqual({
			id: "con espacio",
		});
	});
});
