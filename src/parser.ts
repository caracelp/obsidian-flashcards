/**
 * Parser de bloques `:::flashcard` en contenido Markdown.
 *
 * La sintaxis es personalizada (no Markdown estándar), por lo que el
 * reconocimiento se hace por líneas:
 *
 *   :::flashcard id=fc-001
 *   anverso (Markdown multilínea)
 *   ---
 *   reverso (Markdown multilínea)
 *   :::
 *
 * El parser nunca modifica el texto: solo describe dónde están los bloques
 * y qué contienen. Los bloques mal formados se reportan como issues y no se
 * convierten en tarjetas, de modo que quedan como texto editable.
 */

export interface CardSource {
	/** Identificador estable declarado en `id=...`, si existe. */
	id: string | null;
	/** Contenido del anverso (antes del separador `---`), sin recortar. */
	front: string;
	/** Contenido del reverso (después del separador `---`), sin recortar. */
	back: string;
	/** Línea (0-based) donde empieza la cerca de apertura `:::flashcard`. */
	startLine: number;
	/** Línea (0-based) de la cerca de cierre `:::`. */
	endLine: number;
}

export type IssueCode =
	| "unclosed-block"
	| "missing-separator"
	| "duplicate-id";

export interface ParseIssue {
	code: IssueCode;
	/** Línea (0-based) donde se detectó el problema. */
	line: number;
	id?: string;
	message: string;
}

export interface ParseResult {
	cards: CardSource[];
	issues: ParseIssue[];
}

const OPEN_RE = /^\s*:::flashcard\b(.*)$/;
const CLOSE_RE = /^\s*:::\s*$/;
const SEPARATOR_RE = /^\s*---\s*$/;
/** Cierre `:::` pegado al final de una línea de contenido ("texto :::"). */
const TRAILING_CLOSE_RE = /^(.*\S)\s+:::\s*$/;
const FENCE_RE = /^\s{0,3}(```+|~~~+)/;
const PARAM_RE = /([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s:]+))/g;

/** Extrae los parámetros `clave=valor` de la línea de apertura. */
export function parseBlockParams(rest: string): Record<string, string> {
	const params: Record<string, string> = {};
	let match: RegExpExecArray | null;
	PARAM_RE.lastIndex = 0;
	while ((match = PARAM_RE.exec(rest)) !== null) {
		const key = match[1];
		const value = match[2] ?? match[3] ?? match[4] ?? "";
		params[key] = value;
	}
	return params;
}

/**
 * Parsea todo el texto de una nota y devuelve las tarjetas completas más
 * los problemas detectados (bloques sin cerrar, sin separador o con IDs
 * duplicados). Los bloques dentro de cercas de código (``` / ~~~) se ignoran.
 */
export function parseFlashcards(text: string): ParseResult {
	const lines = text.split(/\r?\n/);
	const cards: CardSource[] = [];
	const issues: ParseIssue[] = [];

	let i = 0;
	while (i < lines.length) {
		// Saltar cercas de código: dentro de ellas la sintaxis es texto plano.
		const fence = lines[i].match(FENCE_RE);
		if (fence) {
			const marker = fence[1][0];
			const markerLen = fence[1].length;
			i++;
			while (i < lines.length) {
				const closing = lines[i].match(FENCE_RE);
				if (
					closing &&
					closing[1][0] === marker &&
					closing[1].length >= markerLen
				) {
					i++;
					break;
				}
				i++;
			}
			continue;
		}

		const open = lines[i].match(OPEN_RE);
		if (!open) {
			i++;
			continue;
		}

		const startLine = i;
		const params = parseBlockParams(open[1] ?? "");
		const id = params.id ?? null;

		// Buscar cierre y separador dentro del bloque.
		let closeLine = -1;
		let separatorLine = -1;
		let nextOpenLine = -1;
		// Cierre pegado al final de una línea de contenido: "texto :::"
		// (error común al escribir). Se acepta y el texto previo queda
		// como parte de la cara correspondiente.
		let closePartialLine: string | null = null;
		let j = startLine + 1;
		while (j < lines.length) {
			const line = lines[j];
			if (line.match(FENCE_RE)) {
				// Una cerca de código dentro del contenido no debe confundir
				// al bloque; saltarla completa.
				const inner = line.match(FENCE_RE)!;
				const marker = inner[1][0];
				const markerLen = inner[1].length;
				j++;
				while (j < lines.length) {
					const innerClose = lines[j].match(FENCE_RE);
					if (
						innerClose &&
						innerClose[1][0] === marker &&
						innerClose[1].length >= markerLen
					) {
						j++;
						break;
					}
					j++;
				}
				continue;
			}
			if (separatorLine === -1 && SEPARATOR_RE.test(line)) {
				separatorLine = j;
			} else if (CLOSE_RE.test(line)) {
				closeLine = j;
				break;
			} else if (OPEN_RE.test(line)) {
				// Otro :::flashcard antes del cierre: el bloque actual está
				// sin cerrar y no debe tragarse el siguiente.
				nextOpenLine = j;
				break;
			} else {
				const trailingClose = line.match(TRAILING_CLOSE_RE);
				if (trailingClose) {
					closeLine = j;
					closePartialLine = trailingClose[1];
					break;
				}
			}
			j++;
		}

		if (closeLine === -1) {
			issues.push({
				code: "unclosed-block",
				line: startLine,
				id: id ?? undefined,
				message:
					"Bloque :::flashcard sin cierre ':::': queda como texto editable.",
			});
			// El bloque sin cerrar no consume el resto de la nota: se corta
			// en el próximo bloque para no perder tarjetas posteriores.
			i = nextOpenLine === -1 ? lines.length : nextOpenLine;
			continue;
		}

		if (separatorLine === -1) {
			issues.push({
				code: "missing-separator",
				line: startLine,
				id: id ?? undefined,
				message:
					"Bloque :::flashcard sin separador '---' entre anverso y reverso: queda como texto editable.",
			});
			i = closeLine + 1;
			continue;
		}

		const backLines = lines.slice(separatorLine + 1, closeLine);
		if (closePartialLine !== null) backLines.push(closePartialLine);

		cards.push({
			id,
			front: lines.slice(startLine + 1, separatorLine).join("\n"),
			back: backLines.join("\n"),
			startLine,
			endLine: closeLine,
		});
		i = closeLine + 1;
	}

	// IDs duplicados: se reportan pero no se descartan tarjetas.
	const seen = new Map<string, number>();
	for (const card of cards) {
		if (card.id === null) continue;
		const count = seen.get(card.id) ?? 0;
		if (count === 1) {
			issues.push({
				code: "duplicate-id",
				line: card.startLine,
				id: card.id,
				message: `ID de flashcard duplicado: '${card.id}'.`,
			});
		}
		seen.set(card.id, count + 1);
	}

	return { cards, issues };
}
