import {
	MarkdownPostProcessor,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	MarkdownRenderer,
	TFile,
} from "obsidian";
import { DeckComponent } from "./deck";
import { CardSource, parseFlashcards } from "./parser";
import FlashcardsPlugin from "./plugin";

/**
 * Integración con Reading View.
 *
 * El post-procesador recorre los elementos renderizados de cada sección y:
 * - inserta el mazo completo una sola vez, en la sección que contiene la
 *   línea de apertura de la primera flashcard de la nota;
 * - oculta (display: none) todo elemento cuyo rango fuente cae íntegramente
 *   dentro de bloques de flashcard, incluidos los fragmentos en que Obsidian
 *   divide el bloque al renderizarlo (el `---` se convierte en encabezado
 *   setext, el reverso en un <p> aparte, el cierre `:::` en otro, etc.).
 *
 * Así la flashcard interactiva sustituye visualmente al texto formateado que
 * la conforma, y el Markdown almacenado nunca se modifica.
 */
export function readingPostProcessor(plugin: FlashcardsPlugin): MarkdownPostProcessor {
	return (el, pctx) => {
		void process(plugin, el, pctx);
	};
}

/** Caché por nota para no re-parsear el archivo en cada sección renderizada. */
const parseCache = new Map<string, { content: string; cards: CardSource[] }>();

function parseFor(sourcePath: string, content: string): CardSource[] {
	const cached = parseCache.get(sourcePath);
	if (cached && cached.content === content) return cached.cards;
	const { cards } = parseFlashcards(content);
	parseCache.set(sourcePath, { content, cards });
	return cards;
}

async function process(
	plugin: FlashcardsPlugin,
	el: HTMLElement,
	pctx: MarkdownPostProcessorContext,
): Promise<void> {
	const sourcePath = pctx.sourcePath;
	const file = plugin.app.vault.getAbstractFileByPath(sourcePath);
	if (!(file instanceof TFile)) return;

	const content = await plugin.app.vault.cachedRead(file);
	const cards = parseFor(sourcePath, content);
	if (cards.length === 0) return;

	const docLines = content.split(/\r?\n/);
	// Un elemento "pertenece a las tarjetas" si todas sus líneas fuente están
	// dentro de bloques de flashcard. Las líneas vacías no bloquean (no
	// renderizan nada), así que una línea en blanco al final de la última
	// sección no deja texto sin ocultar. Los párrafos intercalados, con líneas
	// de texto propias, quedan excluidos.
	const isCoveredByCards = (lineStart: number, lineEnd: number): boolean => {
		for (let line = lineStart; line <= lineEnd; line++) {
			if (!docLines[line]?.trim()) continue;
			const covered = cards.some(
				(card) => line >= card.startLine && line <= card.endLine,
			);
			if (!covered) return false;
		}
		return true;
	};

	const first = cards[0];
	let firstCoveredChild: HTMLElement | null = null;
	let sectionHasFirstCard = false;

	for (const child of Array.from(el.children)) {
		if (!(child instanceof HTMLElement)) continue;

		const info = pctx.getSectionInfo(child);
		if (!info) continue;

		if (!isCoveredByCards(info.lineStart, info.lineEnd)) {
			// Sección mezclada (texto + tarjeta pegada sin línea en blanco):
			// se deja el texto visible tal cual.
			continue;
		}

		if (
			info.lineStart <= first.startLine &&
			info.lineEnd >= first.startLine
		) {
			sectionHasFirstCard = true;
		}

		if (!firstCoveredChild) firstCoveredChild = child;

		// Ocultar el texto formateado de la tarjeta: sigue en el DOM (y en el
		// archivo) pero no se muestra.
		child.style.display = "none";
		child.setAttribute("aria-hidden", "true");
	}

	if (firstCoveredChild && sectionHasFirstCard) {
		const deckEl = document.createElement("div");
		deckEl.addClass("fc-deck-host");
		firstCoveredChild.before(deckEl);
		const stateKey = `${sourcePath}#${first.id ?? `line-${first.startLine}`}`;
		pctx.addChild(
			new DeckRenderChild(deckEl, plugin, sourcePath, stateKey, cards),
		);
	}
}

class DeckRenderChild extends MarkdownRenderChild {
	private deck: DeckComponent | null = null;

	constructor(
		container: HTMLElement,
		private plugin: FlashcardsPlugin,
		private sourcePath: string,
		private stateKey: string,
		private cards: CardSource[],
	) {
		super(container);
	}

	onload(): void {
		this.deck = new DeckComponent({
			container: this.containerEl,
			cards: this.cards,
			stateKey: this.stateKey,
			plugin: this.plugin,
			sourcePath: this.sourcePath,
			renderMarkdown: (markdown, el) =>
				MarkdownRenderer.render(
					this.plugin.app,
					markdown,
					el,
					this.sourcePath,
					this,
				),
		});
		this.deck.mount();
	}

	onunload(): void {
		this.deck?.destroy();
		this.deck = null;
	}
}
