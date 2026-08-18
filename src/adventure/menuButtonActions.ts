/**
 * Valores centinela para el <select> de "acción al hacer clic" de un botón
 * de menú (ver SceneEditorPanel.tsx) — cualquier otro valor se interpreta
 * como un id de escena (transitionTo). Compartido entre el editor (que
 * arma las opciones) y AdventureRuntime (que las traduce a SceneAction).
 */
export const MENU_BUTTON_ACTION_CONTINUE = '__continue__';
export const MENU_BUTTON_ACTION_QUIT = '__quit__';
