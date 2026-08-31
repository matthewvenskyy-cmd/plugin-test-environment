import { Vec3 } from "vec3";
import { queryCorebreakerCharges, waitForBlock, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Viking kill grants one Corebreaker charge";

const RIDER_FLOOR = new Vec3(352, 79, 0);
const TARGET_FLOOR = new Vec3(352, 79, 2);
const VICTIM_FLOOR = new Vec3(353, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtVikingRide", { op: false });
  const target = await spawnBot("MtVikingKill", { op: false });
  const victim = await spawnBot("MtVikingVic", { op: false });

  try {
    await command("gamerule keepInventory true", 250);
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 351 0 354 2", 250);
    await wait(500);
    await command("deop MtVikingRide", 250);
    await command("deop MtVikingKill", 250);
    await command("deop MtVikingVic", 250);
    await command("clear MtVikingRide", 250);
    await command("clear MtVikingKill", 250);
    await command("clear MtVikingVic", 250);
    await command("effect clear MtVikingRide", 250);
    await command("effect clear MtVikingKill", 250);
    await command("effect clear MtVikingVic", 250);
    await command("fill 351 79 0 354 79 2 minecraft:stone", 500);
    await command("gamemode creative MtVikingRide", 250);
    await command("gamemode creative MtVikingKill", 250);
    await command("gamemode creative MtVikingVic", 250);
    await command("tp MtVikingRide 352 80 0 0 0", 500);
    await command("tp MtVikingKill 352 80 2 180 0", 500);
    await command("tp MtVikingVic 353 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target Viking kill rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target Viking kill target floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted target Viking kill victim floor block");
    await command("gamemode survival MtVikingRide", 250);
    await command("gamemode survival MtVikingKill", 250);
    await command("gamemode survival MtVikingVic", 250);
    await command("classes give MtVikingKill double_long_axe", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtVikingKill/i);
    assert(mounted, "rider should mount the Viking target before the mounted kill charge check");
    await wait(500);

    const axe = await waitForInventoryItem(target, (item) => item?.name === "iron_axe", "mounted target Viking class axe");
    await target.equip(axe, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Viking/);
    assert(status, "mounted target Viking axe should set class status before the kill");

    const beforeCharges = await queryCorebreakerCharges(target);
    await killVictim(ctx, victim);
    const afterCharges = await queryCorebreakerCharges(target);

    assert(afterCharges === beforeCharges + 1, `mounted Viking target kill should add exactly one Corebreaker charge; before=${beforeCharges}, after=${afterCharges}`);
    assert(await playerExists(ctx, "MtVikingRide"), "mounted target Viking kill charge check should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MtVikingKill"), "mounted target Viking kill charge check should not kill or disconnect the target");
    assert(await playerExists(ctx, "MtVikingVic"), "mounted target Viking kill charge check should leave the victim online after respawn");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    target.chat("/classes reset");
    await wait(500);
    await command("gamerule keepInventory false", 250);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MtVikingRide", 250);
    await command("clear MtVikingKill", 250);
    await command("clear MtVikingVic", 250);
    await command("effect clear MtVikingRide", 250);
    await command("effect clear MtVikingKill", 250);
    await command("effect clear MtVikingVic", 250);
    await command("attribute MtVikingVic minecraft:max_health base set 20", 250);
    await command("fill 351 79 0 354 79 2 minecraft:air", 500);
    await command("forceload remove 351 0 354 2", 250);
  }
}

async function killVictim(ctx, victim) {
  const { assert, command, wait } = ctx;
  await command("effect clear MtVikingVic", 250);
  await command("attribute MtVikingVic minecraft:max_health base set 20", 250);
  await command("tp MtVikingRide 352 80 0 0 0", 250);
  await command("tp MtVikingKill 352 80 2 180 0", 250);
  await command("tp MtVikingVic 353 80 2 -90 0", 250);
  await wait(750);
  await command("data merge entity MtVikingVic {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(750);

  const respawned = waitForEvent(victim, "respawn", 8000);
  const output = await command("damage MtVikingVic 40 minecraft:generic by MtVikingKill", 500);
  assert(output.trim() === "" || /Applied|damaged|was slain by/i.test(output), `mounted target Viking kill damage command reported unexpected output: ${output}`);
  await respawned;
  await wait(1500);
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
