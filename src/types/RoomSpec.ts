// ROOM_SPEC Type Definitions

export type GameMode = 'text-only' | 'image+text' | 'audio+text' | 'video+text' | 'all';

export interface SubArea {
  id: string;
  name: string;
  description: string;
  connectedTo: string[]; // IDs of connected sub-areas
}

export interface Room {
  id: string;
  name: string;
  description: string;
  subAreas: SubArea[];
  initialSubArea: string;
}

export interface ObjectState {
  [key: string]: string | number | boolean;
}

export interface ObjectAffordance {
  action: string;
  requires?: string[]; // item IDs or conditions
  reveals?: string[]; // object IDs to reveal
  changes?: ObjectState;
  message?: string;
}

export interface GameObject {
  id: string;
  name: string;
  description: string;
  detailedDescription?: string;
  location: string; // room/subArea ID
  visible: boolean;
  visibleWhen?: string; // condition expression
  takeable: boolean;
  state: ObjectState;
  affordances: ObjectAffordance[];
  hiddenDetails?: string[]; // revealed on INSPECT
  containedObjects?: string[]; // IDs of objects inside
}

export interface PuzzleClue {
  id: string;
  text: string;
  revealedBy?: string; // action or object interaction
  revealed: boolean;
}

export interface Puzzle {
  id: string;
  name: string;
  description: string;
  type: 'code' | 'combination' | 'sequence' | 'item-use' | 'multi-step';
  solution: string | string[];
  prerequisites: string[]; // puzzle IDs or conditions
  clues: PuzzleClue[];
  maxAttempts: number;
  attempts: number;
  solved: boolean;
  onSolve: {
    reveals?: string[];
    unlocks?: string[];
    message: string;
    milestonePoints: number;
  };
  onFail?: {
    message: string;
    consequence?: 'lockout' | 'alarm' | 'hint-removal' | 'none';
  };
}

export interface MediaAsset {
  id: string;
  type: 'image' | 'audio' | 'video';
  filename: string;
  altText: string;
  depicts: string;
  revealCondition: string; // action + target
  revealed: boolean;
  transcript?: string; // for audio/video
  keyDetails?: string[]; // what can be discovered from this asset
}

export interface EscapeCondition {
  description: string;
  requirements: string[]; // puzzle IDs or state conditions
}

export interface ScoringProfile {
  completionWeight: number;
  progressWeight: number;
  efficiencyWeight: number;
  complianceWeight: number;
  turnPenalty: number;
  invalidActionPenalty: number;
  blindGuessPenalty: number;
}

export interface TimeBudget {
  maxTurns: number;
  maxActions?: number;
}

export interface RoomSpec {
  id: string;
  name: string;
  description: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  rooms: Room[];
  objects: GameObject[];
  puzzles: Puzzle[];
  mediaAssets: MediaAsset[];
  escapeCondition: EscapeCondition;
  initialLocation: string;
  inventoryCapacity?: number;
}

export interface GameConfig {
  roomSpec: RoomSpec;
  seed: number;
  mode: GameMode;
  timeBudget: TimeBudget;
  scoringProfile: ScoringProfile;
}

