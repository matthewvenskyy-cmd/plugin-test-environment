import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Basic Mage melee reduces damage";

const RIDER_FLOOR = new Vec3(332, 79, 0);
const TARGET_FLOOR = new Vec3(332, 79, 2);
const VICTIM_FLOOR = new Vec3(333, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntMageHit", { op: false });
  const target = await spawnBot("MntMageSeat", { op: false });
  const victim = await spawnBot("MntMageVictim", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 331 0 334 2", 250);
    await wait(500);
    await command("deop MntMageHit", 250);
    await command("deop MntMageSeat", 250);
    await command("deop MntMageVictim", 250);
    await command("clear MntMageHit", 250);
    await command("clear MntMageSeat", 250);
    await command("clear MntMageVictim", 250);
    await command("effect clear MntMageHit", 250);
    await command("effect clear MntMageSeat", 250);
    await command("effect clear MntMageVictim", 250);
    await command("fill 331 79 0 334 79 2 minecraft:stone", 500);
    await command("gamemode creative MntMageHit", 250);
    await command("gamemode creative MntMageSeat", 250);
    await command("gamemode creative MntMageVictim", 250);
    await command("tp MntMageHit 332 80 0 0 0", 500);
    await command("tp MntMageSeat 332 80 2 180 0", 500);
    await command("tp MntMageVictim 333 80 0 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Basic Mage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Basic Mage target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted Basic Mage victim floor block");
    await command("gamemode survival MntMageHit", 250);
    await command("gamemode survival MntMageSeat", 250);
    await command("gamemode survival MntMageVictim", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntMageSeat/i);
    assert(mounted, "Basic Mage rider should mount the target before mounted melee checks");
    await wait(500);

    const plainDamage = await measureOutgoingDamage(ctx, "mounted plain rider");

    const giveOutput = await command("classes give MntMageHit basic_mage_staff", 500);
    assert(!/Unknown player or item|Usage:/i.test(giveOutput), `mounted rider Basic Mage Staff give command failed: ${giveOutput}`);
    const staff = await waitForInventoryItem(rider, (item) => item?.name === "blaze_rod", "mounted rider Basic Mage Staff");
    await rider.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Basic Mage/);
    assert(status, "mounted rider Basic Mage Staff should set class status before melee penalty check");

    const mageDamage = await measureOutgoingDamage(ctx, "mounted Basic Mage rider");
    assert(mageDamage < plainDamage * 0.6, `mounted Basic Mage rider melee damage should be reduced; plain=${plainDamage}, mage=${mageDamage}`);
    assert(await playerExists(ctx, "MntMageHit"), "mounted Basic Mage melee checks should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MntMageSeat"), "mounted Basic Mage melee checks should not kill or disconnect the target");
    assert(await playerExists(ctx, "MntMageVictim"), "mounted Basic Mage melee checks should not kill or disconnect the victim");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MntMageHit", 250);
    await command("clear MntMageSeat", 250);
    await command("clear MntMageVictim", 250);
    await command("effect clear MntMageHit", 250);
    await command("effect clear MntMageSeat", 250);
    await command("effect clear MntMageVictim", 250);
    await command("attribute MntMageVictim minecraft:max_health base set 20", 250);
    await command("fill 331 79 0 334 79 2 minecraft:air", 500);
    await command("forceload remove 331 0 334 2", 250);
  }
}

async function measureOutgoingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MntMageVictim", 250);
  await command("attribute MntMageVictim minecraft:max_health base set 40", 250);
  await command("effect give MntMageVictim minecraft:instant_health 1 10 true", 250);
  await command("tp MntMageHit 332 80 0 0 0", 250);
  await command("tp MntMageSeat 332 80 2 180 0", 250);
  await command("tp MntMageVictim 333 80 0 -90 0", 250);
  await wait(750);
  await command("data merge entity MntMageVictim {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "MntMageVictim");
  const damageOutput = await command("damage MntMageVictim 10 minecraft:generic by MntMageHit", 500);
  assert(/Applied|damaged|MntMageVictim/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "MntMageVictim");
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
