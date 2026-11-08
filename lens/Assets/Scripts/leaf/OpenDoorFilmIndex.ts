import { scenariosIndex } from 'Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator';
import { ScenarioMetadata } from 'Leaf.lspkg/Scenarios/scenario/ScenarioMetadata';
import { OpenDoorFilmScenario } from './OpenDoorFilmScenario';
import { OpenDoorScaleScenario } from './OpenDoorScaleScenario';
import { OpenDoorFullSizeFilmScenario } from './OpenDoorFullSizeFilmScenario';
import { OpenDoorShareFilmScenario } from './OpenDoorShareFilmScenario';

/** Separate capture-rehearsal registration; leaves the accepted functional index unchanged. */
@component
export class OpenDoorFilmIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenarios:ScenarioMetadata[]=[{
    id:'open-door-paced-preview',typename:OpenDoorFilmScenario.getTypeName(),parameters:{
      __leaf__timeout_secs:'120',__leaf__log_level:'WARN',
      __leaf__diagnostic_policy:'fail-fast',__leaf__diagnostic_report_duration_ms:'0',
    },
  },{
    id:'open-door-full-size-clear-film',typename:OpenDoorFullSizeFilmScenario.getTypeName(),parameters:{
      __leaf__timeout_secs:'120',__leaf__log_level:'WARN',
      __leaf__diagnostic_policy:'fail-fast',__leaf__diagnostic_report_duration_ms:'0',
    },
  },{
    id:'open-door-share-film',typename:OpenDoorShareFilmScenario.getTypeName(),parameters:{
      expectedInputHash:'d80f2566c8606cae',__leaf__timeout_secs:'120',__leaf__log_level:'WARN',
      __leaf__diagnostic_policy:'fail-fast',__leaf__diagnostic_report_duration_ms:'0',
    },
  },{
    id:'open-door-full-size-film',typename:OpenDoorScaleScenario.getTypeName(),parameters:{
      retainFullSize:'true',__leaf__timeout_secs:'45',__leaf__log_level:'WARN',
      __leaf__diagnostic_policy:'fail-fast',__leaf__diagnostic_report_duration_ms:'0',
    },
  }];
}
