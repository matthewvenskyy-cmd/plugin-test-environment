import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Necromancer reduces melee damage";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  await spawnBot("NecroHitAttacker");
  const defender = await spawnBot("NecroHitDefender");

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("clear NecroHitAttacker", 250);
    await command("clear NecroHitDefender", 250);
    await command("effect clear NecroHitAttacker", 250);
    await command("effect clear NecroHitDefender", 250);
    await command("forceload add 140 0", 250);
    await command("fill 139 79 -1 141 79 1 minecraft:stone", 250);
    await command("gamemode creative NecroHitAttacker", 250);
    await command("gamemode creative NecroHitDefender", 250);
    await command("tp NecroHitAttacker 140 80 -1 0 0", 500);
    await command("tp NecroHitDefender 140 80 0 180 0", 500);
    await command("gamemode survival NecroHitAttacker", 250);
    await command("gamemode survival NecroHitDefender", 250);
    await wait(1000);

    const plainDamage = await measureIncomingDamage(ctx, "plain target");

    await command("classes give NecroHitDefender necromancer_staff", 500);
    const staff = await waitForInventoryItem(defender, (item) => item?.name === "blaze_rod", "Necromancer Staff class item");
    await defender.equip(staff, "hand");
    await wait(1500);
    const status = await waitForChat(defender, () => defender.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "Necromancer Staff should set class status before vulnerability check");

    const necromancerDamage = await measureIncomingDamage(ctx, "Necromancer target");
    assert(necromancerDamage < plainDamage * 0.75, `Necromancer should reduce non-arrow melee damage; plain=${plainDamage}, necromancer=${necromancerDamage}`);
  } finally {
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear NecroHitAttacker", 250);
    await command("clear NecroHitDefender", 250);
    await command("effect clear NecroHitDefender", 250);
    await command("attribute NecroHitDefender minecraft:max_health base set 20", 250);
    await command("fill 139 79 -1 141 79 1 minecraft:air", 250);
    await command("forceload remove 140 0", 250);
  }
}

async function measureIncomingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear NecroHitDefender", 250);
  await command("attribute NecroHitDefender minecraft:max_health base set 40", 250);
  await command("tp NecroHitAttacker 140 80 -1 0 0", 250);
  await command("tp NecroHitDefender 140 80 0 180 0", 250);
  await wait(750);
  await command("data merge entity NecroHitDefender {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "NecroHitDefender");
  const damageOutput = await command("damage NecroHitDefender 8 minecraft:player_attack by NecroHitAttacker", 500);
  assert(/Applied|damaged/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(250);

  const after = await health(ctx, "NecroHitDefender");
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
