import { GameState } from './GameState';
import {
  AgentAction,
  ActionResult,
  ActionValidation,
  ActionType,
  GameObject,
  Room,
  SubArea,
  Puzzle,
} from '../types';

export class ActionHandler {
  private state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  validateAction(action: AgentAction): ActionValidation {
    const validActions: ActionType[] = [
      'LOOK', 'MOVE', 'INSPECT', 'USE', 'COMBINE', 'ENTER_CODE',
      'LISTEN', 'WATCH', 'TAKE', 'DROP', 'TALK', 'WRITE_NOTE',
      'ASK_CLARIFY', 'FORFEIT'
    ];

    if (!validActions.includes(action.action)) {
      return { isValid: false, errorMessage: `Invalid action type: ${action.action}` };
    }

    // Action-specific validation
    switch (action.action) {
      case 'MOVE':
        if (!action.target) {
          return { isValid: false, errorMessage: 'MOVE requires a target location' };
        }
        break;
      case 'INSPECT':
      case 'TAKE':
      case 'USE':
        if (!action.target) {
          return { isValid: false, errorMessage: `${action.action} requires a target` };
        }
        break;
      case 'COMBINE':
        if (!action.target || !action.tool) {
          return { isValid: false, errorMessage: 'COMBINE requires both target and tool' };
        }
        break;
      case 'ENTER_CODE':
        if (!action.target || !action.params?.code) {
          return { isValid: false, errorMessage: 'ENTER_CODE requires target and code param' };
        }
        break;
      case 'WRITE_NOTE':
        if (!action.params?.noteText) {
          return { isValid: false, errorMessage: 'WRITE_NOTE requires noteText param' };
        }
        break;
    }

    return { isValid: true };
  }

  executeAction(action: AgentAction): ActionResult {
    const validation = this.validateAction(action);
    if (!validation.isValid) {
      this.state.recordInvalidAction();
      return {
        success: false,
        message: validation.errorMessage || 'Invalid action',
        isInvalid: true,
      };
    }

    switch (action.action) {
      case 'LOOK': return this.handleLook();
      case 'MOVE': return this.handleMove(action.target!);
      case 'INSPECT': return this.handleInspect(action.target!);
      case 'TAKE': return this.handleTake(action.target!);
      case 'DROP': return this.handleDrop(action.target!);
      case 'USE': return this.handleUse(action.target!, action.tool);
      case 'COMBINE': return this.handleCombine(action.target!, action.tool!);
      case 'ENTER_CODE': return this.handleEnterCode(action.target!, action.params!.code!);
      case 'LISTEN': return this.handleListen(action.target);
      case 'WATCH': return this.handleWatch(action.target);
      case 'TALK': return this.handleTalk(action.target);
      case 'WRITE_NOTE': return this.handleWriteNote(action.params!.noteText!);
      case 'ASK_CLARIFY': return this.handleAskClarify(action.params?.question);
      case 'FORFEIT': return this.handleForfeit();
      default:
        return { success: false, message: 'Unknown action', isInvalid: true };
    }
  }

  private handleLook(): ActionResult {
    const location = this.state.getCurrentLocation();
    const room = this.findRoom(location);
    const subArea = this.findSubArea(location);
    
    const visibleObjects = this.getVisibleObjectsAtLocation(location);
    const exits = this.getExits(location);

    let description = '';
    if (subArea) {
      description = subArea.description;
    } else if (room) {
      description = room.description;
    }

    const objectList = visibleObjects.map(o => o.name).join(', ');
    const exitList = exits.join(', ');

    return {
      success: true,
      message: `${description}\n\nYou can see: ${objectList || 'nothing notable'}.\nExits: ${exitList || 'none visible'}.`,
    };
  }

  private handleMove(target: string): ActionResult {
    const currentLocation = this.state.getCurrentLocation();
    const exits = this.getExits(currentLocation);
    
    // Find matching exit (case-insensitive)
    const matchedExit = exits.find(e => e.toLowerCase() === target.toLowerCase());
    
    if (!matchedExit) {
      return {
        success: false,
        message: `Cannot move to "${target}". Available exits: ${exits.join(', ') || 'none'}.`,
      };
    }

    // Find the actual location ID
    const targetLocation = this.resolveLocationId(matchedExit);
    if (!targetLocation) {
      return { success: false, message: `Cannot find location: ${target}` };
    }

    this.state.setLocation(targetLocation);
    return {
      success: true,
      message: `You move to ${matchedExit}.`,
      stateChanges: { locationChanged: targetLocation },
    };
  }

