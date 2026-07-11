import { waitForChat } from "./helpers.js";

export const name = "Core breakcore without target core is denied";

export async function run(ctx) {
  const { assert, command, spawnBot, wait } = ctx;
  const operator = await spawnBot("BreakCoreOp");
  await spawnBot("NoCoreTarget");

  await command("op BreakCoreOp", 250);
  await command("gamemode survival BreakCoreOp", 250);
  await command("gamemode survival NoCoreTarget", 250);
  await command("tp BreakCoreOp 38 80 0 0 0", 500);
  await command("tp NoCoreTarget 39 80 0 0 0", 500);
  await wait(500);

  const denied = await waitForChat(
    operator,
    () => operator.chat("/breakcore NoCoreTarget"),
    /That player does not have a placed core\./
  );
  assert(denied, "/breakcore should report when the target has no placed core");
  assert(await playerExists(ctx, "NoCoreTarget"), "denied /breakcore should not kill the target");
  assert(await playerInGameMode(ctx, "NoCoreTarget", "survival"), "denied /breakcore should leave the target in survival");
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}

async function playerInGameMode(ctx, playerName, gameMode) {
  const output = await ctx.command(`execute if entity @a[name=${playerName},gamemode=${gameMode}]`, 250);
  return /Test passed/.test(output);
}
