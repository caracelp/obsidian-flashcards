import { setDeckState } from "./deck-state";
import FlashcardsPlugin from "./plugin";

export interface DeckCard {
	id: string | null;
	front: string;
	back: string;
}

export interface DeckComponentOptions {
	container: HTMLElement;
	cards: DeckCard[];
	/** Clave para preservar el estado: `<ruta>#<id | línea>`. */
	stateKey: string;
	plugin: FlashcardsPlugin;
	sourcePath: string;
	/** Renderiza Markdown de una cara dentro de un elemento. */
	renderMarkdown: (markdown: string, el: HTMLElement) => Promise<void>;
	/** Live Preview: ofrece el botón "Editar fuente". */
	showEditSource?: boolean;
	/** Acción del botón "Editar fuente" (solo Live Preview). */
	onEditSource?: () => void;
}

type Face = "front" | "back";

const INTERACTIVE_SELECTOR =
	"button, a, input, textarea, select, video, audio, .clickable-icon, [contenteditable]";

/**
 * Componente de mazo reutilizable: una tarjeta por vez, clic para voltear,
 * navegación Anterior/Siguiente, indicador de progreso, Reiniciar, y
 * navegación por teclado accesible cuando el componente tiene el foco.
 *
 * Lo usan igual el post-procesador (Reading View) y el widget de CodeMirror
 * (Live Preview); la única diferencia es cómo se renderiza el Markdown de
 * cada cara y si se muestra el botón de edición.
 */
export class DeckComponent {
	private readonly options: DeckComponentOptions;
	private readonly cards: DeckCard[];

	private index = 0;
	private face: Face = "front";

	private root!: HTMLElement;
	private sceneEl!: HTMLElement;
	private cardEl!: HTMLElement;
	private frontContent!: HTMLElement;
	private backContent!: HTMLElement;
	private frontFace!: HTMLElement;
	private backFace!: HTMLElement;
	private prevBtn!: HTMLButtonElement;
	private nextBtn!: HTMLButtonElement;
	private indicatorEl!: HTMLElement;

	private renderToken = 0;
	private destroyed = false;
	private offSettingsChanged: (() => void) | null = null;

	constructor(options: DeckComponentOptions) {
		if (options.cards.length === 0) {
			throw new Error("DeckComponent requiere al menos una tarjeta");
		}
		this.options = options;
		this.cards = options.cards;
	}

	get container(): HTMLElement {
		return this.options.container;
	}

