export const name = "Admin triple-shift toggles game mode";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("AdminShiftBot");

  await command("gamemode survival AdminShiftBot", 500);
  assert(await playerInGameMode(ctx, "AdminShiftBot", "survival"), "AdminShiftBot should start in survival mode");

  for (let i = 0; i < 3; i++) {
    bot.setControlState("sneak", true);
    await wait(120);
    bot.setControlState("sneak", false);
    await wait(120);
  }

  await wait(750);
  assert(await playerInGameMode(ctx, "AdminShiftBot", "creative"), "triple-sneak should switch op player to creative mode");

  for (let i = 0; i < 3; i++) {
    bot.setControlState("sneak", true);
    await wait(120);
    bot.setControlState("sneak", false);
    await wait(120);
  }

  await wait(750);
  assert(await playerInGameMode(ctx, "AdminShiftBot", "survival"), "second triple-sneak should switch op player back to survival mode");
}

async function playerInGameMode(ctx, playerName, gameMode) {
  const output = await ctx.command(`execute if entity @a[name=${playerName},gamemode=${gameMode}]`, 250);
  return /Test passed/.test(output);
}
