import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Viking axe increases damage";

const RIDER_FLOOR = new Vec3(344, 79, 0);
const TARGET_FLOOR = new Vec3(344, 79, 2);
const VICTIM_FLOOR = new Vec3(345, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtVikingRide", { op: false });
  const target = await spawnBot("MtVikingHit", { op: false });
  const victim = await spawnBot("MtVikingVictim", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 343 0 346 2", 250);
    await wait(500);
    await command("deop MtVikingRide", 250);
    await command("deop MtVikingHit", 250);
    await command("deop MtVikingVictim", 250);
    await command("clear MtVikingRide", 250);
    await command("clear MtVikingHit", 250);
    await command("clear MtVikingVictim", 250);
    await command("effect clear MtVikingRide", 250);
    await command("effect clear MtVikingHit", 250);
    await command("effect clear MtVikingVictim", 250);
    await command("fill 343 79 0 346 79 2 minecraft:stone", 500);
    await command("gamemode creative MtVikingRide", 250);
    await command("gamemode creative MtVikingHit", 250);
    await command("gamemode creative MtVikingVictim", 250);
    await command("tp MtVikingRide 344 80 0 0 0", 500);
    await command("tp MtVikingHit 344 80 2 180 0", 500);
    await command("tp MtVikingVictim 345 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target Viking rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target Viking target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted target Viking victim floor block");
    await command("gamemode survival MtVikingRide", 250);
    await command("gamemode survival MtVikingHit", 250);
    await command("gamemode survival MtVikingVictim", 250);
    await command("give MtVikingHit minecraft:iron_axe", 500);
    const plainAxe = await waitForInventoryItem(target, (item) => item?.name === "iron_axe", "mounted target plain iron axe");
    await target.equip(plainAxe, "hand");
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtVikingHit/i);
    assert(mounted, "rider should mount the Viking target before mounted axe damage checks");
    await wait(500);

    const plainDamage = await measureOutgoingDamage(ctx, "mounted target plain axe");

    await command("clear MtVikingHit", 250);
    const giveOutput = await command("classes give MtVikingHit double_long_axe", 500);
    assert(!/Unknown player or item|Usage:/i.test(giveOutput), `mounted target Viking Axe give command failed: ${giveOutput}`);
    const classAxe = await waitForInventoryItem(target, (item) => item?.name === "iron_axe", "mounted target Viking class axe");
    await target.equip(classAxe, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Viking/);
    assert(status, "mounted target Viking class axe should set class status before damage check");

    const vikingDamage = await measureOutgoingDamage(ctx, "mounted target Viking axe");
    assert(vikingDamage > plainDamage + 1.0, `mounted Viking target axe damage should exceed plain axe damage; plain=${plainDamage}, viking=${vikingDamage}`);
    assert(await playerExists(ctx, "MtVikingRide"), "mounted target Viking axe checks should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MtVikingHit"), "mounted target Viking axe checks should not kill or disconnect the target");
    assert(await playerExists(ctx, "MtVikingVictim"), "mounted target Viking axe checks should not kill or disconnect the victim");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MtVikingRide", 250);
    await command("clear MtVikingHit", 250);
    await command("clear MtVikingVictim", 250);
    await command("effect clear MtVikingRide", 250);
    await command("effect clear MtVikingHit", 250);
    await command("effect clear MtVikingVictim", 250);
    await command("attribute MtVikingVictim minecraft:max_health base set 20", 250);
    await command("fill 343 79 0 346 79 2 minecraft:air", 500);
    await command("forceload remove 343 0 346 2", 250);
  }
}

async function measureOutgoingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MtVikingVictim", 250);
  await command("attribute MtVikingVictim minecraft:max_health base set 40", 250);
  await command("effect give MtVikingVictim minecraft:instant_health 1 10 true", 250);
  await command("tp MtVikingRide 344 80 0 0 0", 250);
  await command("tp MtVikingHit 344 80 2 180 0", 250);
  await command("tp MtVikingVictim 345 80 2 -90 0", 250);
  await wait(750);
  await command("data merge entity MtVikingVictim {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "MtVikingVictim");
  const damageOutput = await command("damage MtVikingVictim 10 minecraft:generic by MtVikingHit", 500);
  assert(damageOutput.trim() === "" || /Applied|damaged|MtVikingVictim/i.test(damageOutput), `${label} damage command reported unexpected output: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "MtVikingVictim");
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
