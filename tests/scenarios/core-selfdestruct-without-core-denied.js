import { waitForChat } from "./helpers.js";

export const name = "Core selfdestruct without core is denied";

export async function run(ctx) {
  const { assert, command, spawnBot, wait } = ctx;
  const bot = await spawnBot("NoCoreBoom");

  await command("gamemode survival NoCoreBoom", 250);
  await command("tp NoCoreBoom 36 80 0 0 0", 500);
  await command("effect give NoCoreBoom minecraft:instant_health 1 10", 250);
  await wait(500);

  const denied = await waitForChat(bot, () => bot.chat("/selfdestruct"), /You do not have a placed core\./);
  assert(denied, "/selfdestruct without a placed core should be denied");
  await wait(750);

  assert(await playerExists(ctx, "NoCoreBoom"), "player should remain alive after denied /selfdestruct");
  assert(await playerInGameMode(ctx, "NoCoreBoom", "survival"), "player should remain in survival after denied /selfdestruct");
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}

async function playerInGameMode(ctx, playerName, gameMode) {
  const output = await ctx.command(`execute if entity @a[name=${playerName},gamemode=${gameMode}]`, 250);
  return /Test passed/.test(output);
}
