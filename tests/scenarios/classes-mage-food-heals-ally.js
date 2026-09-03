import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes mage food heals ally";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const mage = await spawnBot("FoodMage");
  const ally = await spawnBot("FoodAlly");

  await command("gamerule naturalRegeneration false", 250);
  await command("clear FoodMage", 250);
  await command("clear FoodAlly", 250);
  await command("effect clear FoodMage", 250);
  await command("effect clear FoodAlly", 250);
  await command("fill 104 79 -1 106 79 1 minecraft:stone", 250);
  await command("gamemode survival FoodMage", 250);
  await command("gamemode survival FoodAlly", 250);
  await command("attribute FoodAlly minecraft:max_health base set 40", 250);
  await command("tp FoodMage 105 80 -1 0 0", 500);
  await command("tp FoodAlly 105 80 1 180 0", 500);
  await command("data merge entity FoodAlly {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);

  const giveOutput = await command("classes give FoodMage basic_mage_staff", 500);
  assert(!/Unknown player or item|Usage:/i.test(giveOutput), `Basic Mage Staff give command failed: ${giveOutput}`);
  await command("give FoodMage minecraft:apple", 500);
  await wait(1000);

  const staff = await waitForInventoryItem(mage, (item) => item?.name === "blaze_rod", "Basic Mage Staff class item");
  await mage.equip(staff, "hand");
  await wait(1500);

  const status = await waitForChat(mage, () => mage.chat("/classes status"), /Current class: Basic Mage/);
  assert(status, "Basic Mage Staff should set class status before ally healing");

  const apple = await waitForInventoryItem(mage, (item) => item?.name === "apple", "apple");
  await mage.equip(apple, "hand");
  await mage.lookAt(ally.entity.position.offset(0, 1.2, 0), true);

  const before = await health(ctx, "FoodAlly");
  const healed = await waitForChat(mage, () => {
    mage.activateEntityAt(ally.entity, ally.entity.position.offset(0, 1.2, 0)).catch(() => {});
  }, /Shared food healing empowered an ally/i);
  assert(healed, "right-clicking an ally with food should emit the shared healing message");
  await wait(750);

  const after = await health(ctx, "FoodAlly");
  assert(after > before + 5.0, `shared food healing should restore about 6 health; before=${before}, after=${after}`);

  await command("gamerule naturalRegeneration true", 250);
  await command("clear FoodMage", 250);
  await command("clear FoodAlly", 250);
  await command("effect clear FoodMage", 250);
  await command("effect clear FoodAlly", 250);
  await command("attribute FoodAlly minecraft:max_health base set 20", 250);
  await command("fill 104 79 -1 106 79 1 minecraft:air", 250);
}

async function health(ctx, playerName) {
  const output = await ctx.command(`data get entity ${playerName} Health`, 500);
  const cleanOutput = stripAnsi(output);
  const match = cleanOutput.match(/Health:?\s*([\d.]+)f?/i) || cleanOutput.match(/entity data:\s*([\d.]+)f?/i);
  if (!match) {
    throw new Error(`Could not parse ${playerName} health from command output: ${output}`);
  }
  return Number(match[1]);
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}
