/** Room coordinates: metres, x/y on floor, z up. Heading 0 faces +x. */
export interface Vec2 { x: number; y: number }
export interface Pose extends Vec2 { theta: number }
export type Polygon = Vec2[];
export interface RoomObject {
  id: string; name: string; kind: "bed" | "table" | "bench" | "wardrobe" | "custom";
  pose: Pose; width: number; depth: number; height: number;
  movable: boolean; locked: boolean; uncertainty: number;
}
export interface Door {
  id: string; name: string; hinge: Vec2; width: number; thickness: number;
  closedAngle: number; openAngle: number; fixedAngle: number; height: number;
}
export interface DeviceProfile {
  id: string; name: string; width: number; length: number; height: number;
  clearance: number; uncertainty: number; movement: "pivot" | "minimum_radius";
  minimumTurningRadius: number; allowReverse: boolean;
}
export interface JourneyTask {
  id: string; name: string; start: Pose; goal: Pose;
  positionTolerance: number; headingTolerance: number;
}
export interface RoomModel {
  schemaVersion: "1.0"; id: string; name: string; revision: number;
  width: number; depth: number; objects: RoomObject[]; door: Door;
  provenance: "provided_fixture" | "user_measured";
}
export interface EvaluationInput { room: RoomModel; profile: DeviceProfile; journey: JourneyTask }
export type TaskStatus = "verified_feasible" | "blocked_witness" | "no_path_found" | "uncertain";
export interface Witness {
  objectId: string; objectName: string; pose: Pose; footprint: Polygon;
  obstacle: Polygon; clearance: number; kind: "intersection" | "buffer" | "boundary";
}
/** A constant-curvature primitive. Rotation in place has distance=0. */
export interface Motion { start: Pose; distance: number; angle: number }
export interface TaskResult {
  id: string; name: string; status: TaskStatus; summary: string;
  witness?: Witness; path: Pose[]; motions: Motion[];
  minimumClearance: number | null; explored: number;
  assumptions: string[]; unknowns: string[];
}
export interface Evaluation {
  schemaVersion: "1.0"; solverVersion: string; revision: number; inputHash: string;
  tasks: { journey: TaskResult; door: TaskResult };
  durationMs: number; settings: { sweepTolerance: number; searchStep: number; maxNodes: number };
}
export interface EvaluationRequest extends EvaluationInput { requestId: string; generation: number }
export interface EvaluationResponse { requestId: string; generation: number; evaluation: Evaluation }
export interface Obstacle { id: string; name: string; polygon: Polygon; uncertainty: number }
export interface Clearance { distance: number; witness?: Witness }
