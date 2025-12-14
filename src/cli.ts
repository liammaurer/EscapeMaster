import * as readline from 'readline';
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

function createGameConfig(): GameConfig {
  return {
    roomSpec: mysteryOfficeRoom,
    seed: Date.now(),
    mode: 'text-only',
    timeBudget: defaultTimeBudget,
    scoringProfile: defaultScoringProfile,
  };
}

function parseAction(input: string): AgentAction | null {
  try {
    // Try parsing as JSON first
    return JSON.parse(input) as AgentAction;
  } catch {
    // Parse simple command format: ACTION target [with tool]
    const parts = input.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return null;

    const action = parts[0]!.toUpperCase() as AgentAction['action'];
    let target: string | null = null;
    let tool: string | null = null;
    const params: Record<string, string> = {};

    if (parts.length > 1) {
      const rest = parts.slice(1).join(' ');
      
      // Check for "with" keyword for tools
      const withIndex = rest.toLowerCase().indexOf(' with ');
      if (withIndex > -1) {
        target = rest.substring(0, withIndex);
        tool = rest.substring(withIndex + 6);
      } else if (action === 'ENTER_CODE') {
        // Format: ENTER_CODE keypad 347
        const codeParts = rest.split(' ');
        target = codeParts[0] || null;
        if (codeParts[1]) {
          params.code = codeParts[1];
        }
      } else if (action === 'WRITE_NOTE') {
        params.noteText = rest;
      } else {
        target = rest;
      }
    }

    return { action, target, tool, params };
  }
}

function isFinalResult(output: unknown): output is FinalResult {
  return typeof output === 'object' && output !== null && 'final_result' in output;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           ESCAPE MASTER - Escape Room Benchmark            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Commands: LOOK, MOVE <place>, INSPECT <object>,          ║');
  console.log('║  TAKE <item>, DROP <item>, USE <target> [with <tool>],    ║');
  console.log('║  ENTER_CODE <keypad> <code>, WRITE_NOTE <text>, FORFEIT   ║');
  console.log('║  Or enter JSON: {"action":"LOOK","target":null}           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const config = createGameConfig();
  const engine = new GameEngine(config);

  // Initialize and show first observation
  const initialOutput = engine.initialize();
  console.log(JSON.stringify(initialOutput, null, 2));
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question('> ', (input) => {
      if (!input || input.trim() === '') {
        prompt();
        return;
      }

      const action = parseAction(input);
      if (!action) {
        console.log('Invalid command format. Try: LOOK, MOVE <place>, INSPECT <object>, etc.');
        prompt();
        return;
      }

      const output = engine.processAction(action);
      console.log('');
      console.log(JSON.stringify(output, null, 2));
      console.log('');

      if (isFinalResult(output)) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`GAME OVER - ${output.final_result.outcome}`);
        console.log(`Final Score: ${output.final_result.total_score}`);
        console.log('═══════════════════════════════════════════════════════════');
        rl.close();
        return;
      }

      prompt();
    });
  };

  prompt();
}

main().catch(console.error);

