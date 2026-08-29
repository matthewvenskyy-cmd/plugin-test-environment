import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Basic Mage melee reduces damage";

const RIDER_FLOOR = new Vec3(336, 79, 0);
const TARGET_FLOOR = new Vec3(336, 79, 2);
const VICTIM_FLOOR = new Vec3(337, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtMageRide", { op: false });
  const target = await spawnBot("MtMageHit", { op: false });
  const victim = await spawnBot("MtMageVictim", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 335 0 338 2", 250);
    await wait(500);
    await command("deop MtMageRide", 250);
    await command("deop MtMageHit", 250);
    await command("deop MtMageVictim", 250);
    await command("clear MtMageRide", 250);
    await command("clear MtMageHit", 250);
    await command("clear MtMageVictim", 250);
    await command("effect clear MtMageRide", 250);
    await command("effect clear MtMageHit", 250);
    await command("effect clear MtMageVictim", 250);
    await command("fill 335 79 0 338 79 2 minecraft:stone", 500);
    await command("gamemode creative MtMageRide", 250);
    await command("gamemode creative MtMageHit", 250);
    await command("gamemode creative MtMageVictim", 250);
    await command("tp MtMageRide 336 80 0 0 0", 500);
    await command("tp MtMageHit 336 80 2 180 0", 500);
    await command("tp MtMageVictim 337 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target Basic Mage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target Basic Mage target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted target Basic Mage victim floor block");
    await command("gamemode survival MtMageRide", 250);
    await command("gamemode survival MtMageHit", 250);
    await command("gamemode survival MtMageVictim", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtMageHit/i);
    assert(mounted, "rider should mount the Basic Mage target before mounted melee checks");
    await wait(500);

    const plainDamage = await measureOutgoingDamage(ctx, "mounted plain target");

    const giveOutput = await command("classes give MtMageHit basic_mage_staff", 500);
    assert(!/Unknown player or item|Usage:/i.test(giveOutput), `mounted target Basic Mage Staff give command failed: ${giveOutput}`);
    const staff = await waitForInventoryItem(target, (item) => item?.name === "blaze_rod", "mounted target Basic Mage Staff");
    await target.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Basic Mage/);
    assert(status, "mounted target Basic Mage Staff should set class status before melee penalty check");

    const mageDamage = await measureOutgoingDamage(ctx, "mounted Basic Mage target");
    assert(mageDamage < plainDamage * 0.6, `mounted Basic Mage target melee damage should be reduced; plain=${plainDamage}, mage=${mageDamage}`);
    assert(await playerExists(ctx, "MtMageRide"), "mounted target Basic Mage melee checks should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MtMageHit"), "mounted target Basic Mage melee checks should not kill or disconnect the target");
    assert(await playerExists(ctx, "MtMageVictim"), "mounted target Basic Mage melee checks should not kill or disconnect the victim");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MtMageRide", 250);
    await command("clear MtMageHit", 250);
    await command("clear MtMageVictim", 250);
    await command("effect clear MtMageRide", 250);
    await command("effect clear MtMageHit", 250);
    await command("effect clear MtMageVictim", 250);
    await command("attribute MtMageVictim minecraft:max_health base set 20", 250);
    await command("fill 335 79 0 338 79 2 minecraft:air", 500);
    await command("forceload remove 335 0 338 2", 250);
  }
}

async function measureOutgoingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MtMageVictim", 250);
  await command("attribute MtMageVictim minecraft:max_health base set 40", 250);
  await command("effect give MtMageVictim minecraft:instant_health 1 10 true", 250);
  await command("tp MtMageRide 336 80 0 0 0", 250);
  await command("tp MtMageHit 336 80 2 180 0", 250);
  await command("tp MtMageVictim 337 80 2 -90 0", 250);
  await wait(750);
  await command("data merge entity MtMageVictim {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "MtMageVictim");
  const damageOutput = await command("damage MtMageVictim 10 minecraft:generic by MtMageHit", 500);
  assert(/Applied|damaged|MtMageVictim/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "MtMageVictim");
  const damage = before - after;
  assert(damage > 0, `${label} should damage the victim; before=${before}, after=${after}, output=${damageOutput}`);
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
