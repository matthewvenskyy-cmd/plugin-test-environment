import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Basic Mage melee reduces damage";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const plain = await spawnBot("PlainMageHit");
  const mage = await spawnBot("BasicMageHit");
  await spawnBot("MageHitTarget");

  await command("gamerule naturalRegeneration false", 250);
  await command("clear PlainMageHit", 250);
  await command("clear BasicMageHit", 250);
  await command("clear MageHitTarget", 250);
  await command("fill 57 79 -1 59 79 3 minecraft:stone", 250);
  await command("gamemode survival PlainMageHit", 250);
  await command("gamemode survival BasicMageHit", 250);
  await command("gamemode survival MageHitTarget", 250);
  await command("effect clear PlainMageHit", 250);
  await command("effect clear BasicMageHit", 250);
  await command("effect clear MageHitTarget", 250);
  await command("tp PlainMageHit 58 80 0 0 0", 500);
  await command("tp BasicMageHit 58 80 2 0 0", 500);
  await command("tp MageHitTarget 58 80 1 180 0", 500);
  const giveOutput = await command("classes give BasicMageHit basic_mage_staff", 500);
  assert(!/Unknown player or item|Usage:/i.test(giveOutput), `Basic Mage Staff give command failed: ${giveOutput}`);
  await wait(1000);

  const staff = await waitForInventoryItem(mage, (item) => item?.name === "blaze_rod", "Basic Mage Staff class item");
  await mage.equip(staff, "hand");
  await wait(1500);
  const status = await waitForChat(mage, () => mage.chat("/classes status"), /Current class: Basic Mage/);
  assert(status, "Basic Mage Staff should set class status to Basic Mage");

  const plainDamage = await measureSingleHitDamage(ctx, plain, "plain player hit");
  const mageDamage = await measureSingleHitDamage(ctx, mage, "Basic Mage melee hit");

  assert(mageDamage < plainDamage * 0.6, `Basic Mage melee damage should be reduced; plain=${plainDamage}, mage=${mageDamage}`);

  await command("gamerule naturalRegeneration true", 250);
  await command("clear PlainMageHit", 250);
  await command("clear BasicMageHit", 250);
  await command("clear MageHitTarget", 250);
  await command("fill 57 79 -1 59 79 3 minecraft:air", 250);
}

async function measureSingleHitDamage(ctx, attacker, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MageHitTarget", 250);
  await command("attribute MageHitTarget minecraft:max_health base set 40", 250);
  await command("tp MageHitTarget 58 80 1 180 0", 250);
  await command(`tp ${attacker.username} 58 80 ${attacker.username === "PlainMageHit" ? 0 : 2} 0 0`, 250);
  await wait(750);
  await command("data merge entity MageHitTarget {Health:40.0f,HurtTime:0s}", 250);

  const before = await health(ctx, "MageHitTarget");
  const damageOutput = await command(`damage MageHitTarget 10 minecraft:generic by ${attacker.username}`, 500);
  assert(/Applied|damaged|MageHitTarget/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "MageHitTarget");
  const damage = before - after;
  assert(damage > 0, `${label} should damage the target; before=${before}, after=${after}, output=${damageOutput}`);
  return damage;
}

async function health(ctx, playerName) {
  const output = await ctx.command(`data get entity ${playerName} Health`, 500);
  const match = output.match(/Health:?\s*([\d.]+)f?/i) || output.match(/entity data:\s*([\d.]+)f?/i);
  if (!match) {
    throw new Error(`Could not parse ${playerName} health from command output: ${output}`);
  }
  return Number(match[1]);
}
