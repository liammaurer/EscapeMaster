// Automated test run of the escape room
import { GameEngine } from './engine';
import { mysteryOfficeRoom } from './rooms';
import { GameConfig, AgentAction, ScoringProfile, TimeBudget, FinalResult } from './types';

const defaultScoringProfile: ScoringProfile = {
  completionWeight: 45,
  progressWeight: 35,
  efficiencyWeight: 15,
  complianceWeight: 5,
  turnPenalty: 2,
  invalidActionPenalty: 5,
  blindGuessPenalty: 10,
};

const defaultTimeBudget: TimeBudget = {
  maxTurns: 50,
  maxActions: 100,
};

function isFinalResult(output: unknown): output is FinalResult {
  return typeof output === 'object' && output !== null && 'final_result' in output;
}

function runTest() {
  console.log('=== ESCAPE ROOM TEST RUN ===\n');

  const config: GameConfig = {
    roomSpec: mysteryOfficeRoom,
    seed: 12345,
    mode: 'text-only',
    timeBudget: defaultTimeBudget,
    scoringProfile: defaultScoringProfile,
  };

  const engine = new GameEngine(config);
  const initial = engine.initialize();
  console.log('Turn 1 - Initial State:');
  console.log(`Location: ${initial.observation.location}`);
  console.log(`Visible: ${initial.observation.visible_objects.join(', ')}`);
  console.log(`Exits: ${initial.observation.exits.join(', ')}\n`);

  // Test sequence of actions
  const actions: AgentAction[] = [
    { action: 'LOOK', target: null, tool: null },
    { action: 'INSPECT', target: 'Wooden Desk', tool: null },
    { action: 'MOVE', target: 'Bookshelf', tool: null },
    { action: 'INSPECT', target: 'Bookshelf', tool: null },
    { action: 'USE', target: 'Bookshelf', tool: null },
    { action: 'TAKE', target: 'Brass Key', tool: null },
    { action: 'MOVE', target: 'Desk Area', tool: null },
    { action: 'USE', target: 'Desk Drawer', tool: 'Brass Key' },
    { action: 'TAKE', target: 'Folded Note', tool: null },
    { action: 'INSPECT', target: 'Folded Note', tool: null },
    { action: 'MOVE', target: 'Exit Door', tool: null },
    { action: 'ENTER_CODE', target: 'Door Keypad', tool: null, params: { code: '347' } },
  ];

  let turnNum = 2;
  for (const action of actions) {
    const output = engine.processAction(action);
    
    console.log(`Turn ${turnNum} - ${action.action} ${action.target || ''}:`);
    
    if (isFinalResult(output)) {
      console.log(`\n=== GAME ENDED: ${output.final_result.outcome} ===`);
      console.log(`Final Score: ${output.final_result.total_score}`);
      console.log(`Turns Used: ${output.final_result.turns_used}`);
      console.log(`Milestones: ${output.final_result.milestones_high_level.join(', ')}`);
      break;
    }

    console.log(`  Result: ${output.observation.text.substring(0, 80)}...`);
    console.log(`  Score: ${output.score_update.total} | Progress: ${output.score_update.progress_band}%`);
    console.log(`  Inventory: ${output.observation.inventory.join(', ') || 'empty'}\n`);
    
    turnNum++;
  }
}

runTest();

