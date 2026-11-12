import { App, PluginSettingTab, Setting } from "obsidian";
import FlashcardsPlugin from "./plugin";
import {
	FLIP_DURATION_MAX,
	FLIP_DURATION_MIN,
	FLIP_DURATION_STEP,
} from "./settings";

export class FlashcardsSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: FlashcardsPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Interactive Flashcards" });

		new Setting(containerEl)
			.setName("Animación de volteo")
			.setDesc(
				"Girar la tarjeta en 3D al hacer clic. Se desactiva automáticamente si el sistema pide movimiento reducido.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.flipAnimation)
					.onChange(async (value) => {
						this.plugin.settings.flipAnimation = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Duración de la animación")
			.setDesc("Milisegundos que dura el volteo (solo si la animación está activa).")
			.addSlider((slider) =>
				slider
					.setLimits(FLIP_DURATION_MIN, FLIP_DURATION_MAX, FLIP_DURATION_STEP)
					.setValue(this.plugin.settings.flipDurationMs)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.flipDurationMs = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Navegación por teclado")
			.setDesc(
				"Cuando el mazo tiene el foco: Enter o Espacio voltea la tarjeta, flechas izquierda y derecha navegan.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.keyboardNav)
					.onChange(async (value) => {
						this.plugin.settings.keyboardNav = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Indicador de progreso")
			.setDesc("Mostrar «2 / 8» entre los controles Anterior y Siguiente.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showProgress)
					.onChange(async (value) => {
						this.plugin.settings.showProgress = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
