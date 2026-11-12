import {
	Component,
	MarkdownRenderer,
	editorInfoField,
	editorLivePreviewField,
} from "obsidian";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { EditorSelection, Extension, RangeSetBuilder } from "@codemirror/state";
import { DeckCard, DeckComponent } from "./deck";
import { parseFlashcards } from "./parser";
import FlashcardsPlugin from "./plugin";

/**
 * Integración con Live Preview mediante una extensión de CodeMirror 6.
 *
 * - El primer bloque de flashcard se reemplaza por un widget de bloque con el
 *   mazo interactivo (Decoration.replace con block: true + widget).
 * - Los bloques de tarjetas posteriores se colapsan con Decoration.replace
 *   sin widget (siguen presentes en el documento fuente).
 * - Cuando el cursor está dentro de un bloque, este deja de decorarse y se
 *   muestra el Markdown original, preservando la edición.
 * - En Source Mode (editorLivePreviewField = false) no se decora nada.
 *
 * Un registerMarkdownPostProcessor por sí solo no cubre Live Preview; esta
 * extensión es la que garantiza el comportamiento en el editor visual.
 */
/**
 * Set de decoraciones por vista: el facet atomicRanges se resuelve después,
 * con la vista como clave, para no mezclar paneles con notas distintas.
 */
const decorationsByView = new WeakMap<EditorView, DecorationSet>();

export function livePreviewExtension(plugin: FlashcardsPlugin): Extension {
	return ViewPlugin.fromClass(
		class FlashcardsViewPlugin {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view, plugin);
				decorationsByView.set(view, this.decorations);
			}

			update(update: ViewUpdate): void {
				if (update.docChanged || update.selectionSet || update.viewportChanged) {
					this.decorations = buildDecorations(update.view, plugin);
					decorationsByView.set(update.view, this.decorations);
				}
			}
		},
		{
			decorations: (pluginInstance) => pluginInstance.decorations,
			provide: () =>
				EditorView.atomicRanges.of(
					(view) => decorationsByView.get(view) ?? Decoration.none,
				),
		},
	);
}

function buildDecorations(
	view: EditorView,
	plugin: FlashcardsPlugin,
): DecorationSet {
	const isLivePreview = view.state.field(editorLivePreviewField, false);
	if (!isLivePreview) return Decoration.none;

	const doc = view.state.doc;
	if (doc.length === 0) return Decoration.none;

	const { cards } = parseFlashcards(doc.toString());
	if (cards.length === 0) return Decoration.none;

	const file = view.state.field(editorInfoField, false)?.file ?? null;
	const sourcePath = file?.path ?? "";
	const first = cards[0];
	const stateKey = `${sourcePath}#${first.id ?? `line-${first.startLine}`}`;

	const selection = view.state.selection;
	const overlapsSelection = (from: number, to: number): boolean =>
		selection.ranges.some((range) => range.from <= to && range.to >= from);

	const builder = new RangeSetBuilder<Decoration>();
	for (let i = 0; i < cards.length; i++) {
		const card = cards[i];
		const from = doc.line(card.startLine + 1).from;
		const to = doc.line(card.endLine + 1).to;
		if (overlapsSelection(from, to)) continue;

		if (i === 0) {
			builder.add(
				from,
				to,
				Decoration.replace({
					block: true,
					widget: new DeckWidget(
						plugin,
						toDeckCards(cards),
						sourcePath,
						stateKey,
						{ from, to },
					),
				}),
			);
		} else {
			builder.add(from, to, Decoration.replace({ block: true }));
		}
	}
	return builder.finish();
}

function toDeckCards(cards: ReturnType<typeof parseFlashcards>["cards"]): DeckCard[] {
	return cards.map((card) => ({
		id: card.id,
		front: card.front,
		back: card.back,
	}));
}

const cleanups = new WeakMap<HTMLElement, () => void>();

class DeckWidget extends WidgetType {
	private readonly serialized: string;

	constructor(
		private plugin: FlashcardsPlugin,
		private cards: DeckCard[],
		private sourcePath: string,
		private stateKey: string,
		private range: { from: number; to: number },
	) {
		super();
		this.serialized = JSON.stringify([sourcePath, stateKey, cards]);
	}

	eq(other: WidgetType): boolean {
		return (
			other instanceof DeckWidget &&
			other.serialized === this.serialized
		);
	}

	toDOM(view: EditorView): HTMLElement {
		const container = document.createElement("div");
		container.classList.add("fc-live-deck");

		const component = new Component();
		component.load();

		const deck = new DeckComponent({
			container,
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
					component,
				),
			showEditSource: true,
			onEditSource: () => {
				view.dispatch({
					selection: EditorSelection.cursor(this.range.from),
					scrollIntoView: true,
				});
			},
		});
		deck.mount();

		cleanups.set(container, () => {
			deck.destroy();
			component.unload();
		});
		return container;
	}

	destroy(dom: HTMLElement): void {
		cleanups.get(dom)?.();
		cleanups.delete(dom);
	}

	/** Los clics y pulsaciones los maneja el propio mazo, no el editor. */
	ignoreEvent(): boolean {
		return true;
	}
}
