import { useRef, useState, type JSX, type ReactNode } from 'react';
import type {
  Hotspot as HotspotData,
  PolygonPoint,
  Scene,
  SiteSettings,
} from '../game-engine/scene-engine/schemas';
import { ActionMenu } from './ActionMenu';
import type { ActionMenuActionKind } from './adventureRuntime.store';
import { cursorCssValue } from './cursorCss';
import { translate } from '../i18n/translate';
import { buildEditableObjects } from './editor/editableObjects';
import { EditableBox, type EditableRect } from './editor/EditableBox';
import { HotspotLabelHandle } from './editor/HotspotLabelHandle';
import { PolygonPointEditor } from './editor/PolygonPointEditor';
import { HotspotArea } from './Hotspot';
import { MENU_POSITION_CLASSES, MenuButtonView } from './MenuButtonView';
import { MENU_TITLE_POSITION_CLASSES, MenuTitleView } from './MenuTitleView';
import { PlaceholderLayer } from './PlaceholderLayer';
import { resolveTextStyle } from './textStyle';
import { useStageSize } from './useStageSize';

export function SceneViewer({
  gameId,
  scene,
  strings,
  siteSettings,
  layerOverrides,
  onInteract,
  children,
  editMode = false,
  onObjectRectChange,
  onPolygonPointsChange,
  onLabelPositionChange,
  polygonDraftPoints,
  onAddPolygonDraftPoint,
  onClosePolygonDraft,
  activeActionMenuHotspotId,
  onSelectAction,
  onCloseActionMenu,
  combiningHotspotId,
  interactWithFallbackVisible,
  activeBackgroundId,
}: {
  gameId: string;
  scene: Scene;
  /** Diccionario clave → texto (locales/es.json del caso). */
  strings: Record<string, string>;
  siteSettings: SiteSettings;
  /** assetPath alternativo por layer id (p. ej. el teléfono cambia de imagen mientras suena). */
  layerOverrides?: Record<string, string> | undefined;
  onInteract: (hotspot: HotspotData) => void;
  /** Diálogo/interfaces: deben compartir el mismo stage que la escena, no la ventana completa. */
  children?: ReactNode;
  /** Modo edición: arrastrar/redimensionar objetos (capa + hotspot con el mismo id, juntos) directamente sobre la escena. */
  editMode?: boolean;
  onObjectRectChange?: (objectId: string, rect: EditableRect) => void;
  /** Mover un vértice de una zona de forma libre ya creada. */
  onPolygonPointsChange?: (objectId: string, points: PolygonPoint[]) => void;
  /** Arrastrar el tooltip de un hotspot a otra posición. */
  onLabelPositionChange?: (objectId: string, position: PolygonPoint) => void;
  /** Zona de forma libre en proceso de trazado (ver "Crear zona" en el panel) — no null mientras se están juntando puntos. */
  polygonDraftPoints?: PolygonPoint[] | null;
  onAddPolygonDraftPoint?: (point: PolygonPoint) => void;
  onClosePolygonDraft?: () => void;
  /** Id del hotspot con el menú de acción abierto — ver Hotspot.actionMenuEnabled. */
  activeActionMenuHotspotId?: string | null;
  onSelectAction?: (kind: ActionMenuActionKind) => void;
  onCloseActionMenu?: () => void;
  /** Id del primer objeto elegido para "Interactuar con" — no null mientras
   * el juego espera el segundo click. Ver combiningHotspotId en el store. */
  combiningHotspotId?: string | null;
  /** True brevemente tras intentar una combinación sin acción programada. */
  interactWithFallbackVisible?: boolean;
  /** Id del fondo activo (ver acción `toggleBackground`) — null/no
   * encontrado = usar `scene.backgrounds[0]` como siempre. */
  activeBackgroundId?: string | null;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { width, height } = useStageSize(containerRef);

  // Id del hotspot bajo el cursor: si coincide con el id de una capa, esa
  // capa se ilumina (drop-shadow sobre su propia silueta transparente) en
  // vez de dibujar un rectángulo alrededor del hotspot.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeBackground =
    (activeBackgroundId && scene.backgrounds.find((bg) => bg.id === activeBackgroundId)) || scene.backgrounds[0];

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center bg-graphite-950">
      <div
        ref={stageRef}
        className="relative overflow-hidden bg-graphite-950"
        style={{
          width,
          height,
          backgroundColor: activeBackground?.backgroundColor,
          // El cursor custom es solo para el juego real — en modo edición
          // interfiere con cursor-move/cursor-pointer de los handles.
          cursor: editMode ? undefined : cursorCssValue(gameId, siteSettings.cursor.defaultCursorPath, 'auto'),
        }}
      >
        {activeBackground ? (
          activeBackground.imageWidthPercent ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <PlaceholderLayer
                gameId={gameId}
                assetPath={activeBackground.assetPath}
                style={{ width: `${activeBackground.imageWidthPercent}%` }}
              />
            </div>
          ) : (
            <PlaceholderLayer
              gameId={gameId}
              assetPath={activeBackground.assetPath}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest text-graphite-600 uppercase">
            Sin fondo — agregá uno en el editor
          </div>
        )}

        {[...scene.layers]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => (
            <PlaceholderLayer
              key={layer.id}
              gameId={gameId}
              assetPath={layerOverrides?.[layer.id] ?? layer.assetPath}
              glow={hoveredId === layer.id}
              className="absolute object-contain"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: layer.width ? `${layer.width}%` : undefined,
                height: layer.height ? `${layer.height}%` : undefined,
                zIndex: layer.zIndex,
              }}
            />
          ))}

        {!editMode &&
          (() => {
            const combiningSource = combiningHotspotId
              ? scene.hotspots.find((h) => h.id === combiningHotspotId)
              : null;
            const combiningSourceLabel = combiningSource ? translate(strings, combiningSource.label) : null;
            return scene.hotspots
              .filter((hotspot) => hotspot.interactable)
              .map((hotspot) => (
                <HotspotArea
                  key={hotspot.id}
                  hotspot={hotspot}
                  strings={strings}
                  labelStyle={resolveTextStyle(siteSettings.hotspotLabelStyle, hotspot.labelStyle)}
                  hoverCursor={cursorCssValue(gameId, siteSettings.cursor.hoverCursorPath, 'pointer')}
                  overrideLabel={
                    combiningSourceLabel && hotspot.id !== combiningHotspotId
                      ? `Interactuar ${combiningSourceLabel} con ${translate(strings, hotspot.label)}`
                      : undefined
                  }
                  onInteract={onInteract}
                  onHoverChange={(hovering) => setHoveredId(hovering ? hotspot.id : null)}
                />
              ));
          })()}

        {scene.kind === 'menu' && scene.menuTitle && (
          <div className={MENU_TITLE_POSITION_CLASSES[scene.menuAppearance.position]}>
            <MenuTitleView
              title={scene.menuTitle}
              text={scene.menuTitle.text ? translate(strings, scene.menuTitle.text) : ''}
            />
          </div>
        )}

        {scene.kind === 'menu' && (
          <div className={MENU_POSITION_CLASSES[scene.menuAppearance.position]}>
            {scene.menuButtons.map((button) => (
              <MenuButtonView
                key={button.id}
                label={button.label ? translate(strings, button.label) : button.id}
                appearance={scene.menuAppearance}
              />
            ))}
          </div>
        )}

        {editMode &&
          onObjectRectChange &&
          buildEditableObjects(scene).map((object) => {
            const label = `${object.labelKey ? translate(strings, object.labelKey) : object.id}${object.interactable ? '' : ' · no interactuable'}`;
            return (
              <div key={object.id} className="contents">
                {object.shape === 'polygon' && object.points ? (
                  <PolygonPointEditor
                    points={object.points}
                    closed
                    stageRef={stageRef}
                    label={label}
                    onChange={(points) => onPolygonPointsChange?.(object.id, points)}
                  />
                ) : (
                  <EditableBox
                    label={label}
                    colorClassName={object.kind === 'zone' ? 'border-sky-400' : 'border-amber-accent'}
                    rect={object.rect}
                    stageRef={stageRef}
                    onChange={(rect) => onObjectRectChange(object.id, rect)}
                  />
                )}
                {object.labelKey && object.labelPosition && onLabelPositionChange && (
                  <HotspotLabelHandle
                    position={object.labelPosition}
                    text={translate(strings, object.labelKey)}
                    labelStyle={resolveTextStyle(siteSettings.hotspotLabelStyle, object.labelStyle)}
                    stageRef={stageRef}
                    onChange={(position) => onLabelPositionChange(object.id, position)}
                  />
                )}
              </div>
            );
          })}

        {polygonDraftPoints && onAddPolygonDraftPoint && onClosePolygonDraft && (
          <PolygonPointEditor
            points={polygonDraftPoints}
            closed={false}
            stageRef={stageRef}
            onAddPoint={onAddPolygonDraftPoint}
            onClose={onClosePolygonDraft}
          />
        )}

        {!editMode &&
          activeActionMenuHotspotId &&
          onSelectAction &&
          onCloseActionMenu &&
          (() => {
            const activeHotspot = scene.hotspots.find((h) => h.id === activeActionMenuHotspotId);
            if (!activeHotspot) return null;
            return (
              <ActionMenu
                gameId={gameId}
                anchor={{
                  x: activeHotspot.area.x + activeHotspot.area.width / 2,
                  y: activeHotspot.area.y + activeHotspot.area.height / 2,
                }}
                actionMenu={siteSettings.actionMenu}
                strings={strings}
                cursor={siteSettings.cursor}
                onSelectAction={onSelectAction}
                onClose={onCloseActionMenu}
              />
            );
          })()}

        {!editMode && interactWithFallbackVisible && (
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-graphite-950/90 px-4 py-2 text-sm text-graphite-100"
            style={{ zIndex: 400 }}
          >
            {translate(strings, 'interactWith.noMatch')}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
