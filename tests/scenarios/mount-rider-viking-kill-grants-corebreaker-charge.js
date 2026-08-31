import { Vec3 } from "vec3";
import { queryCorebreakerCharges, waitForBlock, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Viking kill grants one Corebreaker charge";

const RIDER_FLOOR = new Vec3(348, 79, 0);
const TARGET_FLOOR = new Vec3(348, 79, 2);
const VICTIM_FLOOR = new Vec3(349, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntVikingKill", { op: false });
  const target = await spawnBot("MntVikingSeat", { op: false });
  const victim = await spawnBot("MntVikingVic", { op: false });

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 347 0 350 2", 250);
    await wait(500);
    await command("deop MntVikingKill", 250);
    await command("deop MntVikingSeat", 250);
    await command("deop MntVikingVic", 250);
    await command("clear MntVikingKill", 250);
    await command("clear MntVikingSeat", 250);
    await command("clear MntVikingVic", 250);
    await command("effect clear MntVikingKill", 250);
    await command("effect clear MntVikingSeat", 250);
    await command("effect clear MntVikingVic", 250);
    await command("fill 347 79 0 350 79 2 minecraft:stone", 500);
    await command("gamemode creative MntVikingKill", 250);
    await command("gamemode creative MntVikingSeat", 250);
    await command("gamemode creative MntVikingVic", 250);
    await command("tp MntVikingKill 348 80 0 0 0", 500);
    await command("tp MntVikingSeat 348 80 2 180 0", 500);
    await command("tp MntVikingVic 349 80 0 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Viking kill rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Viking kill target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted Viking kill victim floor block");
    await command("gamemode survival MntVikingKill", 250);
    await command("gamemode survival MntVikingSeat", 250);
    await command("gamemode survival MntVikingVic", 250);
    await command("classes give MntVikingKill double_long_axe", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntVikingSeat/i);
    assert(mounted, "Viking rider should mount before the mounted kill charge check");
    await wait(500);

    const axe = await waitForInventoryItem(rider, (item) => item?.name === "iron_axe", "mounted rider Viking class axe");
    await rider.equip(axe, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Viking/);
    assert(status, "mounted rider Viking axe should set class status before the kill");

    const beforeCharges = await queryCorebreakerCharges(rider);
    await killVictim(ctx, victim);
    const afterCharges = await queryCorebreakerCharges(rider);

    assert(afterCharges === beforeCharges + 1, `mounted Viking rider kill should add exactly one Corebreaker charge; before=${beforeCharges}, after=${afterCharges}`);
    assert(await playerExists(ctx, "MntVikingKill"), "mounted Viking kill charge check should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MntVikingSeat"), "mounted Viking kill charge check should not kill or disconnect the target");
    assert(await playerExists(ctx, "MntVikingVic"), "mounted Viking kill charge check should leave the victim online after respawn");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    rider.chat("/classes reset");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MntVikingKill", 250);
    await command("clear MntVikingSeat", 250);
    await command("clear MntVikingVic", 250);
    await command("effect clear MntVikingKill", 250);
    await command("effect clear MntVikingSeat", 250);
    await command("effect clear MntVikingVic", 250);
    await command("attribute MntVikingVic minecraft:max_health base set 20", 250);
    await command("fill 347 79 0 350 79 2 minecraft:air", 500);
    await command("forceload remove 347 0 350 2", 250);
  }
}

async function killVictim(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear MntVikingVic", 250);
  await command("attribute MntVikingVic minecraft:max_health base set 20", 250);
  await command("tp MntVikingKill 348 80 0 0 0", 250);
  await command("tp MntVikingSeat 348 80 2 180 0", 250);
  await command("tp MntVikingVic 349 80 0 -90 0", 250);
  await wait(750);
  await command("data merge entity MntVikingVic {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage MntVikingVic 40 minecraft:generic by MntVikingKill", 500);
  assert(output.trim() === "" || /Applied|damaged|was slain by/i.test(output), `mounted Viking kill damage command reported unexpected output: ${output}`);
  await respawned;
  await wait(1500);
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
