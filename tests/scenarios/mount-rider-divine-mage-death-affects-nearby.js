import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Divine Mage death affects nearby players";

const RIDER_FLOOR = new Vec3(308, 79, 0);
const TARGET_FLOOR = new Vec3(308, 79, 2);
const NEAR_FLOOR = new Vec3(309, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntDivRider", { op: false });
  const target = await spawnBot("MntDivSeat", { op: false });
  const nearby = await spawnBot("MntDivNear", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("forceload add 307 0 310 2", 250);
    await wait(500);
    await command("deop MntDivRider", 250);
    await command("deop MntDivSeat", 250);
    await command("deop MntDivNear", 250);
    await command("clear MntDivRider", 250);
    await command("clear MntDivSeat", 250);
    await command("clear MntDivNear", 250);
    await command("effect clear MntDivRider", 250);
    await command("effect clear MntDivSeat", 250);
    await command("effect clear MntDivNear", 250);
    await command("fill 307 79 0 310 79 2 minecraft:stone", 500);
    await command("gamemode creative MntDivRider", 250);
    await command("gamemode creative MntDivSeat", 250);
    await command("gamemode creative MntDivNear", 250);
    await command("tp MntDivRider 308 80 0 0 0", 500);
    await command("tp MntDivSeat 308 80 2 180 0", 500);
    await command("tp MntDivNear 309 80 0 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Divine Mage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Divine Mage target floor block");
    await waitForBlock(nearby, NEAR_FLOOR, "stone", "mounted Divine Mage nearby floor block");
    await command("gamemode survival MntDivRider", 250);
    await command("gamemode survival MntDivSeat", 250);
    await command("gamemode survival MntDivNear", 250);
    await command("attribute MntDivRider minecraft:max_health base set 20", 250);
    await command("attribute MntDivNear minecraft:max_health base set 40", 250);
    await command("data merge entity MntDivRider {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await command("data merge entity MntDivNear {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await nearby.waitForChunksToLoad();
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntDivSeat/i);
    assert(mounted, "Divine Mage rider should mount the target before death effect check");
    await wait(500);

    await command("classes give MntDivRider divine_mage_staff", 500);
    const staff = await waitForInventoryItem(rider, (item) => item?.name === "blaze_rod", "mounted rider Divine Mage Staff");
    await rider.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Divine Mage/);
    assert(status, "mounted rider Divine Mage Staff should set class status before death");

    const respawned = waitForEvent(rider, "respawn", 8000);
    const damageOutput = await command("damage MntDivRider 40 minecraft:generic", 500);
    assert(/Applied|damaged|died/i.test(damageOutput), `mounted Divine Mage rider death damage command did not report success: ${damageOutput}`);
    await respawned;
    await wait(1500);

    assert(await clearEffect(ctx, "MntDivNear", "minecraft:blindness", "Blindness"), "mounted Divine Mage rider death should apply Blindness to nearby players");
    assert(await clearEffect(ctx, "MntDivNear", "minecraft:slowness", "Slowness"), "mounted Divine Mage rider death should apply Slowness to nearby players");
    assert(await playerExists(ctx, "MntDivSeat"), "mounted Divine Mage rider death should not kill or disconnect the ridden target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("clear MntDivRider", 250);
    await command("clear MntDivSeat", 250);
    await command("clear MntDivNear", 250);
    await command("effect clear MntDivRider", 250);
    await command("effect clear MntDivSeat", 250);
    await command("effect clear MntDivNear", 250);
    await command("attribute MntDivRider minecraft:max_health base set 20", 250);
    await command("attribute MntDivNear minecraft:max_health base set 20", 250);
    await command("fill 307 79 0 310 79 2 minecraft:air", 500);
    await command("forceload remove 307 0 310 2", 250);
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
