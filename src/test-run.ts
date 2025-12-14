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

  /**
   * BENCHMARK-GRADE SOLUTION PATH (35+ meaningful steps):
   *
   * This tests the full dependency chain:
   * 1. Explore desk area → find paper scraps with clues
   * 2. Discover bookshelf → red books with years
   * 3. USE bookshelf → reveals drawer sequence (R2-L1-R1)
   * 4. Follow sequence: R2 drawer → UV flashlight
   * 5. USE UV flashlight on each red book → reveals letters (R, A, C)
   * 6. L1 drawer (needs key) → need to find key first
   * 7. R1 drawer → brass key
   * 8. Unlock L1 drawer with key → master note + complete cipher
   * 9. Derive code: books by year (1887→R, 1923→A, 1945→C)
   * 10. Apply cipher: R=08, A=04, C=09 → code 080409
   * 11. Verify checksum: 0+8+0+4+0+9 = 21 ✓
   * 12. ENTER_CODE → ESCAPE
   */
  const actions: AgentAction[] = [
    // Phase 1: Initial Exploration
    { action: 'LOOK', target: null, tool: null },
    { action: 'INSPECT', target: 'Wooden Desk', tool: null },
    { action: 'INSPECT', target: 'Paper Scraps', tool: null },
    { action: 'TAKE', target: 'Paper Scraps', tool: null },
    { action: 'INSPECT', target: 'Desk Calendar', tool: null },

    // Phase 2: Bookshelf Investigation
    { action: 'MOVE', target: 'Bookshelf', tool: null },
    { action: 'LOOK', target: null, tool: null },
    { action: 'INSPECT', target: 'Bookshelf', tool: null },
    { action: 'USE', target: 'Bookshelf', tool: null }, // Reveals scratch marks R2-L1-R1
    { action: 'INSPECT', target: 'Scratch Marks', tool: null },

    // Phase 3: Follow Drawer Sequence (R2 first - gets UV flashlight)
    { action: 'MOVE', target: 'Desk Area', tool: null },
    { action: 'USE', target: 'Bottom-Right Drawer', tool: null }, // R2 - UV flashlight
    { action: 'TAKE', target: 'UV Flashlight', tool: null },
    { action: 'INSPECT', target: 'UV Flashlight', tool: null },

    // Phase 4: Use UV on Red Books
    { action: 'MOVE', target: 'Bookshelf', tool: null },
    { action: 'INSPECT', target: 'Reflections on Time', tool: null }, // 1887 - oldest
    { action: 'USE', target: 'Reflections on Time', tool: 'UV Flashlight' }, // Reveals "R"
    { action: 'INSPECT', target: 'Arcana of the Mind', tool: null }, // 1923 - middle
    { action: 'USE', target: 'Arcana of the Mind', tool: 'UV Flashlight' }, // Reveals "A"
    { action: 'INSPECT', target: 'Codex of Shadows', tool: null }, // 1945 - newest
    { action: 'USE', target: 'Codex of Shadows', tool: 'UV Flashlight' }, // Reveals "C"

    // Phase 5: Continue Drawer Sequence (L1 needs key, so R1 first)
    { action: 'MOVE', target: 'Desk Area', tool: null },
    { action: 'USE', target: 'Middle-Left Drawer', tool: null }, // L2 - partial cipher (bonus)
    { action: 'TAKE', target: 'Partial Cipher Card', tool: null },
    { action: 'USE', target: 'Top-Right Drawer', tool: null }, // R1 - brass key
    { action: 'TAKE', target: 'Brass Key', tool: null },

    // Phase 6: Unlock Top-Left Drawer for Master Note + Complete Cipher
    { action: 'USE', target: 'Top-Left Drawer', tool: 'Brass Key' }, // L1 - master note + cipher
    { action: 'TAKE', target: 'Master Note', tool: null },
    { action: 'INSPECT', target: 'Master Note', tool: null },
    { action: 'TAKE', target: 'Complete Cipher Card', tool: null },
    { action: 'INSPECT', target: 'Complete Cipher Card', tool: null },

    // Phase 7: Check the decoy safe (optional - tests if agent gets distracted)
    { action: 'MOVE', target: 'Exit Door', tool: null },
    { action: 'INSPECT', target: 'Wall Safe', tool: null },
    // Smart agent would NOT try 3182 on door keypad - it's for the safe

    // Phase 8: Enter Final Code
    // Derivation: Books by age: 1887(R), 1923(A), 1945(C)
    // Cipher: R=8 → 08, A=4 → 04, C=9 → 09
    // Code: 080409, Sum: 0+8+0+4+0+9 = 21 ✓
    { action: 'INSPECT', target: 'Door Keypad', tool: null },
    { action: 'ENTER_CODE', target: 'Door Keypad', tool: null, params: { code: '080409' } },
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

