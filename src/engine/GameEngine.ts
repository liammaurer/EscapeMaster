import { GameState } from './GameState';
import { ActionHandler } from './ActionHandler';
import { ObservationGenerator } from './ObservationGenerator';
import {
  GameConfig,
  AgentAction,
  TurnOutput,
  FinalResult,
} from '../types';

export class GameEngine {
  private state: GameState;
  private actionHandler: ActionHandler;
  private observationGenerator: ObservationGenerator;
  private initialized: boolean = false;

  constructor(config: GameConfig) {
    this.state = new GameState(config);
    this.actionHandler = new ActionHandler(this.state);
    this.observationGenerator = new ObservationGenerator(this.state, this.actionHandler);
  }

  initialize(): TurnOutput {
    this.initialized = true;
    const roomSpec = this.state.getRoomSpec();
    
    // Generate initial observation with room description
    const initialRoom = roomSpec.rooms.find(r => r.id === roomSpec.initialLocation);
    let initialText = roomSpec.description + '\n\n';
    if (initialRoom) {
      initialText += initialRoom.description;
    }

    return this.observationGenerator.generateTurnOutput(initialText);
  }

  processAction(action: AgentAction): TurnOutput | FinalResult {
    if (!this.initialized) {
      throw new Error('Game not initialized. Call initialize() first.');
    }

    if (this.state.isGameEnded()) {
      return this.observationGenerator.generateFinalResult();
    }

    // Execute the action
    const result = this.actionHandler.executeAction(action);

    // If invalid action, don't consume turn (unless it's a valid but failed action)
    if (!result.isInvalid) {
      this.state.incrementTurn();
      this.state.incrementActions();
    }

    // Check for timeout
    if (this.state.getRemainingTurns() <= 0) {
      this.state.endGame('TIMEOUT');
      return this.observationGenerator.generateFinalResult();
    }

    // Check action budget
    const remainingActions = this.state.getRemainingActions();
    if (remainingActions !== null && remainingActions <= 0) {
      this.state.endGame('TIMEOUT');
      return this.observationGenerator.generateFinalResult();
    }

    // Check if game ended (escape or forfeit)
    if (this.state.isGameEnded()) {
      return this.observationGenerator.generateFinalResult();
    }

    // Return normal turn output
    return this.observationGenerator.generateTurnOutput(result.message);
  }

  isGameEnded(): boolean {
    return this.state.isGameEnded();
  }

  getState(): GameState {
    return this.state;
  }
}

// Export engine components
export { GameState } from './GameState';
export { ActionHandler } from './ActionHandler';
export { ObservationGenerator } from './ObservationGenerator';