  private handleInspect(target: string): ActionResult {
    const obj = this.findObjectByName(target);
    if (!obj) {
      return { success: false, message: `Cannot find "${target}" to inspect.` };
    }

    if (!this.isObjectAccessible(obj)) {
      return { success: false, message: `"${target}" is not accessible from here.` };
    }

    let description = obj.detailedDescription || obj.description;

    // Reveal hidden details
    if (obj.hiddenDetails && obj.hiddenDetails.length > 0) {
      description += '\n\n' + obj.hiddenDetails.join('\n');
      this.state.addProgress(5, `inspected_${obj.id}`);
    }

    // Reveal contained objects
    const revealed: string[] = [];
    if (obj.containedObjects) {
      for (const containedId of obj.containedObjects) {
        const contained = this.state.getObject(containedId);
        if (contained && !contained.visible) {
          this.state.updateObject(containedId, { visible: true });
          revealed.push(containedId);
          description += `\nYou discover: ${contained.name}`;
        }
      }
    }

    return {
      success: true,
      message: description,
      stateChanges: revealed.length > 0 ? { revealedObjects: revealed } : undefined,
    };
  }

  private handleTake(target: string): ActionResult {
    const obj = this.findObjectByName(target);
    if (!obj) {
      return { success: false, message: `Cannot find "${target}".` };
    }

    if (!this.isObjectAccessible(obj)) {
      return { success: false, message: `"${target}" is not accessible from here.` };
    }

    if (!obj.takeable) {
      return { success: false, message: `You cannot take the ${obj.name}.` };
    }

    if (this.state.hasInInventory(obj.id)) {
      return { success: false, message: `You already have the ${obj.name}.` };
    }

    if (!this.state.addToInventory(obj.id)) {
      return { success: false, message: 'Your inventory is full.' };
    }

    this.state.updateObject(obj.id, { location: 'inventory' });
    this.state.addProgress(5, `took_${obj.id}`);

    return {
      success: true,
      message: `You take the ${obj.name}.`,
      stateChanges: { inventoryAdded: [obj.id] },
    };
  }

  private handleDrop(target: string): ActionResult {
    const obj = this.findObjectByName(target);
    if (!obj) {
      return { success: false, message: `Cannot find "${target}" in inventory.` };
    }

    if (!this.state.hasInInventory(obj.id)) {
      return { success: false, message: `You don't have the ${obj.name}.` };
    }

    this.state.removeFromInventory(obj.id);
    this.state.updateObject(obj.id, { location: this.state.getCurrentLocation() });

    return {
      success: true,
      message: `You drop the ${obj.name}.`,
      stateChanges: { inventoryRemoved: [obj.id] },
    };
  }

  private handleUse(target: string, tool: string | null): ActionResult {
    const targetObj = this.findObjectByName(target);
    if (!targetObj) {
      return { success: false, message: `Cannot find "${target}".` };
    }

    if (!this.isObjectAccessible(targetObj)) {
      return { success: false, message: `"${target}" is not accessible.` };
    }

    // Check affordances
    for (const affordance of targetObj.affordances) {
      if (affordance.action === 'USE') {
        // Check requirements
        if (affordance.requires) {
          const hasAll = affordance.requires.every(req =>
            this.state.hasInInventory(req) || (tool && this.findObjectByName(tool)?.id === req)
          );
          if (!hasAll) continue;
        }

        // Apply changes
        if (affordance.changes) {
          this.state.updateObject(targetObj.id, { state: { ...targetObj.state, ...affordance.changes } });
        }

        // Reveal objects
        if (affordance.reveals) {
          for (const revealId of affordance.reveals) {
            this.state.updateObject(revealId, { visible: true });
          }
        }

        this.state.addProgress(10, `used_${targetObj.id}`);
        return {
          success: true,
          message: affordance.message || `You use the ${targetObj.name}.`,
          stateChanges: { revealedObjects: affordance.reveals },
        };
      }
    }

    return { success: false, message: `Cannot use ${target} that way.` };
  }

