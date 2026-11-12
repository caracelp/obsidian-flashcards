import { getDeckState, DeckState } from "./deck-state";
import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, FlashcardsSettings } from "./settings";

/**
 * Plugin principal. Coordina el post-procesador (Reading View), la extensión
 * de CodeMirror (Live Preview) y la pestaña de ajustes.
 */
export default class FlashcardsPlugin extends Plugin {
	settings: FlashcardsSettings = DEFAULT_SETTINGS;

	private settingsListeners = new Set<(settings: FlashcardsSettings) => void>();

	async onload(): Promise<void> {
		await this.loadSettings();
		// Se registran en main.ts para mantener los módulos desacoplados.
	}

	onunload(): void {
		this.settingsListeners.clear();
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<FlashcardsSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		for (const listener of this.settingsListeners) {
			listener(this.settings);
		}
	}

	/** Estado previo de un mazo (tarjeta visible y cara), si existe. */
	stateFor(stateKey: string): DeckState | undefined {
		return getDeckState(stateKey);
	}

	/** Suscripción a cambios de ajustes; devuelve la función de cancelación. */
	onSettingsChanged(
		listener: (settings: FlashcardsSettings) => void,
	): () => void {
		this.settingsListeners.add(listener);
		return () => {
			this.settingsListeners.delete(listener);
		};
	}
}
