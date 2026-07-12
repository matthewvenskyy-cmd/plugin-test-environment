import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Viking axe increases damage";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const plain = await spawnBot("PlainAxe");
  const viking = await spawnBot("VikingAxe");
  await spawnBot("AxeTarget");

  await command("gamerule naturalRegeneration false", 250);
  await command("clear PlainAxe", 250);
  await command("clear VikingAxe", 250);
  await command("clear AxeTarget", 250);
  await command("fill 53 79 -1 55 79 3 minecraft:stone", 250);
  await command("gamemode survival PlainAxe", 250);
  await command("gamemode survival VikingAxe", 250);
  await command("gamemode survival AxeTarget", 250);
  await command("effect clear PlainAxe", 250);
  await command("effect clear VikingAxe", 250);
  await command("effect clear AxeTarget", 250);
  await command("tp PlainAxe 54 80 0 0 0", 500);
  await command("tp VikingAxe 54 80 2 0 0", 500);
  await command("tp AxeTarget 54 80 1 180 0", 500);
  await command("give PlainAxe minecraft:iron_axe", 500);
  await command("classes give VikingAxe double_long_axe", 500);
  await wait(1000);

  const plainAxe = await waitForInventoryItem(plain, (item) => item?.name === "iron_axe", "plain iron axe");
  await plain.equip(plainAxe, "hand");

  const classAxe = await waitForInventoryItem(viking, (item) => item?.name === "iron_axe", "Viking class axe");
  await viking.equip(classAxe, "hand");
  await wait(1500);
  const status = await waitForChat(viking, () => viking.chat("/classes status"), /Current class: Viking/);
  assert(status, "Viking class axe should set class status to Viking");

  const plainDamage = await measureSingleHitDamage(ctx, plain, "plain iron axe");
  const vikingDamage = await measureSingleHitDamage(ctx, viking, "Viking class axe");

  assert(vikingDamage > plainDamage + 1.0, `Viking axe damage should exceed plain axe damage; plain=${plainDamage}, viking=${vikingDamage}`);

  await command("gamerule naturalRegeneration true", 250);
  await command("clear PlainAxe", 250);
  await command("clear VikingAxe", 250);
  await command("clear AxeTarget", 250);
  await command("fill 53 79 -1 55 79 3 minecraft:air", 250);
}

async function measureSingleHitDamage(ctx, attacker, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear AxeTarget", 250);
  await command("attribute AxeTarget minecraft:max_health base set 40", 250);
  await command("tp AxeTarget 54 80 1 180 0", 250);
  await command(`tp ${attacker.username} 54 80 ${attacker.username === "PlainAxe" ? 0 : 2} 0 0`, 250);
  await wait(750);
  await command("data merge entity AxeTarget {Health:40.0f,HurtTime:0s}", 250);

  const before = await health(ctx, "AxeTarget");
  const damageOutput = await command(`damage AxeTarget 10 minecraft:generic by ${attacker.username}`, 500);
  assert(/Applied|damaged|AxeTarget/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "AxeTarget");
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
