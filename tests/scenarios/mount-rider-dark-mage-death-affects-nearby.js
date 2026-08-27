import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Dark Mage death affects nearby players";

const RIDER_FLOOR = new Vec3(300, 79, 0);
const TARGET_FLOOR = new Vec3(300, 79, 2);
const NEAR_FLOOR = new Vec3(301, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntDarkRider", { op: false });
  const target = await spawnBot("MntDarkSeat", { op: false });
  const nearby = await spawnBot("MntDarkNear", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("forceload add 299 0 302 2", 250);
    await wait(500);
    await command("deop MntDarkRider", 250);
    await command("deop MntDarkSeat", 250);
    await command("deop MntDarkNear", 250);
    await command("clear MntDarkRider", 250);
    await command("clear MntDarkSeat", 250);
    await command("clear MntDarkNear", 250);
    await command("effect clear MntDarkRider", 250);
    await command("effect clear MntDarkSeat", 250);
    await command("effect clear MntDarkNear", 250);
    await command("fill 299 79 0 302 79 2 minecraft:stone", 500);
    await command("gamemode creative MntDarkRider", 250);
    await command("gamemode creative MntDarkSeat", 250);
    await command("gamemode creative MntDarkNear", 250);
    await command("tp MntDarkRider 300 80 0 0 0", 500);
    await command("tp MntDarkSeat 300 80 2 180 0", 500);
    await command("tp MntDarkNear 301 80 0 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Dark Mage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Dark Mage target floor block");
    await waitForBlock(nearby, NEAR_FLOOR, "stone", "mounted Dark Mage nearby floor block");
    await command("gamemode survival MntDarkRider", 250);
    await command("gamemode survival MntDarkSeat", 250);
    await command("gamemode survival MntDarkNear", 250);
    await command("attribute MntDarkRider minecraft:max_health base set 20", 250);
    await command("attribute MntDarkNear minecraft:max_health base set 40", 250);
    await command("data merge entity MntDarkRider {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await command("data merge entity MntDarkNear {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await nearby.waitForChunksToLoad();
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntDarkSeat/i);
    assert(mounted, "Dark Mage rider should mount the target before death effect check");
    await wait(500);

    await command("classes give MntDarkRider dark_mage_staff", 500);
    const staff = await waitForInventoryItem(rider, (item) => item?.name === "blaze_rod", "mounted rider Dark Mage Staff");
    await rider.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Dark Mage/);
    assert(status, "mounted rider Dark Mage Staff should set class status before death");

    const respawned = waitForEvent(rider, "respawn", 8000);
    const damageOutput = await command("damage MntDarkRider 40 minecraft:generic", 500);
    assert(/Applied|damaged|died/i.test(damageOutput), `mounted Dark Mage rider death damage command did not report success: ${damageOutput}`);
    await respawned;
    await wait(1500);

    assert(await clearEffect(ctx, "MntDarkNear", "minecraft:wither", "Wither"), "mounted Dark Mage rider death should apply Wither to nearby players");
    assert(await clearEffect(ctx, "MntDarkNear", "minecraft:slowness", "Slowness"), "mounted Dark Mage rider death should apply Slowness to nearby players");
    assert(await playerExists(ctx, "MntDarkSeat"), "mounted Dark Mage rider death should not kill or disconnect the ridden target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("clear MntDarkRider", 250);
    await command("clear MntDarkSeat", 250);
    await command("clear MntDarkNear", 250);
    await command("effect clear MntDarkRider", 250);
    await command("effect clear MntDarkSeat", 250);
    await command("effect clear MntDarkNear", 250);
    await command("attribute MntDarkRider minecraft:max_health base set 20", 250);
    await command("attribute MntDarkNear minecraft:max_health base set 20", 250);
    await command("fill 299 79 0 302 79 2 minecraft:air", 500);
    await command("forceload remove 299 0 302 2", 250);
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
