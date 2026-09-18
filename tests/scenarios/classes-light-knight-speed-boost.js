import { queryPlayerAttribute, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Light Knight applies speed boost";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("LightSpeed");

  await command("clear LightSpeed", 250);
  await command("effect clear LightSpeed", 250);
  await command("gamemode survival LightSpeed", 250);
  await command("tp LightSpeed 110 80 0 0 0", 500);
  await command("setblock 110 79 0 minecraft:stone", 250);
  bot.chat("/classes reset");
  await wait(1000);

  const defaultSpeed = await queryPlayerAttribute(ctx, "LightSpeed", "minecraft:movement_speed");
  assert(Math.abs(defaultSpeed - 0.1) < 0.0001, `default movement speed should start at 0.1, got ${defaultSpeed}`);

  await command("classes give LightSpeed light_chain", 500);
  await wait(1000);

  const chain = await waitForInventoryItem(bot, (item) => item?.name === "chainmail_chestplate", "Light Knight Chain class item");
  await bot.equip(chain, "hand");
  await wait(1500);

  const status = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Light Knight/);
  assert(status, "Light Knight Chain should set class status to Light Knight");

  const lightSpeed = await queryPlayerAttribute(ctx, "LightSpeed", "minecraft:movement_speed");
  assert(lightSpeed > defaultSpeed, `Light Knight should increase movement speed; default=${defaultSpeed}, light=${lightSpeed}`);

  await command("clear LightSpeed minecraft:chainmail_chestplate", 500);
  bot.chat("/classes reset");
  await wait(1000);

  const resetStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: No Class/);
  assert(resetStatus, "reset should clear Light Knight class");

  const resetSpeed = await queryPlayerAttribute(ctx, "LightSpeed", "minecraft:movement_speed");
  assert(Math.abs(resetSpeed - 0.1) < 0.0001, `reset should restore default movement speed 0.1, got ${resetSpeed}`);

  await command("clear LightSpeed", 250);
  await command("effect clear LightSpeed", 250);
  await command("setblock 110 79 0 minecraft:air", 250);
}
