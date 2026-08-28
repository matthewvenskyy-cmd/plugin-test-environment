import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Necromancer reduces melee damage";

const RIDER_FLOOR = new Vec3(316, 79, 0);
const TARGET_FLOOR = new Vec3(316, 79, 2);
const ATTACKER_FLOOR = new Vec3(317, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtNecroHitR", { op: false });
  const target = await spawnBot("MtNecroHit", { op: false });
  await spawnBot("MtNecroAtk", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 315 0 318 2", 250);
    await wait(500);
    await command("deop MtNecroHitR", 250);
    await command("deop MtNecroHit", 250);
    await command("deop MtNecroAtk", 250);
    await command("clear MtNecroHitR", 250);
    await command("clear MtNecroHit", 250);
    await command("clear MtNecroAtk", 250);
    await command("effect clear MtNecroHitR", 250);
    await command("effect clear MtNecroHit", 250);
    await command("effect clear MtNecroAtk", 250);
    await command("fill 315 79 0 318 79 2 minecraft:stone", 500);
    await command("gamemode creative MtNecroHitR", 250);
    await command("gamemode creative MtNecroHit", 250);
    await command("gamemode creative MtNecroAtk", 250);
    await command("tp MtNecroHitR 316 80 0 0 0", 500);
    await command("tp MtNecroHit 316 80 2 180 0", 500);
    await command("tp MtNecroAtk 317 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Necromancer damage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Necromancer damage target floor block");
    await waitForBlock(target, ATTACKER_FLOOR, "stone", "mounted Necromancer damage attacker floor block");
    await command("gamemode survival MtNecroHitR", 250);
    await command("gamemode survival MtNecroHit", 250);
    await command("gamemode survival MtNecroAtk", 250);
    await command("attribute MtNecroHit minecraft:max_health base set 40", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtNecroHit/i);
    assert(mounted, "rider should mount the target before mounted Necromancer damage checks");
    await wait(500);

    const plainDamage = await measureIncomingDamage(ctx, "mounted plain target");

    await command("classes give MtNecroHit necromancer_staff", 500);
    const staff = await waitForInventoryItem(target, (item) => item?.name === "blaze_rod", "mounted target Necromancer Staff");
    await target.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "mounted target Necromancer Staff should set class status before damage reduction check");

    const necromancerDamage = await measureIncomingDamage(ctx, "mounted Necromancer target");
    assert(necromancerDamage < plainDamage * 0.75, `mounted Necromancer target should reduce melee damage; plain=${plainDamage}, necromancer=${necromancerDamage}`);
    assert(await playerExists(ctx, "MtNecroHitR"), "mounted Necromancer damage checks should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MtNecroHit"), "mounted Necromancer damage checks should not kill or disconnect the target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MtNecroHitR", 250);
    await command("clear MtNecroHit", 250);
    await command("clear MtNecroAtk", 250);
    await command("effect clear MtNecroHitR", 250);
    await command("effect clear MtNecroHit", 250);
    await command("effect clear MtNecroAtk", 250);
    await command("attribute MtNecroHit minecraft:max_health base set 20", 250);
    await command("fill 315 79 0 318 79 2 minecraft:air", 500);
    await command("forceload remove 315 0 318 2", 250);
  }
}

async function measureIncomingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MtNecroHit", 250);
  await command("attribute MtNecroHit minecraft:max_health base set 40", 250);
  await command("effect give MtNecroHit minecraft:instant_health 1 10 true", 250);
  await command("tp MtNecroHitR 316 80 0 0 0", 250);
  await command("tp MtNecroHit 316 80 2 180 0", 250);
  await command("tp MtNecroAtk 317 80 2 -90 0", 250);
  await wait(750);
  await command("data merge entity MtNecroHit {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "MtNecroHit");
  const damageOutput = await command("damage MtNecroHit 8 minecraft:player_attack by MtNecroAtk", 500);
  assert(/Applied|damaged/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(250);

  const after = await health(ctx, "MtNecroHit");
  const damage = before - after;
  assert(damage > 0, `${label} should take damage; before=${before}, after=${after}, output=${damageOutput}`);
  return damage;
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

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
