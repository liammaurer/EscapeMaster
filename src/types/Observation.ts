// Observation and Output Type Definitions

export interface MediaObservation {
  type: 'image' | 'audio' | 'video';
  id: string;
  alt_text: string;
  available_via: string;
}

export interface StatusInfo {
  remaining_turns: number;
  remaining_actions: number | null;
  opened_locks: string[];
  solved_puzzles: string[];
  attempt_counters: { [lockOrPuzzleId: string]: number };
}

export interface Observation {
  turn: number;
  location: string;
  text: string;
  media: MediaObservation[];
  visible_objects: string[];
  exits: string[];
  inventory: string[];
  notes: string[];
  status: StatusInfo;
}

export interface ScoreUpdate {
  total: number;
  progress_band: '0' | '25' | '50' | '75' | '100';
  penalties: {
    invalid_actions: number;
    blind_guesses: number;
  };
}

export interface ActionSchema {
  action: string;
  target: string;
  tool: string;
  params: string;
}

export interface RequestAction {
  schema: ActionSchema;
  instructions: string;
}

export interface TurnOutput {
  observation: Observation;
  score_update: ScoreUpdate;
  request_action: RequestAction;
}

export type GameOutcome = 'ESCAPED' | 'TIMEOUT' | 'FORFEIT' | 'FAILED';

export interface FinalResult {
  final_result: {
    outcome: GameOutcome;
    total_score: number;
    turns_used: number;
    milestones_high_level: string[];
    violations: {
      invalid_actions: number;
      blind_guesses: number;
    };
  };
}

