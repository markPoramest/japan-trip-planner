const fs = require('fs');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  input += chunk;
});

process.stdin.on('end', () => {
  const response = {
    injectSteps: [
      {
        ephemeralMessage: "MANDATORY WORKSPACE RULE: Whenever you fix, edit, or add code in this repository, you MUST update AGENTS.md, GEMINI.md, and relevant documentation in .agents/skills/japan-trip-planner/ before finishing your turn."
      }
    ]
  };
  process.stdout.write(JSON.stringify(response));
});
