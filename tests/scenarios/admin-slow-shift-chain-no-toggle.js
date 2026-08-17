export const name = "Admin slow shift chain does not toggle game mode";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("AdminSlowShift");

  await command("gamemode survival AdminSlowShift", 500);
  assert(await playerInGameMode(ctx, "AdminSlowShift", "survival"), "AdminSlowShift should start in survival mode");

  for (let i = 0; i < 3; i++) {
    bot.setControlState("sneak", true);
    await wait(120);
    bot.setControlState("sneak", false);
    await wait(950);
  }

  await wait(750);
  assert(await playerInGameMode(ctx, "AdminSlowShift", "survival"), "slow sneak chain should leave op player in survival mode");
  assert(!(await playerInGameMode(ctx, "AdminSlowShift", "creative")), "slow sneak chain must not switch op player to creative mode");

  for (let i = 0; i < 3; i++) {
    bot.setControlState("sneak", true);
    await wait(120);
    bot.setControlState("sneak", false);
    await wait(120);
  }

  await wait(750);
  assert(await playerInGameMode(ctx, "AdminSlowShift", "creative"), "a later fast triple-sneak should still toggle creative mode");
}

async function playerInGameMode(ctx, playerName, gameMode) {
  const output = await ctx.command(`execute if entity @a[name=${playerName},gamemode=${gameMode}]`, 250);
  return /Test passed/.test(output);
}
