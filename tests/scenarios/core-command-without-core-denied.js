import { waitForChat } from "./helpers.js";

export const name = "Core command without core is denied";

const FLOOR = { x: 40, y: 79, z: 0 };

export async function run(ctx) {
  const { assert, command, spawnBot, wait } = ctx;
  const bot = await spawnBot("NoCoreCmd");

  await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:stone`, 250);
  await command("gamemode survival NoCoreCmd", 250);
  await command("tp NoCoreCmd 40 80 0 0 0", 500);
  await wait(500);
  const before = bot.entity.position.clone();

  const denied = await waitForChat(bot, () => bot.chat("/core"), /You do not have a safe core teleport location\./);
  assert(denied, "/core without a placed core should be denied");
  await wait(1000);

  assert(bot.entity.position.distanceTo(before) < 0.5, "/core without a placed core should not move the player");
  assert(await playerExists(ctx, "NoCoreCmd"), "denied /core should not disconnect or kill the player");
  await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:air`, 250);
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
