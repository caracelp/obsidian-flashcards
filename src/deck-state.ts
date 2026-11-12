/**
 * Estado del mazo por archivo, para preservar la tarjeta visible y su cara
 * cuando el documento se vuelve a renderizar (cambios de modo, edición,
 * cambios de nota y vuelta).
 */

export interface DeckState {
	index: number;
	face: "front" | "back";
}

const store = new Map<string, DeckState>();

export function getDeckState(key: string): DeckState | undefined {
	return store.get(key);
}

export function setDeckState(key: string, state: DeckState): void {
	store.set(key, state);
}

export function clearDeckState(key: string): void {
	store.delete(key);
}
