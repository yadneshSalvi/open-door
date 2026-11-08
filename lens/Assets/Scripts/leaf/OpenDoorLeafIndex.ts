import { scenariosIndex } from 'Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator';
import { ScenarioMetadata } from 'Leaf.lspkg/Scenarios/scenario/ScenarioMetadata';
import { OpenDoorRepairScenario } from './OpenDoorRepairScenario';
import { OpenDoorReachScenario } from './OpenDoorReachScenario';
import { OpenDoorDragScenario } from './OpenDoorDragScenario';
import { OpenDoorScaleScenario } from './OpenDoorScaleScenario';

@component
export class OpenDoorLeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenarios:ScenarioMetadata[]=[
    {id:'open-door-blocked-to-clear',typename:OpenDoorRepairScenario.getTypeName(),parameters:{__leaf__timeout_secs:'90',__leaf__diagnostic_policy:'fail-fast'}},
    {id:'open-door-surface-reach',typename:OpenDoorReachScenario.getTypeName(),parameters:{expectedStrategy:'indirect',__leaf__timeout_secs:'60',__leaf__diagnostic_policy:'fail-fast'}},
    {id:'open-door-drag-transactions',typename:OpenDoorDragScenario.getTypeName(),parameters:{expectedStrategy:'indirect',__leaf__timeout_secs:'90',__leaf__diagnostic_policy:'fail-fast'}},
    {id:'open-door-full-size-anchor',typename:OpenDoorScaleScenario.getTypeName(),parameters:{__leaf__timeout_secs:'45',__leaf__diagnostic_policy:'fail-fast'}},
  ];
}
