import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes movement modifier resets";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("ClassSpeedBot");

  await command("clear ClassSpeedBot", 250);
  await command("classes give ClassSpeedBot necromancer_staff", 500);

  const staff = await waitForInventoryItem(bot, (item) => item?.name === "blaze_rod", "Necromancer Staff class item");
  await bot.equip(staff, "hand");
  await wait(1500);

  const necromancerStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Necromancer/);
  assert(necromancerStatus, "Necromancer Staff should set class status to Necromancer");

  const boostedSpeed = await movementSpeed(ctx, "ClassSpeedBot");
  assert(boostedSpeed > 0.1, `Necromancer should raise movement speed above 0.1, got ${boostedSpeed}`);

  await command("clear ClassSpeedBot minecraft:blaze_rod", 500);
  bot.chat("/classes reset");
  await wait(1000);

  const resetStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: No Class/);
  assert(resetStatus, "reset should clear the selected class");

  const resetSpeed = await movementSpeed(ctx, "ClassSpeedBot");
  assert(Math.abs(resetSpeed - 0.1) < 0.0001, `reset should restore default movement speed 0.1, got ${resetSpeed}`);
}

async function movementSpeed(ctx, playerName) {
  const output = await ctx.command(`attribute ${playerName} minecraft:movement_speed get`, 500);
  const match = output.match(/(?:has the following attribute value:|is) ([\d.]+)/);
  if (!match) {
    throw new Error(`Could not parse movement speed from command output: ${output}`);
  }
  return Number(match[1]);
}