  private handleCombine(target: string, tool: string): ActionResult {
    const targetObj = this.findObjectByName(target);
    const toolObj = this.findObjectByName(tool);

    if (!targetObj || !this.state.hasInInventory(targetObj.id)) {
      return { success: false, message: `You don't have "${target}" in inventory.` };
    }
    if (!toolObj || !this.state.hasInInventory(toolObj.id)) {
      return { success: false, message: `You don't have "${tool}" in inventory.` };
    }

    // Check for combine affordance
    for (const affordance of targetObj.affordances) {
      if (affordance.action === 'COMBINE' && affordance.requires?.includes(toolObj.id)) {
        this.state.addProgress(15, `combined_${targetObj.id}_${toolObj.id}`);
        return {
          success: true,
          message: affordance.message || `You combine ${target} with ${tool}.`,
        };
      }
    }

    return { success: false, message: `Cannot combine ${target} with ${tool}.` };
  }

  private handleEnterCode(target: string, code: string): ActionResult {
    const puzzle = this.findPuzzleByName(target);
    if (!puzzle) {
      return { success: false, message: `Cannot find "${target}" to enter code.` };
    }

    if (puzzle.solved) {
      return { success: false, message: `${puzzle.name} is already solved.` };
    }

    if (puzzle.attempts >= puzzle.maxAttempts) {
      return { success: false, message: `${puzzle.name} is locked out - no more attempts.` };
    }

    // Check if this is a blind guess (no clues revealed)
    const revealedClues = puzzle.clues.filter(c => c.revealed).length;
    const isBlindGuess = revealedClues === 0;
    if (isBlindGuess) {
      this.state.recordBlindGuess();
    }

    // Increment attempts
    this.state.updatePuzzle(puzzle.id, { attempts: puzzle.attempts + 1 });

    // Check solution
    const solution = Array.isArray(puzzle.solution) ? puzzle.solution : [puzzle.solution];
    if (solution.includes(code.toUpperCase()) || solution.includes(code)) {
      this.state.updatePuzzle(puzzle.id, { solved: true });
      this.state.addProgress(puzzle.onSolve.milestonePoints, `solved_${puzzle.id}`);

      // Handle reveals/unlocks
      if (puzzle.onSolve.reveals) {
        for (const revealId of puzzle.onSolve.reveals) {
          this.state.updateObject(revealId, { visible: true });
        }
      }
      if (puzzle.onSolve.unlocks) {
        for (const unlockId of puzzle.onSolve.unlocks) {
          this.state.updatePuzzle(unlockId, { prerequisites: [] });
        }
      }

      // Check escape condition
      if (this.state.checkEscapeCondition()) {
        this.state.endGame('ESCAPED');
      }

      return {
        success: true,
        message: puzzle.onSolve.message,
        stateChanges: {
          puzzleSolved: puzzle.id,
          revealedObjects: puzzle.onSolve.reveals,
          unlockedPuzzles: puzzle.onSolve.unlocks,
        },
      };
    }

    // Wrong code
    const remaining = puzzle.maxAttempts - puzzle.attempts - 1;
    let failMessage = puzzle.onFail?.message || `Wrong code. ${remaining} attempts remaining.`;

    if (remaining <= 0 && puzzle.onFail?.consequence === 'lockout') {
      failMessage += ' The lock is now permanently locked.';
    }

    return {
      success: false,
      message: failMessage,
      isBlindGuess,
    };
  }

  private handleListen(target: string | null): ActionResult {
    const mode = this.state.getMode();
    if (mode !== 'audio+text' && mode !== 'all') {
      return { success: false, message: 'Audio is not available in this mode.' };
    }

    const assets = this.state.getAllMediaAssets().filter(a => a.type === 'audio');
    if (target) {
      const asset = assets.find(a =>
        a.id.toLowerCase() === target.toLowerCase() ||
        a.depicts.toLowerCase().includes(target.toLowerCase())
      );
      if (asset) {
        this.state.revealMediaAsset(asset.id);
        return {
          success: true,
          message: asset.transcript || `You hear: ${asset.depicts}`,
          stateChanges: { mediaRevealed: asset.id },
        };
      }
    }

    return { success: false, message: 'Nothing to listen to here.' };
  }

