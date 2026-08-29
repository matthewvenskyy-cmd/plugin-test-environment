import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Viking axe increases damage";

const RIDER_FLOOR = new Vec3(340, 79, 0);
const TARGET_FLOOR = new Vec3(340, 79, 2);
const VICTIM_FLOOR = new Vec3(341, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntVikingHit", { op: false });
  const target = await spawnBot("MntVikingSeat", { op: false });
  const victim = await spawnBot("MntVikingVictim", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 339 0 342 2", 250);
    await wait(500);
    await command("deop MntVikingHit", 250);
    await command("deop MntVikingSeat", 250);
    await command("deop MntVikingVictim", 250);
    await command("clear MntVikingHit", 250);
    await command("clear MntVikingSeat", 250);
    await command("clear MntVikingVictim", 250);
    await command("effect clear MntVikingHit", 250);
    await command("effect clear MntVikingSeat", 250);
    await command("effect clear MntVikingVictim", 250);
    await command("fill 339 79 0 342 79 2 minecraft:stone", 500);
    await command("gamemode creative MntVikingHit", 250);
    await command("gamemode creative MntVikingSeat", 250);
    await command("gamemode creative MntVikingVictim", 250);
    await command("tp MntVikingHit 340 80 0 0 0", 500);
    await command("tp MntVikingSeat 340 80 2 180 0", 500);
    await command("tp MntVikingVictim 341 80 0 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Viking rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Viking target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted Viking victim floor block");
    await command("gamemode survival MntVikingHit", 250);
    await command("gamemode survival MntVikingSeat", 250);
    await command("gamemode survival MntVikingVictim", 250);
    await command("give MntVikingHit minecraft:iron_axe", 500);
    const plainAxe = await waitForInventoryItem(rider, (item) => item?.name === "iron_axe", "mounted rider plain iron axe");
    await rider.equip(plainAxe, "hand");
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntVikingSeat/i);
    assert(mounted, "Viking rider should mount the target before mounted axe damage checks");
    await wait(500);

    const plainDamage = await measureOutgoingDamage(ctx, "mounted rider plain axe");

    await command("clear MntVikingHit", 250);
    const giveOutput = await command("classes give MntVikingHit double_long_axe", 500);
    assert(!/Unknown player or item|Usage:/i.test(giveOutput), `mounted rider Viking Axe give command failed: ${giveOutput}`);
    const classAxe = await waitForInventoryItem(rider, (item) => item?.name === "iron_axe", "mounted rider Viking class axe");
    await rider.equip(classAxe, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Viking/);
    assert(status, "mounted rider Viking class axe should set class status before damage check");

    const vikingDamage = await measureOutgoingDamage(ctx, "mounted rider Viking axe");
    assert(vikingDamage > plainDamage + 1.0, `mounted Viking rider axe damage should exceed plain axe damage; plain=${plainDamage}, viking=${vikingDamage}`);
    assert(await playerExists(ctx, "MntVikingHit"), "mounted Viking axe checks should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MntVikingSeat"), "mounted Viking axe checks should not kill or disconnect the target");
    assert(await playerExists(ctx, "MntVikingVictim"), "mounted Viking axe checks should not kill or disconnect the victim");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MntVikingHit", 250);
    await command("clear MntVikingSeat", 250);
    await command("clear MntVikingVictim", 250);
    await command("effect clear MntVikingHit", 250);
    await command("effect clear MntVikingSeat", 250);
    await command("effect clear MntVikingVictim", 250);
    await command("attribute MntVikingVictim minecraft:max_health base set 20", 250);
    await command("fill 339 79 0 342 79 2 minecraft:air", 500);
    await command("forceload remove 339 0 342 2", 250);
  }
}

async function measureOutgoingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MntVikingVictim", 250);
  await command("attribute MntVikingVictim minecraft:max_health base set 40", 250);
  await command("effect give MntVikingVictim minecraft:instant_health 1 10 true", 250);
  await command("tp MntVikingHit 340 80 0 0 0", 250);
  await command("tp MntVikingSeat 340 80 2 180 0", 250);
  await command("tp MntVikingVictim 341 80 0 -90 0", 250);
  await wait(750);
  await command("data merge entity MntVikingVictim {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "MntVikingVictim");
  const damageOutput = await command("damage MntVikingVictim 10 minecraft:generic by MntVikingHit", 500);
  assert(/Applied|damaged|MntVikingVictim/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "MntVikingVictim");
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
