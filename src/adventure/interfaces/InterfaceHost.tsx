import type { JSX } from 'react';
import type { InterfaceId } from '../../game-engine/scene-engine/schemas';
import { AgentMarketPanel } from './AgentMarketPanel';
import { EquipmentShopPanel } from './EquipmentShopPanel';
import { MirrorInvestigationPanel } from './MirrorInvestigationPanel';

export function InterfaceHost({ interfaceId }: { interfaceId: InterfaceId }): JSX.Element | null {
  switch (interfaceId) {
    case 'mirror-investigation':
      return <MirrorInvestigationPanel />;
    case 'agent-market':
      return <AgentMarketPanel />;
    case 'equipment-shop':
      return <EquipmentShopPanel />;
    default:
      return null;
  }
}
