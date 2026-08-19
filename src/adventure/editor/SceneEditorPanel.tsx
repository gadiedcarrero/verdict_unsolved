import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import { translate } from '../../i18n/translate';
import type {
  Character,
  DialogueNode,
  FontFamily,
  HotspotShape,
  InteractWithTarget,
  MenuAppearance,
  MenuButton,
  MenuButtonStyle,
  MenuPosition,
  MenuTitle,
  Scene,
  SceneAction,
  SceneKind,
  TextStyleOverride,
} from '../../game-engine/scene-engine/schemas';
import { gameAssetUrl } from '../gameAssetUrl';
import { MENU_BUTTON_ACTION_CONTINUE, MENU_BUTTON_ACTION_QUIT } from '../menuButtonActions';
import type { EditableObject } from './editableObjects';
import { buildEditableObjects } from './editableObjects';
import type { EditableRect } from './EditableBox';

const inputClassName =
  'w-full rounded border border-graphite-700 bg-graphite-900 px-1.5 py-1 text-[10px] text-graphite-100';

function SceneSwitcher({
  sceneOptions,
  activeSceneId,
  creatingScene,
  onSwitchScene,
  onCreateScene,
}: {
  sceneOptions: { id: string; act: number }[];
  activeSceneId: string;
  creatingScene: boolean;
  onSwitchScene: (sceneId: string) => void;
  onCreateScene: (name: string, act: number, kind: SceneKind) => void;
}): JSX.Element {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [act, setAct] = useState(1);
  const [kind, setKind] = useState<SceneKind>('standard');

  function submit(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreateScene(trimmed, act, kind);
    setName('');
    setAct(1);
    setKind('standard');
    setCreating(false);
  }

  return (
    <div className="mb-3 border-b border-graphite-800 pb-3">
      <label className="mb-2 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Editando escena</span>
        <select
          value={activeSceneId}
          onChange={(event) => onSwitchScene(event.target.value)}
          className={inputClassName}
        >
          {sceneOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id} (acto {option.act})
            </option>
          ))}
        </select>
      </label>

      {creating ? (
        <div className="rounded border border-amber-accent/40 bg-graphite-900/60 p-2">
          <label className="mb-1 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Nombre (id interno)</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
          </label>
          <label className="mb-2 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Acto</span>
            <input
              type="number"
              min={1}
              value={act}
              onChange={(event) => setAct(Number(event.target.value))}
              className={inputClassName}
            />
          </label>
          <label className="mb-2 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Tipo</span>
            <select value={kind} onChange={(event) => setKind(event.target.value as SceneKind)} className={inputClassName}>
              <option value="standard">Estándar (point-and-click)</option>
              <option value="intro">Intro (secuencia de fondos por tiempo)</option>
              <option value="menu">Menú (fondo con botones)</option>
            </select>
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim() || creatingScene}
              className="flex-1 rounded border border-amber-accent px-2 py-1 text-[10px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creatingScene ? 'Creando...' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded border border-graphite-700 px-2 py-1 text-[10px] tracking-widest text-graphite-400 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full rounded border border-graphite-700 px-2 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          + Crear nueva escena
        </button>
      )}
    </div>
  );
}

