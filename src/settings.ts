/** Configuración mínima del plugin. */

export interface FlashcardsSettings {
	/** Animación de volteo 3D activada. */
	flipAnimation: boolean;
	/** Navegación por teclado cuando el mazo tiene el foco. */
	keyboardNav: boolean;
	/** Mostrar indicador de progreso `2 / 8`. */
	showProgress: boolean;
	/** Duración de la animación de volteo en ms (0 a 800). */
	flipDurationMs: number;
}

export const DEFAULT_SETTINGS: FlashcardsSettings = {
	flipAnimation: true,
	keyboardNav: true,
	showProgress: true,
	flipDurationMs: 300,
};

export const FLIP_DURATION_MIN = 0;
export const FLIP_DURATION_MAX = 800;
export const FLIP_DURATION_STEP = 50;
