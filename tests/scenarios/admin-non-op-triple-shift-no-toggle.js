export const name = "Admin triple-shift ignores non-op players";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("NonOpShiftBot", { op: false });

  await command("deop NonOpShiftBot", 250);
  await command("gamemode survival NonOpShiftBot", 500);
  assert(await playerInGameMode(ctx, "NonOpShiftBot", "survival"), "NonOpShiftBot should start in survival mode");

  for (let i = 0; i < 3; i++) {
    bot.setControlState("sneak", true);
    await wait(120);
    bot.setControlState("sneak", false);
    await wait(120);
  }

  await wait(750);
  assert(await playerInGameMode(ctx, "NonOpShiftBot", "survival"), "non-op triple-sneak should not switch game mode");
  assert(!(await playerInGameMode(ctx, "NonOpShiftBot", "creative")), "non-op triple-sneak must not grant creative mode");
}

async function playerInGameMode(ctx, playerName, gameMode) {
  const output = await ctx.command(`execute if entity @a[name=${playerName},gamemode=${gameMode}]`, 250);
  return /Test passed/.test(output);
}