function BackgroundThumb({
  gameId,
  assetPath,
  label,
  durationMs,
  backgroundColor,
  imageWidthPercent,
  showIntroFields,
  onRemove,
  onDurationChange,
  onBackgroundColorChange,
  onImageWidthChange,
}: {
  gameId: string;
  assetPath: string;
  label: string;
  durationMs: number | undefined;
  backgroundColor: string | undefined;
  imageWidthPercent: number | undefined;
  showIntroFields: boolean;
  onRemove: () => void;
  onDurationChange: (durationMs: number) => void;
  onBackgroundColorChange: (color: string | undefined) => void;
  onImageWidthChange: (widthPercent: number | undefined) => void;
}): JSX.Element {
  const [failed, setFailed] = useState(false);
  return (
    <div className="w-24 shrink-0">
      <div className="relative">
        {failed ? (
          <div className="flex h-14 w-24 items-center justify-center rounded border border-dashed border-graphite-600 bg-graphite-800/70 text-[8px] text-graphite-500">
            sin imagen
          </div>
        ) : (
          <div
            className="flex h-14 w-24 items-center justify-center overflow-hidden rounded border border-graphite-700"
            style={{ backgroundColor: backgroundColor || undefined }}
          >
            <img
              src={gameAssetUrl(gameId, assetPath)}
              alt=""
              onError={() => setFailed(true)}
              className={imageWidthPercent ? 'max-h-full' : 'h-14 w-24 object-cover'}
              style={imageWidthPercent ? { width: `${imageWidthPercent}%` } : undefined}
            />
          </div>
        )}
        <span className="absolute top-0.5 left-0.5 rounded bg-graphite-950/80 px-1 text-[8px] tracking-widest text-amber-accent uppercase">
          {label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 rounded bg-graphite-950/80 px-1 text-[8px] text-graphite-300 hover:text-amber-accent"
        >
          ✕
        </button>
      </div>
      {showIntroFields && (
        <div className="mt-1 flex flex-col gap-1">
          <label className="flex items-center gap-1">
            <input
              type="number"
              min={100}
              step={100}
              value={durationMs ?? 2500}
              onChange={(event) => onDurationChange(Number(event.target.value))}
              className="w-14 rounded border border-graphite-700 bg-graphite-900 px-1 py-0.5 text-[9px] text-graphite-100"
            />
            <span className="text-[8px] text-graphite-500">ms</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="color"
              value={backgroundColor ?? '#0b0f14'}
              onChange={(event) => onBackgroundColorChange(event.target.value)}
              className="h-4 w-6 cursor-pointer rounded border border-graphite-700 bg-graphite-900"
            />
            <span className="text-[8px] text-graphite-500">fondo</span>
            {backgroundColor && (
              <button
                type="button"
                onClick={() => onBackgroundColorChange(undefined)}
                className="text-[8px] text-graphite-500 hover:text-amber-accent"
              >
                ✕
              </button>
            )}
          </label>
          <label className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={100}
              placeholder="100"
              value={imageWidthPercent ?? ''}
              onChange={(event) =>
                onImageWidthChange(event.target.value === '' ? undefined : Number(event.target.value))
              }
              className="w-14 rounded border border-graphite-700 bg-graphite-900 px-1 py-0.5 text-[9px] text-graphite-100"
            />
            <span className="text-[8px] text-graphite-500">% tamaño</span>
          </label>
        </div>
      )}
    </div>
  );
}

function BackgroundsSection({
  gameId,
  scene,
  uploading,
  onAddBackground,
  onRemoveBackground,
  onDurationChange,
  onBackgroundColorChange,
  onImageWidthChange,
}: {
  gameId: string;
  scene: Scene;
  uploading: boolean;
  onAddBackground: (file: File) => void;
  onRemoveBackground: (bgId: string) => void;
  onDurationChange: (bgId: string, durationMs: number) => void;
  onBackgroundColorChange: (bgId: string, color: string | undefined) => void;
  onImageWidthChange: (bgId: string, widthPercent: number | undefined) => void;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isIntro = scene.kind === 'intro';

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file) onAddBackground(file);
    event.target.value = '';
  }

  return (
    <div className="mb-3 border-b border-graphite-800 pb-3">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">Fondos</p>
      <p className="mb-2 text-[9px] text-graphite-500">
        {isIntro
          ? 'Se muestran en este orden, cada uno durante lo que diga su duración, y después pasa solo al siguiente. Para un logo: dejale un % de tamaño y un color de fondo en vez de que ocupe toda la pantalla.'
          : 'El primero (BG 1) es el que se ve por defecto. Vincular cada fondo a un objeto/estado se hace más adelante.'}
      </p>
      <div className="mb-2 flex flex-wrap gap-2">
        {scene.backgrounds.map((bg, index) => (
          <BackgroundThumb
            key={bg.id}
            gameId={gameId}
            assetPath={bg.assetPath}
            label={`BG ${index + 1}`}
            durationMs={bg.durationMs}
            backgroundColor={bg.backgroundColor}
            imageWidthPercent={bg.imageWidthPercent}
            showIntroFields={isIntro}
            onRemove={() => onRemoveBackground(bg.id)}
            onDurationChange={(durationMs) => onDurationChange(bg.id, durationMs)}
            onBackgroundColorChange={(color) => onBackgroundColorChange(bg.id, color)}
            onImageWidthChange={(widthPercent) => onImageWidthChange(bg.id, widthPercent)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded border border-graphite-700 px-2 py-1.5 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent disabled:opacity-40"
      >
        {uploading ? 'Subiendo...' : '+ Agregar fondo'}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  );
}

function IntroSettings({
  scene,
  sceneOptions,
  onChangeIntroSkippable,
  onChangeIntroCompleteTarget,
}: {
  scene: Scene;
  sceneOptions: { id: string; act: number }[];
  onChangeIntroSkippable: (skippable: boolean) => void;
  onChangeIntroCompleteTarget: (sceneId: string) => void;
}): JSX.Element {
  const targetSceneId =
    scene.onIntroComplete?.find((action) => action.type === 'transitionTo')?.sceneId ?? '';

  return (
    <div className="mb-3 border-b border-graphite-800 pb-3">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">Intro</p>
      <label className="mb-2 flex items-center gap-1 text-[9px] text-graphite-400">
        <input
          type="checkbox"
          checked={scene.introSkippable}
          onChange={(event) => onChangeIntroSkippable(event.target.checked)}
        />
        Mostrar botón &quot;Comenzar&quot; para saltarla
      </label>
      <label className="flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Al terminar, ir a</span>
        <select
          value={targetSceneId}
          onChange={(event) => onChangeIntroCompleteTarget(event.target.value)}
          className={inputClassName}
        >
          <option value="">(sin definir)</option>
          {sceneOptions
            .filter((option) => option.id !== scene.id)
            .map((option) => (
              <option key={option.id} value={option.id}>
                {option.id}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}

function MenuButtonFields({
  button,
  strings,
  sceneOptions,
  onLabelTextChange,
  onTargetChange,
  onRemove,
}: {
  button: MenuButton;
  strings: Record<string, string>;
  sceneOptions: { id: string; act: number }[];
  onLabelTextChange: (text: string) => void;
  onTargetChange: (sceneId: string) => void;
  onRemove: () => void;
}): JSX.Element {
  const firstAction = button.onClick[0];
  const selectValue =
    firstAction?.type === 'transitionTo'
      ? firstAction.sceneId
      : firstAction?.type === 'continueGame'
        ? MENU_BUTTON_ACTION_CONTINUE
        : firstAction?.type === 'quitApp'
          ? MENU_BUTTON_ACTION_QUIT
          : '';

  return (
    <div className="mb-2 border-b border-graphite-800 pb-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-graphite-100">{button.id}</p>
        <button
          type="button"
          onClick={onRemove}
          className="text-[9px] text-graphite-500 uppercase hover:text-amber-accent"
        >
          eliminar
        </button>
      </div>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Texto</span>
        <input
          type="text"
          value={strings[button.label] ?? translate(strings, button.label)}
          onChange={(event) => onLabelTextChange(event.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Al hacer clic</span>
        <select value={selectValue} onChange={(event) => onTargetChange(event.target.value)} className={inputClassName}>
          <option value="">(sin definir)</option>
          <option value={MENU_BUTTON_ACTION_CONTINUE}>Continuar partida guardada</option>
          <option value={MENU_BUTTON_ACTION_QUIT}>Salir del juego</option>
          {sceneOptions.map((option) => (
            <option key={option.id} value={option.id}>
              Ir a escena: {option.id}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CreateMenuButtonForm({ onCreate }: { onCreate: (name: string, labelText: string) => void }): JSX.Element {
  const [name, setName] = useState('');
  const [labelText, setLabelText] = useState('');

  function submit(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, labelText.trim() || trimmed);
    setName('');
    setLabelText('');
  }

  return (
    <div className="rounded border border-amber-accent/40 bg-graphite-900/60 p-2">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-amber-accent uppercase">+ Agregar botón</p>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Nombre (id interno)</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
      </label>
      <label className="mb-2 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Texto</span>
        <input
          type="text"
          value={labelText}
          onChange={(event) => setLabelText(event.target.value)}
          className={inputClassName}
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className="w-full rounded border border-amber-accent px-2 py-1 text-[10px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Crear
      </button>
    </div>
  );
}

function MenuTitleSettings({
  scene,
  strings,
  onSetEnabled,
  onTextChange,
  onChangeAppearance,
}: {
  scene: Scene;
  strings: Record<string, string>;
  onSetEnabled: (enabled: boolean) => void;
  onTextChange: (labelKey: string, text: string) => void;
  onChangeAppearance: (patch: Partial<Omit<MenuTitle, 'text'>>) => void;
}): JSX.Element {
  const title = scene.menuTitle;

  return (
    <div className="mb-3 border-b border-graphite-800 pb-3">
      <label className="mb-2 flex items-center gap-1 text-[9px] text-graphite-400">
        <input type="checkbox" checked={title !== null} onChange={(event) => onSetEnabled(event.target.checked)} />
        Mostrar título
      </label>
      {title && (
        <>
          <label className="mb-2 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Texto</span>
            <input
              type="text"
              value={strings[title.text] ?? translate(strings, title.text)}
              onChange={(event) => onTextChange(title.text, event.target.value)}
              className={inputClassName}
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col">
              <span className="text-[9px] text-graphite-500 uppercase">Tipografía</span>
              <select
                value={title.fontFamily}
                onChange={(event) => onChangeAppearance({ fontFamily: event.target.value as FontFamily })}
                className={inputClassName}
              >
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Monoespaciada</option>
                <option value="comic-sans">Comic Sans</option>
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-[9px] text-graphite-500 uppercase">Tamaño</span>
              <input
                type="number"
                min={12}
                max={120}
                value={title.fontSize}
                onChange={(event) => onChangeAppearance({ fontSize: Number(event.target.value) })}
                className={inputClassName}
              />
            </label>
            <label className="flex flex-col">
              <span className="text-[9px] text-graphite-500 uppercase">Color</span>
              <input
                type="color"
                value={title.color}
                onChange={(event) => onChangeAppearance({ color: event.target.value })}
                className="h-7 w-full cursor-pointer rounded border border-graphite-700 bg-graphite-900"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function MenuSettings({
  scene,
  strings,
  sceneOptions,
  onChangeAppearance,
  onSetTitleEnabled,
  onTitleTextChange,
  onChangeTitleAppearance,
  onAddButton,
  onRemoveButton,
  onButtonLabelTextChange,
  onButtonTargetChange,
}: {
  scene: Scene;
  strings: Record<string, string>;
  sceneOptions: { id: string; act: number }[];
  onChangeAppearance: (patch: Partial<MenuAppearance>) => void;
  onSetTitleEnabled: (enabled: boolean) => void;
  onTitleTextChange: (labelKey: string, text: string) => void;
  onChangeTitleAppearance: (patch: Partial<Omit<MenuTitle, 'text'>>) => void;
  onAddButton: (name: string, labelText: string) => void;
  onRemoveButton: (buttonId: string) => void;
  onButtonLabelTextChange: (labelKey: string, text: string) => void;
  onButtonTargetChange: (buttonId: string, sceneId: string) => void;
}): JSX.Element {
  const appearance = scene.menuAppearance;

  return (
    <div className="mb-3 border-b border-graphite-800 pb-3">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">Menú</p>

      <p className="mb-2 text-[9px] font-semibold tracking-widest text-graphite-400 uppercase">Título</p>
      <MenuTitleSettings
        scene={scene}
        strings={strings}
        onSetEnabled={onSetTitleEnabled}
        onTextChange={onTitleTextChange}
        onChangeAppearance={onChangeTitleAppearance}
      />

      <p className="mb-2 text-[9px] font-semibold tracking-widest text-graphite-400 uppercase">Estilo de botones</p>
      <label className="mb-2 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Posición de los botones</span>
        <select
          value={appearance.position}
          onChange={(event) => onChangeAppearance({ position: event.target.value as MenuPosition })}
          className={inputClassName}
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
        </select>
      </label>

      <label className="mb-2 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Estilo de botón</span>
        <select
          value={appearance.buttonStyle}
          onChange={(event) => onChangeAppearance({ buttonStyle: event.target.value as MenuButtonStyle })}
          className={inputClassName}
        >
          <option value="bordered">Cuadrado con marco</option>
          <option value="frameless">Sin marco</option>
          <option value="filled">Relleno sólido</option>
        </select>
      </label>

      <label className="mb-2 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Tipografía</span>
        <select
          value={appearance.fontFamily}
          onChange={(event) => onChangeAppearance({ fontFamily: event.target.value as FontFamily })}
          className={inputClassName}
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Monoespaciada</option>
          <option value="comic-sans">Comic Sans</option>
        </select>
      </label>

      <div className="mb-2 grid grid-cols-3 gap-2">
        <label className="flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">Tamaño</span>
          <input
            type="number"
            min={8}
            max={72}
            value={appearance.fontSize}
            onChange={(event) => onChangeAppearance({ fontSize: Number(event.target.value) })}
            className={inputClassName}
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">Color</span>
          <input
            type="color"
            value={appearance.fontColor}
            onChange={(event) => onChangeAppearance({ fontColor: event.target.value })}
            className="h-7 w-full cursor-pointer rounded border border-graphite-700 bg-graphite-900"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">Color hover</span>
          <input
            type="color"
            value={appearance.hoverColor}
            onChange={(event) => onChangeAppearance({ hoverColor: event.target.value })}
            className="h-7 w-full cursor-pointer rounded border border-graphite-700 bg-graphite-900"
          />
        </label>
      </div>

      <p className="mt-3 mb-2 text-[10px] font-semibold tracking-widest text-graphite-300 uppercase">Botones</p>
      {scene.menuButtons.map((button) => (
        <MenuButtonFields
          key={button.id}
          button={button}
          strings={strings}
          sceneOptions={sceneOptions.filter((option) => option.id !== scene.id)}
          onLabelTextChange={(text) => onButtonLabelTextChange(button.label, text)}
          onTargetChange={(sceneId) => onButtonTargetChange(button.id, sceneId)}
          onRemove={() => onRemoveButton(button.id)}
        />
      ))}
      <CreateMenuButtonForm onCreate={onAddButton} />
    </div>
  );
}

export type ActionComposerValue = {
  backgroundIdA: string;
  backgroundIdB: string;
  sceneId: string;
  characterId: string;
  dialogueText: string;
};

function findAction<T extends SceneAction['type']>(
  actions: SceneAction[],
  type: T,
): Extract<SceneAction, { type: T }> | undefined {
  return actions.find((a): a is Extract<SceneAction, { type: T }> => a.type === type);
}

function resolveActionComposerValue(
  actions: SceneAction[],
  dialogueNodes: Record<string, DialogueNode>,
  strings: Record<string, string>,
): ActionComposerValue {
  const backgroundAction = findAction(actions, 'toggleBackground');
  const sceneAction = findAction(actions, 'transitionTo');
  const dialogueAction = findAction(actions, 'dialogue');
  const node = dialogueAction ? dialogueNodes[dialogueAction.nodeId] : undefined;
  return {
    backgroundIdA: backgroundAction?.backgroundIdA ?? '',
    backgroundIdB: backgroundAction?.backgroundIdB ?? '',
    sceneId: sceneAction?.sceneId ?? '',
    characterId: node?.speaker ?? '',
    dialogueText: node ? (strings[node.line] ?? '') : '',
  };
}

/** Compone hasta tres cosas por acción: qué dos fondos alterna (p. ej. luz
 * prendida/apagada), a qué escena pasa, y qué dice qué personaje — en ese
 * orden. Vacío = no pasa nada al elegir esta acción. El diálogo es una
 * línea suelta generada por el editor (Scene.dialogueNodes), no un nodo del
 * guion armado a mano con choices/ramificaciones. */
function ActionComposer({
  label,
  actions,
  dialogueNodes,
  strings,
  sceneOptions,
  characters,
  backgroundOptions,
  onChange,
}: {
  label: string;
  actions: SceneAction[];
  dialogueNodes: Record<string, DialogueNode>;
  strings: Record<string, string>;
  sceneOptions: { id: string; act: number }[];
  characters: Character[];
  backgroundOptions: { id: string }[];
  onChange: (patch: Partial<ActionComposerValue>) => void;
}): JSX.Element {
  const value = resolveActionComposerValue(actions, dialogueNodes, strings);

  return (
    <div className="mb-2 border-b border-graphite-800 pb-2 last:border-b-0 last:pb-0 last:mb-0">
      <p className="mb-1 text-[9px] font-semibold tracking-widest text-graphite-400 uppercase">{label}</p>
      {backgroundOptions.length > 1 && (
        <div className="mb-1 grid grid-cols-2 gap-1">
          <label className="flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Alternar fondo A</span>
            <select
              value={value.backgroundIdA}
              onChange={(event) => onChange({ backgroundIdA: event.target.value })}
              className={inputClassName}
            >
              <option value="">(ninguno)</option>
              {backgroundOptions.map((bg) => (
                <option key={bg.id} value={bg.id}>
                  {bg.id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">con B</span>
            <select
              value={value.backgroundIdB}
              onChange={(event) => onChange({ backgroundIdB: event.target.value })}
              className={inputClassName}
            >
              <option value="">(ninguno)</option>
              {backgroundOptions.map((bg) => (
                <option key={bg.id} value={bg.id}>
                  {bg.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Escena que activa</span>
        <select
          value={value.sceneId}
          onChange={(event) => onChange({ sceneId: event.target.value })}
          className={inputClassName}
        >
          <option value="">(ninguna)</option>
          {sceneOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.id}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Personaje que habla</span>
        <select
          value={value.characterId}
          onChange={(event) =>
            onChange({ characterId: event.target.value, dialogueText: event.target.value ? value.dialogueText : '' })
          }
          className={inputClassName}
        >
          <option value="">(ninguno)</option>
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {translate(strings, character.name)}
            </option>
          ))}
        </select>
      </label>
      {value.characterId && (
        <label className="flex flex-col">
          <span className="text-[9px] text-graphite-500 uppercase">Diálogo</span>
          <textarea
            value={value.dialogueText}
            onChange={(event) => onChange({ dialogueText: event.target.value })}
            rows={2}
            className={inputClassName}
          />
        </label>
      )}
    </div>
  );
}

/** "Interactuar con" no corre una acción fija: cada objeto puede combinarse
 * con varios otros (diario + tijera, diario + lupa...), cada combinación
 * con su propia acción — en el juego, elegir "Interactuar con" pone al
 * juego a esperar el segundo click; si el par tiene una entrada acá, corre
 * esa acción, si no muestra un mensaje genérico (ver interactWith.noMatch). */
function InteractWithTargetsSection({
  targets,
  dialogueNodes,
  strings,
  sceneOptions,
  characters,
  backgroundOptions,
  otherObjects,
  onAddTarget,
  onRemoveTarget,
  onTargetChange,
}: {
  targets: InteractWithTarget[];
  dialogueNodes: Record<string, DialogueNode>;
  strings: Record<string, string>;
  sceneOptions: { id: string; act: number }[];
  characters: Character[];
  backgroundOptions: { id: string }[];
  otherObjects: { id: string; label: string }[];
  onAddTarget: (targetObjectId: string) => void;
  onRemoveTarget: (targetObjectId: string) => void;
  onTargetChange: (targetObjectId: string, patch: Partial<ActionComposerValue>) => void;
}): JSX.Element {
  const [newTargetId, setNewTargetId] = useState('');
  const availableObjects = otherObjects.filter((o) => !targets.some((t) => t.targetObjectId === o.id));

  return (
    <div className="mb-2">
      <p className="mb-1 text-[9px] font-semibold tracking-widest text-graphite-400 uppercase">Interactuar con</p>
      {targets.map((target) => {
        const targetLabel = otherObjects.find((o) => o.id === target.targetObjectId)?.label ?? target.targetObjectId;
        return (
          <div key={target.targetObjectId} className="mb-2 rounded border border-graphite-700 bg-graphite-900/60 p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[10px] text-graphite-300">+ {targetLabel}</p>
              <button
                type="button"
                onClick={() => onRemoveTarget(target.targetObjectId)}
                className="text-[9px] text-graphite-500 uppercase hover:text-red-400"
              >
                eliminar
              </button>
            </div>
            <ActionComposer
              label="Acción"
              actions={target.onInteract}
              dialogueNodes={dialogueNodes}
              strings={strings}
              sceneOptions={sceneOptions}
              characters={characters}
              backgroundOptions={backgroundOptions}
              onChange={(patch) => onTargetChange(target.targetObjectId, patch)}
            />
          </div>
        );
      })}
      {availableObjects.length > 0 && (
        <div className="flex gap-1">
          <select value={newTargetId} onChange={(event) => setNewTargetId(event.target.value)} className={inputClassName}>
            <option value="">(elegir objeto)</option>
            {availableObjects.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!newTargetId) return;
              onAddTarget(newTargetId);
              setNewTargetId('');
            }}
            disabled={!newTargetId}
            className="shrink-0 rounded border border-amber-accent px-2 py-1 text-[9px] font-semibold tracking-widest text-amber-accent uppercase transition-colors hover:bg-amber-accent hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Agregar
          </button>
        </div>
      )}
    </div>
  );
}

/** "Interactuar" de un objeto compone escena+diálogo (como Examinar) O
 * abre un minijuego — son alternativas, prender esto reemplaza lo que
 * hubiera en "Interactuar" de arriba. onSuccess/onFail reusan el mismo
 * ActionComposer que todo lo demás. */
function MinigameSection({
  minigameEnabled,
  sequenceLength,
  onSuccess,
  onFail,
  dialogueNodes,
  strings,
  sceneOptions,
  characters,
  backgroundOptions,
  onSetMinigameEnabled,
  onSequenceLengthChange,
  onSuccessChange,
  onFailChange,
}: {
  minigameEnabled: boolean;
  sequenceLength: number;
  onSuccess: SceneAction[];
  onFail: SceneAction[];
  dialogueNodes: Record<string, DialogueNode>;
  strings: Record<string, string>;
  sceneOptions: { id: string; act: number }[];
  characters: Character[];
  backgroundOptions: { id: string }[];
  onSetMinigameEnabled: (enabled: boolean) => void;
  onSequenceLengthChange: (length: number) => void;
  onSuccessChange: (patch: Partial<ActionComposerValue>) => void;
  onFailChange: (patch: Partial<ActionComposerValue>) => void;
}): JSX.Element {
  return (
    <div className="mb-2">
      <label className="mb-1 flex items-center gap-1 text-[9px] text-graphite-400">
        <input
          type="checkbox"
          checked={minigameEnabled}
          onChange={(event) => onSetMinigameEnabled(event.target.checked)}
        />
        Interactuar abre un minijuego (en vez de lo de arriba)
      </label>
      {minigameEnabled && (
        <div className="rounded border border-sky-400/40 bg-graphite-900/60 p-2">
          <label className="mb-2 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Plantilla</span>
            <select value="sequence" disabled className={inputClassName}>
              <option value="sequence">Memoria de secuencia</option>
            </select>
          </label>
          <label className="mb-2 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Largo de la secuencia</span>
            <input
              type="number"
              min={2}
              max={9}
              value={sequenceLength}
              onChange={(event) => onSequenceLengthChange(Number(event.target.value))}
              className={inputClassName}
            />
          </label>
          <ActionComposer
            label="Si gana"
            actions={onSuccess}
            dialogueNodes={dialogueNodes}
            strings={strings}
            sceneOptions={sceneOptions}
            characters={characters}
            backgroundOptions={backgroundOptions}
            onChange={onSuccessChange}
          />
          <ActionComposer
            label="Si pierde"
            actions={onFail}
            dialogueNodes={dialogueNodes}
            strings={strings}
            sceneOptions={sceneOptions}
            characters={characters}
            backgroundOptions={backgroundOptions}
            onChange={onFailChange}
          />
        </div>
      )}
    </div>
  );
}

function ActionMenuFields({
  enabled,
  onExamine,
  onInteract,
  interactWithTargets,
  minigameEnabled,
  minigameSequenceLength,
  minigameOnSuccess,
  minigameOnFail,
  dialogueNodes,
  strings,
  sceneOptions,
  characters,
  backgroundOptions,
  otherObjects,
  onSetEnabled,
  onExamineChange,
  onInteractChange,
  onAddInteractWithTarget,
  onRemoveInteractWithTarget,
  onInteractWithTargetChange,
  onSetMinigameEnabled,
  onMinigameSequenceLengthChange,
  onMinigameSuccessChange,
  onMinigameFailChange,
}: {
  enabled: boolean;
  onExamine: SceneAction[];
  onInteract: SceneAction[];
  interactWithTargets: InteractWithTarget[];
  minigameEnabled: boolean;
  minigameSequenceLength: number;
  minigameOnSuccess: SceneAction[];
  minigameOnFail: SceneAction[];
  dialogueNodes: Record<string, DialogueNode>;
  strings: Record<string, string>;
  sceneOptions: { id: string; act: number }[];
  characters: Character[];
  backgroundOptions: { id: string }[];
  otherObjects: { id: string; label: string }[];
  onSetEnabled: (enabled: boolean) => void;
  onExamineChange: (patch: Partial<ActionComposerValue>) => void;
  onInteractChange: (patch: Partial<ActionComposerValue>) => void;
  onAddInteractWithTarget: (targetObjectId: string) => void;
  onRemoveInteractWithTarget: (targetObjectId: string) => void;
  onInteractWithTargetChange: (targetObjectId: string, patch: Partial<ActionComposerValue>) => void;
  onSetMinigameEnabled: (enabled: boolean) => void;
  onMinigameSequenceLengthChange: (length: number) => void;
  onMinigameSuccessChange: (patch: Partial<ActionComposerValue>) => void;
  onMinigameFailChange: (patch: Partial<ActionComposerValue>) => void;
}): JSX.Element {
  return (
    <div className="mt-2 border-t border-graphite-800 pt-2">
      <label className="mb-2 flex items-center gap-1 text-[9px] text-graphite-400">
        <input type="checkbox" checked={enabled} onChange={(event) => onSetEnabled(event.target.checked)} />
        Menú de acción (Examinar/Interactuar/Interactuar con/Cerrar) en vez de un solo click
      </label>
      {enabled && (
        <div className="rounded border border-amber-accent/40 bg-graphite-900/60 p-2">
          <p className="mb-2 text-[9px] text-graphite-500">
            El arte del menú se sube una sola vez para todo el juego en Ajustes → Menú de acción. Acá solo definís
            qué pasa al elegir cada acción en este objeto en particular.
          </p>
          <ActionComposer
            label="Examinar"
            actions={onExamine}
            dialogueNodes={dialogueNodes}
            strings={strings}
            sceneOptions={sceneOptions}
            characters={characters}
            backgroundOptions={backgroundOptions}
            onChange={onExamineChange}
          />
          {minigameEnabled ? (
            <MinigameSection
              minigameEnabled={minigameEnabled}
              sequenceLength={minigameSequenceLength}
              onSuccess={minigameOnSuccess}
              onFail={minigameOnFail}
              dialogueNodes={dialogueNodes}
              strings={strings}
              sceneOptions={sceneOptions}
              characters={characters}
              backgroundOptions={backgroundOptions}
              onSetMinigameEnabled={onSetMinigameEnabled}
              onSequenceLengthChange={onMinigameSequenceLengthChange}
              onSuccessChange={onMinigameSuccessChange}
              onFailChange={onMinigameFailChange}
            />
          ) : (
            <>
              <ActionComposer
                label="Interactuar"
                actions={onInteract}
                dialogueNodes={dialogueNodes}
                strings={strings}
                sceneOptions={sceneOptions}
                characters={characters}
                backgroundOptions={backgroundOptions}
                onChange={onInteractChange}
              />
              <MinigameSection
                minigameEnabled={minigameEnabled}
                sequenceLength={minigameSequenceLength}
                onSuccess={minigameOnSuccess}
                onFail={minigameOnFail}
                dialogueNodes={dialogueNodes}
                strings={strings}
                sceneOptions={sceneOptions}
                characters={characters}
                backgroundOptions={backgroundOptions}
                onSetMinigameEnabled={onSetMinigameEnabled}
                onSequenceLengthChange={onMinigameSequenceLengthChange}
                onSuccessChange={onMinigameSuccessChange}
                onFailChange={onMinigameFailChange}
              />
            </>
          )}
          <InteractWithTargetsSection
            targets={interactWithTargets}
            dialogueNodes={dialogueNodes}
            strings={strings}
            sceneOptions={sceneOptions}
            characters={characters}
            backgroundOptions={backgroundOptions}
            otherObjects={otherObjects}
            onAddTarget={onAddInteractWithTarget}
            onRemoveTarget={onRemoveInteractWithTarget}
            onTargetChange={onInteractWithTargetChange}
          />
        </div>
      )}
    </div>
  );
}

function ObjectFields({
  object,
  strings,
  sceneOptions,
  dialogueNodes,
  characters,
  backgroundOptions,
  otherObjects,
  onRectChange,
  onInteractableChange,
  onLabelTextChange,
  onLabelStyleChange,
  onResetShape,
  onRemoveZone,
  onSetActionMenuEnabled,
  onExamineActionChange,
  onInteractActionChange,
  onAddInteractWithTarget,
  onRemoveInteractWithTarget,
  onInteractWithTargetChange,
  onSetMinigameEnabled,
  onMinigameSequenceLengthChange,
  onMinigameSuccessChange,
  onMinigameFailChange,
}: {
  object: EditableObject;
  strings: Record<string, string>;
  sceneOptions: { id: string; act: number }[];
  dialogueNodes: Record<string, DialogueNode>;
  characters: Character[];
  backgroundOptions: { id: string }[];
  otherObjects: { id: string; label: string }[];
  onRectChange: (rect: EditableRect) => void;
  onInteractableChange: (interactable: boolean) => void;
  onLabelTextChange: (text: string) => void;
  onLabelStyleChange: (patch: Partial<TextStyleOverride> | null) => void;
  onResetShape: () => void;
  onRemoveZone: () => void;
  onSetActionMenuEnabled: (enabled: boolean) => void;
  onExamineActionChange: (patch: Partial<ActionComposerValue>) => void;
  onInteractActionChange: (patch: Partial<ActionComposerValue>) => void;
  onAddInteractWithTarget: (targetObjectId: string) => void;
  onRemoveInteractWithTarget: (targetObjectId: string) => void;
  onInteractWithTargetChange: (targetObjectId: string, patch: Partial<ActionComposerValue>) => void;
  onSetMinigameEnabled: (enabled: boolean) => void;
  onMinigameSequenceLengthChange: (length: number) => void;
  onMinigameSuccessChange: (patch: Partial<ActionComposerValue>) => void;
  onMinigameFailChange: (patch: Partial<ActionComposerValue>) => void;
}): JSX.Element {
  const hasCustomStyle = object.labelStyle !== undefined;
  const isPolygon = object.shape === 'polygon';
  const minigameAction = object.onInteract[0]?.type === 'openMinigame' ? object.onInteract[0] : undefined;

  return (
    <div className="mb-2 border-b border-graphite-800 pb-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-graphite-100">
          {object.id}
          {object.kind === 'zone' && <span className="ml-1 text-sky-400">· zona</span>}
          {isPolygon && <span className="ml-1 text-amber-accent">· forma libre</span>}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1 text-[9px] text-graphite-400">
            <input
              type="checkbox"
              checked={object.interactable}
              onChange={(event) => onInteractableChange(event.target.checked)}
            />
            interactuable
          </label>
          {object.labelKey && (
            <button
              type="button"
              onClick={onRemoveZone}
              title={object.kind === 'sprite' ? 'Elimina la zona clickeable, la imagen queda' : 'Elimina la zona'}
              className="text-[9px] text-graphite-500 uppercase hover:text-red-400"
            >
              eliminar
            </button>
          )}
        </div>
      </div>

      {object.labelKey && (
        <>
          <label className="mb-1 flex flex-col">
            <span className="text-[9px] text-graphite-500 uppercase">Texto al pasar el mouse</span>
            <input
              type="text"
              value={strings[object.labelKey] ?? translate(strings, object.labelKey)}
              onChange={(event) => onLabelTextChange(event.target.value)}
              className={inputClassName}
            />
          </label>

          <label className="mb-1 flex items-center gap-1 text-[9px] text-graphite-400">
            <input
              type="checkbox"
              checked={hasCustomStyle}
              onChange={(event) => onLabelStyleChange(event.target.checked ? {} : null)}
            />
            Estilo propio (pisa los ajustes generales)
          </label>
          {hasCustomStyle && (
            <div className="mb-1 grid grid-cols-3 gap-1">
              <label className="flex flex-col">
                <span className="text-[9px] text-graphite-500 uppercase">Fuente</span>
                <select
                  value={object.labelStyle?.fontFamily ?? ''}
                  onChange={(event) =>
                    onLabelStyleChange({ fontFamily: (event.target.value || undefined) as FontFamily | undefined })
                  }
                  className={inputClassName}
                >
                  <option value="">(general)</option>
                  <option value="sans">Sans</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Mono</option>
                  <option value="comic-sans">Comic Sans</option>
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-[9px] text-graphite-500 uppercase">Tamaño</span>
                <input
                  type="number"
                  min={8}
                  max={48}
                  placeholder="general"
                  value={object.labelStyle?.fontSize ?? ''}
                  onChange={(event) =>
                    onLabelStyleChange({ fontSize: event.target.value === '' ? undefined : Number(event.target.value) })
                  }
                  className={inputClassName}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-[9px] text-graphite-500 uppercase">Color</span>
                <input
                  type="color"
                  value={object.labelStyle?.color ?? '#e6eaef'}
                  onChange={(event) => onLabelStyleChange({ color: event.target.value })}
                  className="h-6 w-full cursor-pointer rounded border border-graphite-700 bg-graphite-900"
                />
              </label>
            </div>
          )}
        </>
      )}

      {isPolygon ? (
        <button
          type="button"
          onClick={onResetShape}
          className="mt-1 w-full rounded border border-graphite-700 px-2 py-1 text-[9px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
        >
          Reiniciar forma ({object.points?.length ?? 0} puntos)
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-1">
          {(['x', 'y', 'width', 'height'] as const).map((key) => (
            <label key={key} className="flex flex-col">
              <span className="text-[9px] text-graphite-500 uppercase">{key}</span>
              <input
                type="number"
                step={0.5}
                value={Math.round(object.rect[key] * 10) / 10}
                onChange={(event) => onRectChange({ ...object.rect, [key]: Number(event.target.value) })}
                className={inputClassName}
              />
            </label>
          ))}
        </div>
      )}

      {object.labelKey && (
        <ActionMenuFields
          enabled={object.actionMenuEnabled}
          onExamine={object.onExamine}
          onInteract={object.onInteract}
          interactWithTargets={object.interactWithTargets}
          minigameEnabled={minigameAction !== undefined}
          minigameSequenceLength={minigameAction?.sequenceLength ?? 4}
          minigameOnSuccess={minigameAction?.onSuccess ?? []}
          minigameOnFail={minigameAction?.onFail ?? []}
          dialogueNodes={dialogueNodes}
          strings={strings}
          sceneOptions={sceneOptions}
          characters={characters}
          backgroundOptions={backgroundOptions}
          otherObjects={otherObjects.filter((o) => o.id !== object.id)}
          onSetEnabled={onSetActionMenuEnabled}
          onExamineChange={onExamineActionChange}
          onInteractChange={onInteractActionChange}
          onAddInteractWithTarget={onAddInteractWithTarget}
          onRemoveInteractWithTarget={onRemoveInteractWithTarget}
          onInteractWithTargetChange={onInteractWithTargetChange}
          onSetMinigameEnabled={onSetMinigameEnabled}
          onMinigameSequenceLengthChange={onMinigameSequenceLengthChange}
          onMinigameSuccessChange={onMinigameSuccessChange}
          onMinigameFailChange={onMinigameFailChange}
        />
      )}
    </div>
  );
}

function CreateZoneForm({
  onCreate,
}: {
  onCreate: (name: string, labelText: string, interactable: boolean, shape: HotspotShape) => void;
}): JSX.Element {
  const [name, setName] = useState('');
  const [labelText, setLabelText] = useState('');
  const [interactable, setInteractable] = useState(true);
  const [shape, setShape] = useState<HotspotShape>('rect');

  function submit(): void {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onCreate(trimmedName, labelText.trim() || trimmedName, interactable, shape);
    setName('');
    setLabelText('');
    setInteractable(true);
    setShape('rect');
  }

  return (
    <div className="mb-3 rounded border border-sky-400/40 bg-graphite-900/60 p-2">
      <p className="mb-2 text-[10px] font-semibold tracking-widest text-sky-400 uppercase">+ Crear zona nueva</p>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Nombre (id interno)</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} className={inputClassName} />
      </label>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Texto al pasar el mouse</span>
        <input
          type="text"
          value={labelText}
          onChange={(event) => setLabelText(event.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="mb-1 flex flex-col">
        <span className="text-[9px] text-graphite-500 uppercase">Forma</span>
        <select value={shape} onChange={(event) => setShape(event.target.value as HotspotShape)} className={inputClassName}>
          <option value="rect">Rectángulo</option>
          <option value="polygon">Libre (a click, como un path)</option>
        </select>
      </label>
      <label className="mb-2 flex items-center gap-1 text-[9px] text-graphite-400">
        <input type="checkbox" checked={interactable} onChange={(event) => setInteractable(event.target.checked)} />
        interactuable
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className="w-full rounded border border-sky-400 px-2 py-1 text-[10px] font-semibold tracking-widest text-sky-400 uppercase transition-colors hover:bg-sky-400 hover:text-graphite-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-sky-400"
      >
        Crear
      </button>
    </div>
  );
}

function PolygonDraftStatus({ pointCount, onCancel }: { pointCount: number; onCancel: () => void }): JSX.Element {
  return (
    <div className="mb-3 rounded border border-amber-accent/40 bg-graphite-900/60 p-2">
      <p className="mb-1 text-[10px] font-semibold tracking-widest text-amber-accent uppercase">Trazando forma</p>
      <p className="mb-2 text-[9px] text-graphite-400">
        Hacé click sobre la escena para agregar puntos ({pointCount} hasta ahora). Click cerca del primer punto (con
        al menos 3) para cerrar la forma.
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded border border-graphite-700 px-2 py-1 text-[10px] tracking-widest text-graphite-300 uppercase transition-colors hover:border-amber-accent hover:text-amber-accent"
      >
        Cancelar
      </button>
    </div>
  );
}

export function SceneEditorPanel({
  gameId,
  scene,
  strings,
  characters,
  sceneOptions,
  activeSceneId,
  creatingScene,
  uploadingBackground,
  onSwitchScene,
  onCreateScene,
  onAddBackground,
  onRemoveBackground,
  onBackgroundDurationChange,
  onBackgroundColorChange,
  onBackgroundImageWidthChange,
  onChangeKind,
  onChangeIntroSkippable,
  onChangeIntroCompleteTarget,
  onChangeMenuAppearance,
  onSetMenuTitleEnabled,
  onMenuTitleTextChange,
  onChangeMenuTitleAppearance,
  onAddMenuButton,
  onRemoveMenuButton,
  onMenuButtonLabelTextChange,
  onMenuButtonTargetChange,
  onObjectRectChange,
  onToggleInteractable,
  onLabelTextChange,
  onLabelStyleChange,
  onCreateZone,
  polygonDraftPointCount,
  onCancelPolygonDraft,
  onResetShape,
  onRemoveZone,
  onSetActionMenuEnabled,
  onExamineActionChange,
  onInteractActionChange,
  onAddInteractWithTarget,
  onRemoveInteractWithTarget,
  onInteractWithTargetChange,
  onSetMinigameEnabled,
  onMinigameSequenceLengthChange,
  onMinigameSuccessChange,
  onMinigameFailChange,
}: {
  gameId: string;
  scene: Scene | null;
  strings: Record<string, string>;
  characters: Character[];
  sceneOptions: { id: string; act: number }[];
  activeSceneId: string;
  creatingScene: boolean;
  uploadingBackground: boolean;
  onSwitchScene: (sceneId: string) => void;
  onCreateScene: (name: string, act: number, kind: SceneKind) => void;
  onAddBackground: (file: File) => void;
  onRemoveBackground: (bgId: string) => void;
  onBackgroundDurationChange: (bgId: string, durationMs: number) => void;
  onBackgroundColorChange: (bgId: string, color: string | undefined) => void;
  onBackgroundImageWidthChange: (bgId: string, widthPercent: number | undefined) => void;
  onChangeKind: (kind: SceneKind) => void;
  onChangeIntroSkippable: (skippable: boolean) => void;
  onChangeIntroCompleteTarget: (sceneId: string) => void;
  onChangeMenuAppearance: (patch: Partial<MenuAppearance>) => void;
  onSetMenuTitleEnabled: (enabled: boolean) => void;
  onMenuTitleTextChange: (labelKey: string, text: string) => void;
  onChangeMenuTitleAppearance: (patch: Partial<Omit<MenuTitle, 'text'>>) => void;
  onAddMenuButton: (name: string, labelText: string) => void;
  onRemoveMenuButton: (buttonId: string) => void;
  onMenuButtonLabelTextChange: (labelKey: string, text: string) => void;
  onMenuButtonTargetChange: (buttonId: string, sceneId: string) => void;
  onObjectRectChange: (objectId: string, rect: EditableRect) => void;
  onToggleInteractable: (objectId: string, interactable: boolean) => void;
  onLabelTextChange: (labelKey: string, text: string) => void;
  onLabelStyleChange: (objectId: string, patch: Partial<TextStyleOverride> | null) => void;
  onCreateZone: (name: string, labelText: string, interactable: boolean, shape: HotspotShape) => void;
  /** No null mientras se está trazando una zona de forma libre nueva. */
  polygonDraftPointCount: number | null;
  onCancelPolygonDraft: () => void;
  onResetShape: (objectId: string) => void;
  onRemoveZone: (objectId: string) => void;
  onSetActionMenuEnabled: (objectId: string, enabled: boolean) => void;
  onExamineActionChange: (objectId: string, patch: Partial<ActionComposerValue>) => void;
  onInteractActionChange: (objectId: string, patch: Partial<ActionComposerValue>) => void;
  onAddInteractWithTarget: (objectId: string, targetObjectId: string) => void;
  onRemoveInteractWithTarget: (objectId: string, targetObjectId: string) => void;
  onInteractWithTargetChange: (objectId: string, targetObjectId: string, patch: Partial<ActionComposerValue>) => void;
  onSetMinigameEnabled: (objectId: string, enabled: boolean) => void;
  onMinigameSequenceLengthChange: (objectId: string, sequenceLength: number) => void;
  onMinigameSuccessChange: (objectId: string, patch: Partial<ActionComposerValue>) => void;
  onMinigameFailChange: (objectId: string, patch: Partial<ActionComposerValue>) => void;
}): JSX.Element {
  return (
    <div className="text-xs text-graphite-200">
      <SceneSwitcher
        sceneOptions={sceneOptions}
        activeSceneId={activeSceneId}
        creatingScene={creatingScene}
        onSwitchScene={onSwitchScene}
        onCreateScene={onCreateScene}
      />

      {scene === null ? (
        <p className="text-[10px] text-graphite-500">
          No hay ninguna escena todavía — creá una desde arriba para empezar a editarla.
        </p>
      ) : (
        <>
          <label className="mb-3 flex flex-col border-b border-graphite-800 pb-3">
            <span className="text-[9px] text-graphite-500 uppercase">Tipo de escena</span>
            <select
              value={scene.kind}
              onChange={(event) => onChangeKind(event.target.value as SceneKind)}
              className={inputClassName}
            >
              <option value="standard">Estándar (point-and-click)</option>
              <option value="intro">Intro (secuencia de fondos por tiempo)</option>
              <option value="menu">Menú (fondo con botones)</option>
            </select>
          </label>

          <BackgroundsSection
            gameId={gameId}
            scene={scene}
            uploading={uploadingBackground}
            onAddBackground={onAddBackground}
            onRemoveBackground={onRemoveBackground}
            onDurationChange={onBackgroundDurationChange}
            onBackgroundColorChange={onBackgroundColorChange}
            onImageWidthChange={onBackgroundImageWidthChange}
          />

          {scene.kind === 'intro' ? (
            <IntroSettings
              scene={scene}
              sceneOptions={sceneOptions}
              onChangeIntroSkippable={onChangeIntroSkippable}
              onChangeIntroCompleteTarget={onChangeIntroCompleteTarget}
            />
          ) : scene.kind === 'menu' ? (
            <MenuSettings
              scene={scene}
              strings={strings}
              sceneOptions={sceneOptions}
              onChangeAppearance={onChangeMenuAppearance}
              onSetTitleEnabled={onSetMenuTitleEnabled}
              onTitleTextChange={onMenuTitleTextChange}
              onChangeTitleAppearance={onChangeMenuTitleAppearance}
              onAddButton={onAddMenuButton}
              onRemoveButton={onRemoveMenuButton}
              onButtonLabelTextChange={onMenuButtonLabelTextChange}
              onButtonTargetChange={onMenuButtonTargetChange}
            />
          ) : (
            <>
              <p className="mb-3 text-[10px] text-graphite-400">
                <span className="text-amber-accent">Ámbar</span> = objeto con imagen propia.{' '}
                <span className="text-sky-400">Celeste</span> = zona sin imagen aparte. Nada cambia hasta que
                aprietes Guardar.
              </p>

              {polygonDraftPointCount !== null ? (
                <PolygonDraftStatus pointCount={polygonDraftPointCount} onCancel={onCancelPolygonDraft} />
              ) : (
                <CreateZoneForm onCreate={onCreateZone} />
              )}

              {(() => {
                const editableObjects = buildEditableObjects(scene);
                const otherObjects = editableObjects
                  .filter((o) => o.labelKey)
                  .map((o) => ({ id: o.id, label: o.labelKey ? translate(strings, o.labelKey) : o.id }));
                const backgroundOptions = scene.backgrounds.map((bg) => ({ id: bg.id }));
                return editableObjects.map((object) => (
                  <ObjectFields
                    key={object.id}
                    object={object}
                    strings={strings}
                    sceneOptions={sceneOptions}
                    dialogueNodes={scene.dialogueNodes}
                    characters={characters}
                    backgroundOptions={backgroundOptions}
                    otherObjects={otherObjects}
                    onRectChange={(rect) => onObjectRectChange(object.id, rect)}
                    onInteractableChange={(interactable) => onToggleInteractable(object.id, interactable)}
                    onLabelTextChange={(text) =>
                      onLabelTextChange(object.labelKey ?? `hotspot.${scene.id}.${object.id}`, text)
                    }
                    onLabelStyleChange={(patch) => onLabelStyleChange(object.id, patch)}
                    onResetShape={() => onResetShape(object.id)}
                    onRemoveZone={() => onRemoveZone(object.id)}
                    onSetActionMenuEnabled={(enabled) => onSetActionMenuEnabled(object.id, enabled)}
                    onExamineActionChange={(patch) => onExamineActionChange(object.id, patch)}
                    onInteractActionChange={(patch) => onInteractActionChange(object.id, patch)}
                    onAddInteractWithTarget={(targetObjectId) => onAddInteractWithTarget(object.id, targetObjectId)}
                    onRemoveInteractWithTarget={(targetObjectId) =>
                      onRemoveInteractWithTarget(object.id, targetObjectId)
                    }
                    onInteractWithTargetChange={(targetObjectId, patch) =>
                      onInteractWithTargetChange(object.id, targetObjectId, patch)
                    }
                    onSetMinigameEnabled={(enabled) => onSetMinigameEnabled(object.id, enabled)}
                    onMinigameSequenceLengthChange={(length) => onMinigameSequenceLengthChange(object.id, length)}
                    onMinigameSuccessChange={(patch) => onMinigameSuccessChange(object.id, patch)}
                    onMinigameFailChange={(patch) => onMinigameFailChange(object.id, patch)}
                  />
                ));
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
}
