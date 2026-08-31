import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Archer stillness grants invisibility";

const RIDER_FLOOR = new Vec3(360, 79, 0);
const TARGET_FLOOR = new Vec3(360, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtArcherRide", { op: false });
  const target = await spawnBot("MtArcherStill", { op: false });

  try {
    await command("forceload add 359 0 361 2", 250);
    await wait(500);
    await command("deop MtArcherRide", 250);
    await command("deop MtArcherStill", 250);
    await command("clear MtArcherRide", 250);
    await command("clear MtArcherStill", 250);
    await command("effect clear MtArcherRide", 250);
    await command("effect clear MtArcherStill", 250);
    await command("fill 359 79 0 361 79 2 minecraft:stone", 500);
    await command("gamemode creative MtArcherRide", 250);
    await command("gamemode creative MtArcherStill", 250);
    await command("tp MtArcherRide 360 80 0 0 0", 500);
    await command("tp MtArcherStill 360 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target Archer rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target Archer floor block");
    await command("gamemode survival MtArcherRide", 250);
    await command("gamemode survival MtArcherStill", 250);
    await command("classes give MtArcherStill long_bow", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtArcherStill/i);
    assert(mounted, "rider should mount the Archer target before the ridden stillness check");
    await wait(500);

    const bow = await waitForInventoryItem(target, (item) => item?.name === "bow", "mounted target Long Bow class item");
    await target.equip(bow, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Archer/);
    assert(status, "mounted target Long Bow should set class status before stillness check");

    await wait(32500);
    assert(await clearEffect(ctx, "MtArcherStill", "minecraft:invisibility", "Invisibility"), "ridden Archer target standing still should receive Invisibility");
    assert(await playerExists(ctx, "MtArcherRide"), "mounted target Archer stillness check should not disconnect the rider");
    assert(await playerExists(ctx, "MtArcherStill"), "mounted target Archer stillness check should not disconnect the target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    target.chat("/classes reset");
    await wait(500);
    await command("clear MtArcherRide", 250);
    await command("clear MtArcherStill", 250);
    await command("effect clear MtArcherRide", 250);
    await command("effect clear MtArcherStill", 250);
    await command("fill 359 79 0 361 79 2 minecraft:air", 500);
    await command("forceload remove 359 0 361 2", 250);
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
