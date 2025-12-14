import {
  RoomSpec,
  GameConfig,
  GameObject,
  Puzzle,
  MediaAsset,
  GameMode,
  ScoringProfile,
  TimeBudget,
} from '../types';

export interface ScoreState {
  completion: number;
  progress: number;
  efficiency: number;
  compliance: number;
  invalidActions: number;
  blindGuesses: number;
  milestonesReached: string[];
}

export class GameState {
  private config: GameConfig;
  private currentLocation: string;
  private inventory: string[];
  private objects: Map<string, GameObject>;
  private puzzles: Map<string, Puzzle>;
  private mediaAssets: Map<string, MediaAsset>;
  private notes: string[];
  private turn: number;
  private actionsUsed: number;
  private score: ScoreState;
  private gameEnded: boolean;
  private endReason: 'ESCAPED' | 'TIMEOUT' | 'FORFEIT' | 'FAILED' | null;

  constructor(config: GameConfig) {
    this.config = config;
    this.currentLocation = config.roomSpec.initialLocation;
    this.inventory = [];
    this.notes = [];
    this.turn = 1;
    this.actionsUsed = 0;
    this.gameEnded = false;
    this.endReason = null;

    // Deep clone objects to avoid mutating spec
    this.objects = new Map();
    for (const obj of config.roomSpec.objects) {
      this.objects.set(obj.id, JSON.parse(JSON.stringify(obj)));
    }

    this.puzzles = new Map();
    for (const puzzle of config.roomSpec.puzzles) {
      this.puzzles.set(puzzle.id, JSON.parse(JSON.stringify(puzzle)));
    }

    this.mediaAssets = new Map();
    for (const asset of config.roomSpec.mediaAssets) {
      this.mediaAssets.set(asset.id, JSON.parse(JSON.stringify(asset)));
    }

    this.score = {
      completion: 0,
      progress: 0,
      efficiency: 0,
      compliance: 100,
      invalidActions: 0,
      blindGuesses: 0,
      milestonesReached: [],
    };
  }

  // Getters
  getConfig(): GameConfig { return this.config; }
  getRoomSpec(): RoomSpec { return this.config.roomSpec; }
  getMode(): GameMode { return this.config.mode; }
  getScoringProfile(): ScoringProfile { return this.config.scoringProfile; }
  getTimeBudget(): TimeBudget { return this.config.timeBudget; }
  getCurrentLocation(): string { return this.currentLocation; }
  getInventory(): string[] { return [...this.inventory]; }
  getNotes(): string[] { return [...this.notes]; }
  getTurn(): number { return this.turn; }
  getActionsUsed(): number { return this.actionsUsed; }
  getScore(): ScoreState { return { ...this.score }; }
  isGameEnded(): boolean { return this.gameEnded; }
  getEndReason() { return this.endReason; }

  getObject(id: string): GameObject | undefined {
    return this.objects.get(id);
  }

  getPuzzle(id: string): Puzzle | undefined {
    return this.puzzles.get(id);
  }

  getMediaAsset(id: string): MediaAsset | undefined {
    return this.mediaAssets.get(id);
  }

  getAllObjects(): GameObject[] {
    return Array.from(this.objects.values());
  }

  getAllPuzzles(): Puzzle[] {
    return Array.from(this.puzzles.values());
  }

  getAllMediaAssets(): MediaAsset[] {
    return Array.from(this.mediaAssets.values());
  }

  // State modifiers
  setLocation(location: string): void {
    this.currentLocation = location;
  }

  addToInventory(objectId: string): boolean {
    const capacity = this.config.roomSpec.inventoryCapacity;
    if (capacity && this.inventory.length >= capacity) {
      return false;
    }
    if (!this.inventory.includes(objectId)) {
      this.inventory.push(objectId);
    }
    return true;
  }

  removeFromInventory(objectId: string): boolean {
    const index = this.inventory.indexOf(objectId);
    if (index > -1) {
      this.inventory.splice(index, 1);
      return true;
    }
    return false;
  }

  hasInInventory(objectId: string): boolean {
    return this.inventory.includes(objectId);
  }

  addNote(note: string): void {
    this.notes.push(note);
  }

  updateObject(id: string, updates: Partial<GameObject>): void {
    const obj = this.objects.get(id);
    if (obj) {
      Object.assign(obj, updates);
    }
  }

  updatePuzzle(id: string, updates: Partial<Puzzle>): void {
    const puzzle = this.puzzles.get(id);
    if (puzzle) {
      Object.assign(puzzle, updates);
    }
  }

  revealMediaAsset(id: string): void {
    const asset = this.mediaAssets.get(id);
    if (asset) {
      asset.revealed = true;
    }
  }

  // Turn management
  incrementTurn(): void {
    this.turn++;
  }

  incrementActions(): void {
    this.actionsUsed++;
  }

  // Score management
  addProgress(points: number, milestone: string): void {
    this.score.progress += points;
    if (!this.score.milestonesReached.includes(milestone)) {
      this.score.milestonesReached.push(milestone);
    }
  }

  recordInvalidAction(): void {
    this.score.invalidActions++;
    this.score.compliance -= this.config.scoringProfile.invalidActionPenalty;
  }

  recordBlindGuess(): void {
    this.score.blindGuesses++;
    this.score.compliance -= this.config.scoringProfile.blindGuessPenalty;
  }

  setCompletion(value: number): void {
    this.score.completion = value;
  }

  // Game end
  endGame(reason: 'ESCAPED' | 'TIMEOUT' | 'FORFEIT' | 'FAILED'): void {
    this.gameEnded = true;
    this.endReason = reason;
    if (reason === 'ESCAPED') {
      this.score.completion = 100;
    }
  }

  // Check remaining resources
  getRemainingTurns(): number {
    return this.config.timeBudget.maxTurns - this.turn + 1;
  }

  getRemainingActions(): number | null {
    if (!this.config.timeBudget.maxActions) return null;
    return this.config.timeBudget.maxActions - this.actionsUsed;
  }

  // Calculate total score
  calculateTotalScore(): number {
    const profile = this.config.scoringProfile;
    const efficiencyScore = Math.max(0, 100 - (this.turn * profile.turnPenalty));

    return (
      (this.score.completion * profile.completionWeight) +
      (Math.min(100, this.score.progress) * profile.progressWeight) +
      (efficiencyScore * profile.efficiencyWeight) +
      (Math.max(0, this.score.compliance) * profile.complianceWeight)
    ) / 100;
  }

  getProgressBand(): '0' | '25' | '50' | '75' | '100' {
    const progress = this.score.progress;
    if (progress >= 100) return '100';
    if (progress >= 75) return '75';
    if (progress >= 50) return '50';
    if (progress >= 25) return '25';
    return '0';
  }

  // Check escape condition
  checkEscapeCondition(): boolean {
    const condition = this.config.roomSpec.escapeCondition;
    for (const req of condition.requirements) {
      const puzzle = this.puzzles.get(req);
      if (puzzle && !puzzle.solved) {
        return false;
      }
    }
    return true;
  }
}

