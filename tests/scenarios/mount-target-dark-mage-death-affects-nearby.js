import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Dark Mage death affects nearby players";

const RIDER_FLOOR = new Vec3(304, 79, 0);
const TARGET_FLOOR = new Vec3(304, 79, 2);
const NEAR_FLOOR = new Vec3(305, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtDarkRide", { op: false });
  const target = await spawnBot("MtDarkMage", { op: false });
  const nearby = await spawnBot("MtDarkNear", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("forceload add 303 0 306 2", 250);
    await wait(500);
    await command("deop MtDarkRide", 250);
    await command("deop MtDarkMage", 250);
    await command("deop MtDarkNear", 250);
    await command("clear MtDarkRide", 250);
    await command("clear MtDarkMage", 250);
    await command("clear MtDarkNear", 250);
    await command("effect clear MtDarkRide", 250);
    await command("effect clear MtDarkMage", 250);
    await command("effect clear MtDarkNear", 250);
    await command("fill 303 79 0 306 79 2 minecraft:stone", 500);
    await command("gamemode creative MtDarkRide", 250);
    await command("gamemode creative MtDarkMage", 250);
    await command("gamemode creative MtDarkNear", 250);
    await command("tp MtDarkRide 304 80 0 0 0", 500);
    await command("tp MtDarkMage 304 80 2 180 0", 500);
    await command("tp MtDarkNear 305 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Dark Mage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Dark Mage target floor block");
    await waitForBlock(nearby, NEAR_FLOOR, "stone", "mounted Dark Mage nearby floor block");
    await command("gamemode survival MtDarkRide", 250);
    await command("gamemode survival MtDarkMage", 250);
    await command("gamemode survival MtDarkNear", 250);
    await command("attribute MtDarkMage minecraft:max_health base set 20", 250);
    await command("attribute MtDarkNear minecraft:max_health base set 40", 250);
    await command("data merge entity MtDarkMage {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await command("data merge entity MtDarkNear {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await nearby.waitForChunksToLoad();
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtDarkMage/i);
    assert(mounted, "rider should mount the Dark Mage target before target death effect check");
    await wait(500);

    await command("classes give MtDarkMage dark_mage_staff", 500);
    const staff = await waitForInventoryItem(target, (item) => item?.name === "blaze_rod", "mounted target Dark Mage Staff");
    await target.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Dark Mage/);
    assert(status, "mounted target Dark Mage Staff should set class status before death");

    const respawned = waitForEvent(target, "respawn", 8000);
    const damageOutput = await command("damage MtDarkMage 40 minecraft:generic", 500);
    assert(/Applied|damaged|died/i.test(damageOutput), `mounted Dark Mage target death damage command did not report success: ${damageOutput}`);
    await respawned;
    await wait(1500);

    assert(await clearEffect(ctx, "MtDarkNear", "minecraft:wither", "Wither"), "mounted Dark Mage target death should apply Wither to nearby players");
    assert(await clearEffect(ctx, "MtDarkNear", "minecraft:slowness", "Slowness"), "mounted Dark Mage target death should apply Slowness to nearby players");
    assert(await playerExists(ctx, "MtDarkRide"), "mounted Dark Mage target death should not kill or disconnect the rider");

    const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(notMounted, "mounted Dark Mage target death should clear the rider's active mount session");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("clear MtDarkRide", 250);
    await command("clear MtDarkMage", 250);
    await command("clear MtDarkNear", 250);
    await command("effect clear MtDarkRide", 250);
    await command("effect clear MtDarkMage", 250);
    await command("effect clear MtDarkNear", 250);
    await command("attribute MtDarkMage minecraft:max_health base set 20", 250);
    await command("attribute MtDarkNear minecraft:max_health base set 20", 250);
    await command("fill 303 79 0 306 79 2 minecraft:air", 500);
    await command("forceload remove 303 0 306 2", 250);
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
