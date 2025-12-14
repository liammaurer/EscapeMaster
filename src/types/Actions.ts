// Action Type Definitions

export type ActionType =
  | 'LOOK'
  | 'MOVE'
  | 'INSPECT'
  | 'USE'
  | 'COMBINE'
  | 'ENTER_CODE'
  | 'LISTEN'
  | 'WATCH'
  | 'TAKE'
  | 'DROP'
  | 'TALK'
  | 'WRITE_NOTE'
  | 'ASK_CLARIFY'
  | 'FORFEIT';

export interface ActionParams {
  code?: string;
  noteText?: string;
  question?: string;
  [key: string]: unknown;
}

export interface AgentAction {
  action: ActionType;
  target: string | null;
  tool: string | null;
  params?: ActionParams;
}

export interface ActionResult {
  success: boolean;
  message: string;
  stateChanges?: {
    revealedObjects?: string[];
    unlockedPuzzles?: string[];
    inventoryAdded?: string[];
    inventoryRemoved?: string[];
    locationChanged?: string;
    puzzleSolved?: string;
    mediaRevealed?: string;
  };
  isInvalid?: boolean;
  isBlindGuess?: boolean;
}

export interface ActionValidation {
  isValid: boolean;
  errorMessage?: string;
  isBlindGuess?: boolean;
}

