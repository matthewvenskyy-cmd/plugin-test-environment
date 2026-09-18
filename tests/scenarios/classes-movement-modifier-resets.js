import { queryPlayerAttribute, waitForChat, waitForInventoryItem } from "./helpers.js";

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

  const boostedSpeed = await queryPlayerAttribute(ctx, "ClassSpeedBot", "minecraft:movement_speed");
  assert(boostedSpeed > 0.1, `Necromancer should raise movement speed above 0.1, got ${boostedSpeed}`);

  await command("clear ClassSpeedBot minecraft:blaze_rod", 500);
  bot.chat("/classes reset");
  await wait(1000);

  const resetStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: No Class/);
  assert(resetStatus, "reset should clear the selected class");

  const resetSpeed = await queryPlayerAttribute(ctx, "ClassSpeedBot", "minecraft:movement_speed");
  assert(Math.abs(resetSpeed - 0.1) < 0.0001, `reset should restore default movement speed 0.1, got ${resetSpeed}`);
}