  private handleWatch(target: string | null): ActionResult {
    const mode = this.state.getMode();
    if (mode !== 'video+text' && mode !== 'all') {
      return { success: false, message: 'Video is not available in this mode.' };
    }

    const assets = this.state.getAllMediaAssets().filter(a => a.type === 'video');
    if (target) {
      const asset = assets.find(a =>
        a.id.toLowerCase() === target.toLowerCase() ||
        a.depicts.toLowerCase().includes(target.toLowerCase())
      );
      if (asset) {
        this.state.revealMediaAsset(asset.id);
        return {
          success: true,
          message: asset.transcript || `You watch: ${asset.depicts}`,
          stateChanges: { mediaRevealed: asset.id },
        };
      }
    }

    return { success: false, message: 'Nothing to watch here.' };
  }

  private handleTalk(_target: string | null): ActionResult {
    // NPC interaction - for now just a placeholder
    return { success: false, message: 'There is no one to talk to here.' };
  }

  private handleWriteNote(noteText: string): ActionResult {
    this.state.addNote(noteText);
    return { success: true, message: `Note recorded: "${noteText}"` };
  }

  private handleAskClarify(_question?: string): ActionResult {
    return {
      success: true,
      message: 'Available actions: LOOK, MOVE, INSPECT, TAKE, DROP, USE, COMBINE, ENTER_CODE, LISTEN, WATCH, TALK, WRITE_NOTE, ASK_CLARIFY, FORFEIT. Use the JSON schema provided to format your action.',
    };
  }

  private handleForfeit(): ActionResult {
    this.state.endGame('FORFEIT');
    return { success: true, message: 'You have forfeited the game.' };
  }

  // Helper methods
  private findRoom(locationId: string): Room | undefined {
    return this.state.getRoomSpec().rooms.find(r =>
      r.id === locationId || r.subAreas.some(s => s.id === locationId)
    );
  }

  private findSubArea(locationId: string): SubArea | undefined {
    for (const room of this.state.getRoomSpec().rooms) {
      const subArea = room.subAreas.find(s => s.id === locationId);
      if (subArea) return subArea;
    }
    return undefined;
  }

  private getVisibleObjectsAtLocation(location: string): GameObject[] {
    return this.state.getAllObjects().filter(obj =>
      obj.visible && (obj.location === location || obj.location === 'inventory')
    );
  }

  getVisibleObjects(): GameObject[] {
    const location = this.state.getCurrentLocation();
    return this.state.getAllObjects().filter(obj =>
      obj.visible && obj.location === location
    );
  }

  private getExits(location: string): string[] {
    const subArea = this.findSubArea(location);
    if (subArea) {
      return subArea.connectedTo.map(id => {
        const connected = this.findSubArea(id);
        return connected?.name || id;
      });
    }

    const room = this.findRoom(location);
    if (room && room.subAreas.length > 0) {
      return room.subAreas.map(s => s.name);
    }

    return [];
  }

  getExitsForLocation(): string[] {
    return this.getExits(this.state.getCurrentLocation());
  }

  private resolveLocationId(name: string): string | undefined {
    for (const room of this.state.getRoomSpec().rooms) {
      if (room.name.toLowerCase() === name.toLowerCase()) return room.id;
      for (const sub of room.subAreas) {
        if (sub.name.toLowerCase() === name.toLowerCase()) return sub.id;
      }
    }
    return undefined;
  }

  private findObjectByName(name: string): GameObject | undefined {
    return this.state.getAllObjects().find(obj =>
      obj.name.toLowerCase() === name.toLowerCase() || obj.id.toLowerCase() === name.toLowerCase()
    );
  }

  private findPuzzleByName(name: string): Puzzle | undefined {
    return this.state.getAllPuzzles().find(p =>
      p.name.toLowerCase() === name.toLowerCase() || p.id.toLowerCase() === name.toLowerCase()
    );
  }

  private isObjectAccessible(obj: GameObject): boolean {
    const location = this.state.getCurrentLocation();
    // Check direct location match
    if (obj.location === location || obj.location === 'inventory') {
      return true;
    }
    // Check if in inventory
    if (this.state.hasInInventory(obj.id)) {
      return true;
    }
    // Check if object is contained in something at current location
    const allObjects = this.state.getAllObjects();
    for (const container of allObjects) {
      if (container.location === location && container.containedObjects?.includes(obj.id)) {
        return true;
      }
    }
    return false;
  }
}

