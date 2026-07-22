import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Knight reduces incoming sword damage";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const attacker = await spawnBot("SwordAttacker");
  const defender = await spawnBot("SwordDefender");

  await command("gamerule naturalRegeneration false", 250);
  await command("clear SwordAttacker", 250);
  await command("clear SwordDefender", 250);
  await command("fill 61 79 -1 63 79 3 minecraft:stone", 250);
  await command("gamemode survival SwordAttacker", 250);
  await command("gamemode survival SwordDefender", 250);
  await command("effect clear SwordAttacker", 250);
  await command("effect clear SwordDefender", 250);
  await command("tp SwordAttacker 62 80 0 0 0", 500);
  await command("tp SwordDefender 62 80 1 180 0", 500);
  await command("give SwordAttacker minecraft:iron_sword", 500);
  await wait(1000);

  const sword = await waitForInventoryItem(attacker, (item) => item?.name === "iron_sword", "attacker iron sword");
  await attacker.equip(sword, "hand");

  const plainDamage = await measureIncomingDamage(ctx, "plain target");

  await command("classes give SwordDefender long_sword", 500);
  const classSword = await waitForInventoryItem(defender, (item) => item?.name === "iron_sword", "Knight Long Sword class item");
  await defender.equip(classSword, "hand");
  await wait(1500);
  const status = await waitForChat(defender, () => defender.chat("/classes status"), /Current class: Knight/);
  assert(status, "Long Sword should set class status to Knight");
  const knightDamage = await measureIncomingDamage(ctx, "Knight target");

  assert(knightDamage < plainDamage * 0.75, `Knight should reduce incoming sword damage; plain=${plainDamage}, knight=${knightDamage}`);

  await command("gamerule naturalRegeneration true", 250);
  await command("clear SwordAttacker", 250);
  await command("clear SwordDefender", 250);
  await command("fill 61 79 -1 63 79 3 minecraft:air", 250);
}

async function measureIncomingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear SwordDefender", 250);
  await command("attribute SwordDefender minecraft:max_health base set 40", 250);
  await command("tp SwordDefender 62 80 1 180 0", 250);
  await command("tp SwordAttacker 62 80 0 0 0", 250);
  await wait(750);
  await command("data merge entity SwordDefender {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1500);

  const before = await health(ctx, "SwordDefender");
  const damageOutput = await command("damage SwordDefender 10 minecraft:player_attack by SwordAttacker", 500);
  assert(/Applied|damaged/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "SwordDefender");
  const damage = before - after;
  assert(damage > 0, `${label} should take damage; before=${before}, after=${after}, output=${damageOutput}`);
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
