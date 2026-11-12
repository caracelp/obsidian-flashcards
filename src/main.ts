import { livePreviewExtension } from "./live-preview";
import FlashcardsPlugin from "./plugin";
import { readingPostProcessor } from "./reading-view";
import { FlashcardsSettingTab } from "./settings-tab";

/**
 * Punto de entrada del plugin. La lógica vive en módulos separados:
 * parser (src/parser), mazo (src/deck), estado (src/deck-state),
 * integraciones (src/reading-view, src/live-preview) y ajustes
 * (src/settings, src/settings-tab).
 */
export default class InteractiveFlashcardsPlugin extends FlashcardsPlugin {
	async onload(): Promise<void> {
		await super.onload();

		this.registerEditorExtension(livePreviewExtension(this));
		this.registerMarkdownPostProcessor(readingPostProcessor(this));
		this.addSettingTab(new FlashcardsSettingTab(this.app, this));
	}
}

// Reexport para consumidores del bundle que quieran la clase base.
export type { FlashcardsPlugin };
