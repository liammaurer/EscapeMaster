import { GameState } from './GameState';
import { ActionHandler } from './ActionHandler';
import {
  TurnOutput,
  Observation,
  ScoreUpdate,
  RequestAction,
  MediaObservation,
  StatusInfo,
  FinalResult,
  GameOutcome,
} from '../types';

export class ObservationGenerator {
  private state: GameState;
  private actionHandler: ActionHandler;

  constructor(state: GameState, actionHandler: ActionHandler) {
    this.state = state;
    this.actionHandler = actionHandler;
  }

  generateTurnOutput(actionMessage: string): TurnOutput {
    return {
      observation: this.generateObservation(actionMessage),
      score_update: this.generateScoreUpdate(),
      request_action: this.generateRequestAction(),
    };
  }

  private generateObservation(actionMessage: string): Observation {
    const location = this.state.getCurrentLocation();
    const roomSpec = this.state.getRoomSpec();
    
    // Find location name
    let locationName = location;
    for (const room of roomSpec.rooms) {
      if (room.id === location) {
        locationName = room.name;
        break;
      }
      for (const sub of room.subAreas) {
        if (sub.id === location) {
          locationName = `${room.name} - ${sub.name}`;
          break;
        }
      }
    }

    // Get visible objects
    const visibleObjects = this.actionHandler.getVisibleObjects();
    const visibleObjectNames = visibleObjects.map(o => o.name);

    // Get inventory item names
    const inventory = this.state.getInventory();
    const inventoryNames = inventory.map(id => {
      const obj = this.state.getObject(id);
      return obj?.name || id;
    });

    // Get exits
    const exits = this.actionHandler.getExitsForLocation();

    // Get media based on mode
    const media = this.getAvailableMedia();

    // Build status
    const status = this.generateStatus();

    return {
      turn: this.state.getTurn(),
      location: locationName,
      text: actionMessage,
      media,
      visible_objects: visibleObjectNames,
      exits,
      inventory: inventoryNames,
      notes: this.state.getNotes(),
      status,
    };
  }

  private generateStatus(): StatusInfo {
    const puzzles = this.state.getAllPuzzles();
    const solvedPuzzles = puzzles.filter(p => p.solved).map(p => p.id);
    
    const attemptCounters: { [key: string]: number } = {};
    for (const puzzle of puzzles) {
      if (!puzzle.solved && puzzle.attempts > 0) {
        attemptCounters[puzzle.id] = puzzle.maxAttempts - puzzle.attempts;
      }
    }

    // Opened locks = puzzles that unlock things and are solved
    const openedLocks = puzzles
      .filter(p => p.solved && p.onSolve.unlocks && p.onSolve.unlocks.length > 0)
      .map(p => p.name);

    return {
      remaining_turns: this.state.getRemainingTurns(),
      remaining_actions: this.state.getRemainingActions(),
      opened_locks: openedLocks,
      solved_puzzles: solvedPuzzles,
      attempt_counters: attemptCounters,
    };
  }

  private getAvailableMedia(): MediaObservation[] {
    const mode = this.state.getMode();
    const assets = this.state.getAllMediaAssets();
    const media: MediaObservation[] = [];

    for (const asset of assets) {
      // Check mode compatibility
      if (mode === 'text-only') continue;
      if (mode === 'image+text' && asset.type !== 'image') continue;
      if (mode === 'audio+text' && asset.type !== 'audio') continue;
      if (mode === 'video+text' && asset.type !== 'video') continue;

      // Check if revealed
      if (asset.revealed) {
        media.push({
          type: asset.type,
          id: asset.id,
          alt_text: asset.altText,
          available_via: asset.revealCondition,
        });
      }
    }

    return media;
  }

  private generateScoreUpdate(): ScoreUpdate {
    const score = this.state.getScore();
    return {
      total: Math.round(this.state.calculateTotalScore() * 100) / 100,
      progress_band: this.state.getProgressBand(),
      penalties: {
        invalid_actions: score.invalidActions,
        blind_guesses: score.blindGuesses,
      },
    };
  }

  private generateRequestAction(): RequestAction {
    return {
      schema: {
        action: 'LOOK|MOVE|INSPECT|USE|COMBINE|ENTER_CODE|LISTEN|WATCH|TAKE|DROP|TALK|WRITE_NOTE|ASK_CLARIFY|FORFEIT',
        target: 'string|null',
        tool: 'string|null',
        params: 'object',
      },
      instructions: 'Reply with EXACTLY one JSON action object matching the schema.',
    };
  }

  generateFinalResult(): FinalResult {
    const score = this.state.getScore();
    const outcome: GameOutcome = this.state.getEndReason() || 'TIMEOUT';

    return {
      final_result: {
        outcome,
        total_score: Math.round(this.state.calculateTotalScore() * 100) / 100,
        turns_used: this.state.getTurn(),
        milestones_high_level: score.milestonesReached.map(m => m.replace(/_/g, ' ')),
        violations: {
          invalid_actions: score.invalidActions,
          blind_guesses: score.blindGuesses,
        },
      },
    };
  }
}

