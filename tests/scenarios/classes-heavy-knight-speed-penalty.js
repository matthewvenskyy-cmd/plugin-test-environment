import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Heavy Knight applies speed penalty";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("HeavySpeed");

  await command("clear HeavySpeed", 250);
  await command("effect clear HeavySpeed", 250);
  await command("gamemode survival HeavySpeed", 250);
  await command("tp HeavySpeed 108 80 0 0 0", 500);
  await command("setblock 108 79 0 minecraft:stone", 250);
  bot.chat("/classes reset");
  await wait(1000);

  const defaultSpeed = await movementSpeed(ctx, "HeavySpeed");
  assert(Math.abs(defaultSpeed - 0.1) < 0.0001, `default movement speed should start at 0.1, got ${defaultSpeed}`);

  await command("classes give HeavySpeed heavy_plate", 500);
  await wait(1000);

  const plate = await waitForInventoryItem(bot, (item) => item?.name === "iron_chestplate", "Heavy Knight Plate class item");
  await bot.equip(plate, "hand");
  await wait(1500);

  const status = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: Heavy Knight/);
  assert(status, "Heavy Knight Plate should set class status to Heavy Knight");

  const heavySpeed = await movementSpeed(ctx, "HeavySpeed");
  assert(heavySpeed < defaultSpeed, `Heavy Knight should reduce movement speed; default=${defaultSpeed}, heavy=${heavySpeed}`);

  await command("clear HeavySpeed minecraft:iron_chestplate", 500);
  bot.chat("/classes reset");
  await wait(1000);

  const resetStatus = await waitForChat(bot, () => bot.chat("/classes status"), /Current class: No Class/);
  assert(resetStatus, "reset should clear Heavy Knight class");

  const resetSpeed = await movementSpeed(ctx, "HeavySpeed");
  assert(Math.abs(resetSpeed - 0.1) < 0.0001, `reset should restore default movement speed 0.1, got ${resetSpeed}`);

  await command("clear HeavySpeed", 250);
  await command("effect clear HeavySpeed", 250);
  await command("setblock 108 79 0 minecraft:air", 250);
}

async function movementSpeed(ctx, playerName) {
  const output = await ctx.command(`attribute ${playerName} minecraft:movement_speed get`, 500);
  const match = output.match(/(?:has the following attribute value:|is) ([\d.]+)/);
  if (!match) {
    throw new Error(`Could not parse movement speed from command output: ${output}`);
  }
  return Number(match[1]);
}
