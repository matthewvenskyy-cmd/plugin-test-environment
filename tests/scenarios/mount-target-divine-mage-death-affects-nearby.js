import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Divine Mage death affects nearby players";

const RIDER_FLOOR = new Vec3(312, 79, 0);
const TARGET_FLOOR = new Vec3(312, 79, 2);
const NEAR_FLOOR = new Vec3(313, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtDivRide", { op: false });
  const target = await spawnBot("MtDivMage", { op: false });
  const nearby = await spawnBot("MtDivNear", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("forceload add 311 0 314 2", 250);
    await wait(500);
    await command("deop MtDivRide", 250);
    await command("deop MtDivMage", 250);
    await command("deop MtDivNear", 250);
    await command("clear MtDivRide", 250);
    await command("clear MtDivMage", 250);
    await command("clear MtDivNear", 250);
    await command("effect clear MtDivRide", 250);
    await command("effect clear MtDivMage", 250);
    await command("effect clear MtDivNear", 250);
    await command("fill 311 79 0 314 79 2 minecraft:stone", 500);
    await command("gamemode creative MtDivRide", 250);
    await command("gamemode creative MtDivMage", 250);
    await command("gamemode creative MtDivNear", 250);
    await command("tp MtDivRide 312 80 0 0 0", 500);
    await command("tp MtDivMage 312 80 2 180 0", 500);
    await command("tp MtDivNear 313 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Divine Mage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Divine Mage target floor block");
    await waitForBlock(nearby, NEAR_FLOOR, "stone", "mounted Divine Mage nearby floor block");
    await command("gamemode survival MtDivRide", 250);
    await command("gamemode survival MtDivMage", 250);
    await command("gamemode survival MtDivNear", 250);
    await command("attribute MtDivMage minecraft:max_health base set 20", 250);
    await command("attribute MtDivNear minecraft:max_health base set 40", 250);
    await command("data merge entity MtDivMage {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await command("data merge entity MtDivNear {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await nearby.waitForChunksToLoad();
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtDivMage/i);
    assert(mounted, "rider should mount the Divine Mage target before target death effect check");
    await wait(500);

    await command("classes give MtDivMage divine_mage_staff", 500);
    const staff = await waitForInventoryItem(target, (item) => item?.name === "blaze_rod", "mounted target Divine Mage Staff");
    await target.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Divine Mage/);
    assert(status, "mounted target Divine Mage Staff should set class status before death");

    const respawned = waitForEvent(target, "respawn", 8000);
    const damageOutput = await command("damage MtDivMage 40 minecraft:generic", 500);
    assert(/Applied|damaged|died/i.test(damageOutput), `mounted Divine Mage target death damage command did not report success: ${damageOutput}`);
    await respawned;
    await wait(1500);

    assert(await clearEffect(ctx, "MtDivNear", "minecraft:blindness", "Blindness"), "mounted Divine Mage target death should apply Blindness to nearby players");
    assert(await clearEffect(ctx, "MtDivNear", "minecraft:slowness", "Slowness"), "mounted Divine Mage target death should apply Slowness to nearby players");
    assert(await playerExists(ctx, "MtDivRide"), "mounted Divine Mage target death should not kill or disconnect the rider");

    const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(notMounted, "mounted Divine Mage target death should clear the rider's active mount session");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("clear MtDivRide", 250);
    await command("clear MtDivMage", 250);
    await command("clear MtDivNear", 250);
    await command("effect clear MtDivRide", 250);
    await command("effect clear MtDivMage", 250);
    await command("effect clear MtDivNear", 250);
    await command("attribute MtDivMage minecraft:max_health base set 20", 250);
    await command("attribute MtDivNear minecraft:max_health base set 20", 250);
    await command("fill 311 79 0 314 79 2 minecraft:air", 500);
    await command("forceload remove 311 0 314 2", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