	/** Construye el DOM, restaura el estado previo y muestra la primera cara. */
	mount(): HTMLElement {
		const opts = this.options;
		const cardsCount = this.cards.length;

		const root = opts.container.createDiv("fc-deck");
		root.setAttribute("role", "region");
		root.setAttribute(
			"aria-label",
			`Mazo de flashcards con ${cardsCount} tarjetas`,
		);
		root.tabIndex = 0;

		const scene = root.createDiv("fc-scene");
		scene.setAttribute("role", "group");
		scene.setAttribute(
			"aria-label",
			"Tarjeta actual. Hacé clic o pulsá Enter para voltearla.",
		);
		const card = scene.createDiv("fc-card");

		const frontFace = card.createDiv("fc-face fc-face--front");
		const frontContent = frontFace.createDiv("fc-face-content");
		const backFace = card.createDiv("fc-face fc-face--back");
		const backContent = backFace.createDiv("fc-face-content");

		const controls = root.createDiv("fc-controls");
		const prevBtn = controls.createEl("button", {
			cls: "fc-btn fc-btn--prev",
			text: "← Anterior",
		});
		prevBtn.setAttribute("aria-label", "Tarjeta anterior");
		const indicator = controls.createSpan({
			cls: "fc-indicator",
			text: "",
		});
		indicator.setAttribute("aria-live", "polite");
		const nextBtn = controls.createEl("button", {
			cls: "fc-btn fc-btn--next",
			text: "Siguiente →",
		});
		nextBtn.setAttribute("aria-label", "Tarjeta siguiente");
		const restartBtn = controls.createEl("button", {
			cls: "fc-btn fc-btn--restart",
			text: "Reiniciar",
		});
		restartBtn.setAttribute("aria-label", "Reiniciar el mazo en la primera tarjeta");

		if (opts.showEditSource && opts.onEditSource) {
			const editBtn = controls.createEl("button", {
				cls: "fc-btn fc-btn--edit",
				text: "Editar fuente",
			});
			editBtn.setAttribute("aria-label", "Editar el Markdown de este bloque");
			editBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				opts.onEditSource?.();
			});
		}

		this.root = root;
		this.sceneEl = scene;
		this.cardEl = card;
		this.frontFace = frontFace;
		this.backFace = backFace;
		this.frontContent = frontContent;
		this.backContent = backContent;
		this.prevBtn = prevBtn;
		this.nextBtn = nextBtn;
		this.indicatorEl = indicator;

		this.restoreState();
		this.applySettings();
		this.offSettingsChanged = opts.plugin.onSettingsChanged(() => {
			if (this.destroyed) return;
			this.applySettings();
		});

		this.addEventListener(root, "keydown", (e) => this.onKeydown(e));
		this.addEventListener(scene, "click", (e) => this.onClick(e));
		this.addEventListener(prevBtn, "click", () => this.prev());
		this.addEventListener(nextBtn, "click", () => this.next());
		this.addEventListener(restartBtn, "click", () => this.restart());

		void this.renderCurrentCard();
		this.update();
		return root;
	}

	destroy(): void {
		this.destroyed = true;
		this.renderToken++;
		this.offSettingsChanged?.();
		this.offSettingsChanged = null;
		this.root?.remove();
	}

	// ------------------------------------------------------------------ state

	private restoreState(): void {
		const stateKey = this.options.stateKey;
		const saved =
			stateKey !== null
				? this.options.plugin.stateFor(stateKey)
				: undefined;
		if (saved && saved.index >= 0 && saved.index < this.cards.length) {
			this.index = saved.index;
			this.face = saved.face === "back" ? "back" : "front";
		}
	}

	private persistState(): void {
		if (this.options.stateKey === null) return;
		setDeckState(this.options.stateKey, { index: this.index, face: this.face });
	}

	// ------------------------------------------------------------- navigation

	flip(): void {
		this.face = this.face === "front" ? "back" : "front";
		this.persistState();
		this.update();
	}

	next(): void {
		if (this.index >= this.cards.length - 1) return;
		this.index += 1;
		this.face = "front";
		this.persistState();
		this.onCardChanged();
	}

	prev(): void {
		if (this.index <= 0) return;
		this.index -= 1;
		this.face = "front";
		this.persistState();
		this.onCardChanged();
	}

	restart(): void {
		this.index = 0;
		this.face = "front";
		this.persistState();
		this.onCardChanged();
	}

	private onCardChanged(): void {
		this.renderToken++;
		void this.renderCurrentCard();
		this.update();
		this.sceneEl.scrollIntoView({ block: "nearest" });
	}

	// ------------------------------------------------------------------ input

	private onKeydown(e: KeyboardEvent): void {
		if (!this.options.plugin.settings.keyboardNav) return;
		const target = e.target as HTMLElement | null;
		if (target?.closest(INTERACTIVE_SELECTOR)) return;

		switch (e.key) {
			case "Enter":
			case " ":
				e.preventDefault();
				this.flip();
				break;
			case "ArrowLeft":
				e.preventDefault();
				this.prev();
				break;
			case "ArrowRight":
				e.preventDefault();
				this.next();
				break;
		}
	}

	private onClick(e: MouseEvent): void {
		const target = e.target as HTMLElement | null;
		if (!target) return;

		// Los enlaces internos no deben voltear la tarjeta: se abren.
		const link = target.closest("a.internal-link");
		if (link) {
			e.preventDefault();
			e.stopPropagation();
			const href =
				link.getAttribute("data-href") ?? link.getAttribute("href") ?? "";
			if (href) {
				void this.options.plugin.app.workspace.openLinkText(
					href,
					this.options.sourcePath,
				);
			}
			return;
		}

		// Enlaces externos y controles: comportamiento propio, sin voltear.
		if (target.closest(INTERACTIVE_SELECTOR)) return;

		this.flip();
	}

	// ----------------------------------------------------------------- render

	private async renderCurrentCard(): Promise<void> {
		const token = ++this.renderToken;
		const card = this.cards[this.index];
		if (!card) return;

		this.frontContent.empty();
		this.backContent.empty();

		await this.options.renderMarkdown(card.front, this.frontContent);
		if (this.destroyed || token !== this.renderToken) return;

		await this.options.renderMarkdown(card.back, this.backContent);
	}

	private update(): void {
		const flipped = this.face === "back";
		this.cardEl.classList.toggle("is-flipped", flipped);
		this.frontFace.setAttribute("aria-hidden", flipped ? "true" : "false");
		this.backFace.setAttribute("aria-hidden", flipped ? "false" : "true");

		this.prevBtn.disabled = this.index === 0;
		this.nextBtn.disabled = this.index === this.cards.length - 1;
		this.indicatorEl.textContent = `${this.index + 1} / ${this.cards.length}`;
		this.indicatorEl.hidden = !this.options.plugin.settings.showProgress;
	}

	private applySettings(): void {
		const settings = this.options.plugin.settings;
		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const animate = settings.flipAnimation && !reducedMotion;
		this.root.style.setProperty(
			"--fc-flip-duration",
			animate ? `${settings.flipDurationMs}ms` : "0ms",
		);
		this.indicatorEl.hidden = !settings.showProgress;
	}

	// Registra el listener y devuelve un desregistrar trivial: el DOM se
	// elimina completo en destroy(), así que no hace falta removeEventListener.
	private addEventListener<K extends keyof HTMLElementEventMap>(
		el: HTMLElement,
		type: K,
		handler: (e: HTMLElementEventMap[K]) => void,
	): void {
		el.addEventListener(type, handler as EventListener);
	}
}
