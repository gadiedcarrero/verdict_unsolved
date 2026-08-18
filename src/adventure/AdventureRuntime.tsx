import { useEffect, useState, type JSX } from 'react';
import { CharacterEditorPanel } from './editor/CharacterEditorPanel';
import type { EditableRect } from './editor/EditableBox';
import { SceneEditorPanel } from './editor/SceneEditorPanel';
import { slugify, uniqueId } from './editor/slug';
import { activeAdventureCaseResult } from '../game-engine/scene-engine/activeAdventureCase';
import type { Character, Scene } from '../game-engine/scene-engine/schemas';
import { useSaveStore } from '../game-engine/save-system/save.store';
import { useAdventureRuntimeStore } from './adventureRuntime.store';
import { DialogueOverlay } from './DialogueOverlay';
import { InterfaceHost } from './interfaces/InterfaceHost';
import { SceneViewer } from './SceneViewer';

type EditorTab = 'scene' | 'characters';

export function AdventureRuntime({ onExit }: { onExit: () => void }): JSX.Element {
  const load = useSaveStore((s) => s.load);
  const isLoaded = useSaveStore((s) => s.isLoaded);
  const persistedAdventureState = useSaveStore((s) => s.adventureCaseState);

  const init = useAdventureRuntimeStore((s) => s.init);
  const bundle = useAdventureRuntimeStore((s) => s.bundle);
  const currentSceneId = useAdventureRuntimeStore((s) => s.currentSceneId);
  // Se leen para forzar el re-render cuando cambian; el valor derivado se
  // recalcula abajo con getActiveScene()/getActiveNode().
  useAdventureRuntimeStore((s) => s.activeDialogueNodeId);
  const activeInterfaceId = useAdventureRuntimeStore((s) => s.activeInterfaceId);
  const transitioning = useAdventureRuntimeStore((s) => s.transitioning);
  const ringState = useAdventureRuntimeStore((s) => s.ringState);
  const interactHotspot = useAdventureRuntimeStore((s) => s.interactHotspot);
  const advance = useAdventureRuntimeStore((s) => s.advance);
  const selectChoice = useAdventureRuntimeStore((s) => s.selectChoice);
  const getActiveScene = useAdventureRuntimeStore((s) => s.getActiveScene);
  const getActiveNode = useAdventureRuntimeStore((s) => s.getActiveNode);

  // Modo edición: arrastrar/redimensionar objetos, crear zonas nuevas, editar
  // el roster de personajes, y guardar todo directo en el JSON fuente (solo
  // en `pnpm dev`).
  const [editMode, setEditMode] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('scene');

  const [editedScene, setEditedScene] = useState<Scene | null>(null);
  // Texto (clave → texto en ES) nuevo o editado en esta sesión de edición,
  // pendiente de fundirse con locales/es.json al guardar.
  const [pendingStrings, setPendingStrings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [editedCharacters, setEditedCharacters] = useState<Character[] | null>(null);
  const [pendingCharacterStrings, setPendingCharacterStrings] = useState<Record<string, string>>({});
  const [characterSaving, setCharacterSaving] = useState(false);
  const [characterSaveMessage, setCharacterSaveMessage] = useState<string | null>(null);
  const [uploadingPortraitId, setUploadingPortraitId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isLoaded && activeAdventureCaseResult.ok && !bundle) {
      init(activeAdventureCaseResult.data, persistedAdventureState);
    }
  }, [isLoaded, bundle, init, persistedAdventureState]);

  useEffect(() => {
    setEditedScene(null);
    setPendingStrings({});
    setSaveMessage(null);
  }, [currentSceneId]);

  if (!activeAdventureCaseResult.ok) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-graphite-950 p-8 text-center text-graphite-200">
        <p>
          No se pudo cargar el caso.
          <br />
          <span className="text-sm text-graphite-400">{activeAdventureCaseResult.error}</span>
        </p>
      </div>
    );
  }

  if (!isLoaded || !bundle) {
    return <div className="h-screen w-screen bg-graphite-950" />;
  }

  const baseScene = getActiveScene();
  const activeNode = getActiveNode();
  const displayScene = editedScene ?? baseScene;
  const baseCharacters = bundle.characters;
  const displayCharacters = editedCharacters ?? baseCharacters;
  // El teléfono muestra la pantalla de llamada entrante mientras suena, en
  // vez de una capa fija — ver docs/case-001-la-ultima-llamada/01-mapeo-escenas.md.
  const layerOverrides =
    ringState === 'ringing' && currentSceneId === 'oficina-acto1'
      ? { telefono: 'layers/telefono-llamada-entrante.png' }
      : undefined;

  if (!displayScene) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-graphite-950 text-graphite-200">
        Escena &quot;{currentSceneId}&quot; no encontrada.
      </div>
    );
  }

  // Un "objeto" del editor es una capa y su hotspot (si existe) con el mismo
  // id — se mueven juntos porque representan la misma cosa en pantalla. Ver
  // editor/editableObjects.ts.
  function updateObjectRect(objectId: string, rect: EditableRect): void {
    setEditedScene((prev) => {
      const base = prev ?? baseScene;
      if (!base) return prev;
      const hasLayer = base.layers.some((layer) => layer.id === objectId);
      return {
        ...base,
        layers: hasLayer
          ? base.layers.map((layer) => (layer.id === objectId ? { ...layer, ...rect } : layer))
          : base.layers,
        hotspots: base.hotspots.map((hotspot) => (hotspot.id === objectId ? { ...hotspot, area: rect } : hotspot)),
      };
    });
  }

  // Tilda/destilda si un objeto responde al mouse. Si todavía no tiene
  // hotspot (capa puramente decorativa), tildar crea uno nuevo con una clave
  // de traducción propia; si ya existe, solo cambia su flag `interactable`
  // (la zona sigue ahí, solo deja de reaccionar).
  function toggleInteractable(objectId: string, interactable: boolean): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const hasHotspot = base.hotspots.some((h) => h.id === objectId);
    if (hasHotspot) {
      setEditedScene({
        ...base,
        hotspots: base.hotspots.map((h) => (h.id === objectId ? { ...h, interactable } : h)),
      });
      return;
    }
    const layer = base.layers.find((l) => l.id === objectId);
    if (!layer) return;
    const labelKey = `hotspot.${base.id}.${objectId}`;
    setEditedScene({
      ...base,
      hotspots: [
        ...base.hotspots,
        {
          id: layer.id,
          label: labelKey,
          area: { x: layer.x, y: layer.y, width: layer.width ?? 10, height: layer.height ?? 10 },
          onInteract: [],
          repeatable: true,
          interactable,
        },
      ],
    });
    setPendingStrings((prev) => (labelKey in prev ? prev : { ...prev, [labelKey]: objectId }));
  }

  // Crea una zona nueva (sin capa/imagen propia) directamente sobre la
  // escena — el flujo que pediste: nombre + texto al pasar el mouse +
  // interactuable, todo desde el panel.
  function createZone(name: string, labelText: string, interactable: boolean): void {
    const base = editedScene ?? baseScene;
    if (!base) return;
    const taken = new Set([...base.hotspots.map((h) => h.id), ...base.layers.map((l) => l.id)]);
    const id = uniqueId(slugify(name), taken);
    const labelKey = `hotspot.${base.id}.${id}`;
    setEditedScene({
      ...base,
      hotspots: [
        ...base.hotspots,
        {
          id,
          label: labelKey,
          area: { x: 40, y: 40, width: 15, height: 15 },
          onInteract: [],
          repeatable: true,
          interactable,
        },
      ],
    });
    setPendingStrings((prev) => ({ ...prev, [labelKey]: labelText }));
  }

  function setLabelText(labelKey: string, text: string): void {
    setPendingStrings((prev) => ({ ...prev, [labelKey]: text }));
  }

  async function handleSave(): Promise<void> {
    if (!editedScene) return;
    setSaving(true);
    setSaveMessage(null);
    const payload = {
      id: editedScene.id,
      act: editedScene.act,
      background: editedScene.background,
      layers: editedScene.layers,
      hotspots: editedScene.hotspots,
      ...(editedScene.onEnter ? { onEnter: editedScene.onEnter } : {}),
    };
    try {
      const result = await window.api.saveSceneLayout(editedScene.id, payload, pendingStrings);
      setSaveMessage(result.ok ? 'Guardado en el JSON de la escena.' : `Error: ${result.error}`);
      if (result.ok) setPendingStrings({});
    } catch (error) {
      setSaveMessage(
        `Error: ${error instanceof Error ? error.message : String(error)} (¿reiniciaste "pnpm dev" después de sumar el editor?)`,
      );
    } finally {
      setSaving(false);
    }
  }

  // --- Personajes: retrato, color y nombre válidos para toda la novela, no
  // solo esta escena. Ver editor/CharacterEditorPanel.tsx.
  function updateCharacter(characterId: string, patch: Partial<Character>): void {
    const base = editedCharacters ?? baseCharacters;
    setEditedCharacters(base.map((c) => (c.id === characterId ? { ...c, ...patch } : c)));
  }

  function setCharacterNameText(_characterId: string, nameKey: string, text: string): void {
    setPendingCharacterStrings((prev) => ({ ...prev, [nameKey]: text }));
  }

  function createCharacter(name: string, nameText: string, color: string): void {
    const base = editedCharacters ?? baseCharacters;
    const taken = new Set(base.map((c) => c.id));
    const id = uniqueId(slugify(name), taken);
    const nameKey = `character.${id}.name`;
    setEditedCharacters([...base, { id, name: nameKey, portrait: null, color }]);
    setPendingCharacterStrings((prev) => ({ ...prev, [nameKey]: nameText }));
  }

  async function uploadPortrait(characterId: string, file: File): Promise<void> {
    setUploadingPortraitId(characterId);
    setCharacterSaveMessage(null);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const ext = file.name.split('.').pop() || 'png';
      const result = await window.api.saveCharacterPortrait(characterId, ext, buffer);
      if (result.ok) {
        updateCharacter(characterId, { portrait: result.path });
      } else {
        setCharacterSaveMessage(`Error subiendo retrato: ${result.error}`);
      }
    } catch (error) {
      setCharacterSaveMessage(`Error subiendo retrato: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploadingPortraitId(null);
    }
  }

  async function handleSaveCharacters(): Promise<void> {
    if (!editedCharacters) return;
    setCharacterSaving(true);
    setCharacterSaveMessage(null);
    try {
      const result = await window.api.saveCharacters(editedCharacters, pendingCharacterStrings);
      setCharacterSaveMessage(result.ok ? 'Guardado en characters.json.' : `Error: ${result.error}`);
      if (result.ok) setPendingCharacterStrings({});
    } catch (error) {
      setCharacterSaveMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCharacterSaving(false);
    }
  }

  const strings = { ...bundle.strings, ...pendingStrings, ...pendingCharacterStrings };

  return (
    <div className="relative h-screen w-screen bg-graphite-950">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={`rounded border px-3 py-1 text-[11px] tracking-widest uppercase transition-colors ${
              editMode
                ? 'border-amber-accent bg-amber-accent text-graphite-950'
                : 'border-graphite-700 text-graphite-400 hover:border-amber-accent hover:text-amber-accent'
            }`}
          >
            {editMode ? 'Salir de edición' : 'Editar posiciones'}
          </button>
        )}
        <button
          type="button"
          onClick={onExit}
          className="rounded border border-graphite-700 px-3 py-1 text-[11px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          Salir
        </button>
      </div>

      {editMode ? (
        // Modo edición: layout de dos paneles — herramientas a la izquierda,
        // la escena a la derecha, nada superpuesto sobre el juego. Al salir,
        // este layout entero desaparece y vuelve la vista de juego normal.
        <div className="flex h-full w-full">
          <aside className="flex h-full w-80 shrink-0 flex-col border-r border-graphite-700 bg-graphite-950">
            <div className="flex shrink-0 border-b border-graphite-700">
              <button
                type="button"
                onClick={() => setEditorTab('scene')}
                className={`flex-1 px-3 py-2 text-[11px] tracking-widest uppercase transition-colors ${
                  editorTab === 'scene'
                    ? 'bg-amber-accent text-graphite-950'
                    : 'text-graphite-400 hover:text-amber-accent'
                }`}
              >
                Escena
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('characters')}
                className={`flex-1 border-l border-graphite-700 px-3 py-2 text-[11px] tracking-widest uppercase transition-colors ${
                  editorTab === 'characters'
                    ? 'bg-amber-accent text-graphite-950'
                    : 'text-graphite-400 hover:text-amber-accent'
                }`}
              >
                Personajes
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {editorTab === 'scene' ? (
                <SceneEditorPanel
                  scene={displayScene}
                  strings={strings}
                  onObjectRectChange={updateObjectRect}
                  onToggleInteractable={toggleInteractable}
                  onLabelTextChange={setLabelText}
                  onCreateZone={createZone}
                />
              ) : (
                <CharacterEditorPanel
                  characters={displayCharacters}
                  strings={strings}
                  uploadingId={uploadingPortraitId}
                  onNameTextChange={setCharacterNameText}
                  onColorChange={(id, color) => updateCharacter(id, { color })}
                  onUploadPortrait={(id, file) => void uploadPortrait(id, file)}
                  onCreateCharacter={createCharacter}
                />
              )}
            </div>

            {/* Pie fijo: no se va con el scroll aunque la lista de arriba
                tenga cientos de escenas/personajes. */}
            <div className="shrink-0 border-t border-graphite-700 p-3">
              <button
                type="button"
                onClick={() => void (editorTab === 'scene' ? handleSave() : handleSaveCharacters())}
                disabled={editorTab === 'scene' ? editedScene === null || saving : editedCharacters === null || characterSaving}
                className="w-full rounded border border-amber-accent px-3 py-2 text-[11px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-amber-accent"
              >
                {(editorTab === 'scene' ? saving : characterSaving) ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editorTab === 'scene') {
                    setEditedScene(null);
                    setPendingStrings({});
                    setSaveMessage(null);
                  } else {
                    setEditedCharacters(null);
                    setPendingCharacterStrings({});
                    setCharacterSaveMessage(null);
                  }
                }}
                disabled={editorTab === 'scene' ? editedScene === null : editedCharacters === null}
                className="mt-2 w-full rounded border border-graphite-700 px-3 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Descartar
              </button>
              {(editorTab === 'scene' ? saveMessage : characterSaveMessage) && (
                <p className="mt-2 text-[10px] text-graphite-300">
                  {editorTab === 'scene' ? saveMessage : characterSaveMessage}
                </p>
              )}
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <SceneViewer
              scene={displayScene}
              strings={strings}
              transitioning={transitioning}
              layerOverrides={layerOverrides}
              onInteract={interactHotspot}
              editMode={editorTab === 'scene'}
              onObjectRectChange={updateObjectRect}
            />
          </div>
        </div>
      ) : (
        // Modo juego: la escena vuelve a ocupar toda la pantalla, como
        // siempre — el editor no deja rastro.
        <SceneViewer
          scene={displayScene}
          strings={strings}
          transitioning={transitioning}
          layerOverrides={layerOverrides}
          onInteract={interactHotspot}
        >
          {activeInterfaceId ? (
            <InterfaceHost interfaceId={activeInterfaceId} />
          ) : (
            activeNode && (
              <DialogueOverlay
                node={activeNode}
                characters={displayCharacters}
                strings={strings}
                onAdvance={advance}
                onChoose={selectChoice}
              />
            )
          )}
        </SceneViewer>
      )}
    </div>
  );
}
