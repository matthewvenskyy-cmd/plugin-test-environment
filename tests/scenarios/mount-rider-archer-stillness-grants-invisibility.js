import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Archer stillness grants invisibility";

const RIDER_FLOOR = new Vec3(356, 79, 0);
const TARGET_FLOOR = new Vec3(356, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntArcherStill", { op: false });
  const target = await spawnBot("MntArcherSeat", { op: false });

  try {
    await command("forceload add 355 0 357 2", 250);
    await wait(500);
    await command("deop MntArcherStill", 250);
    await command("deop MntArcherSeat", 250);
    await command("clear MntArcherStill", 250);
    await command("clear MntArcherSeat", 250);
    await command("effect clear MntArcherStill", 250);
    await command("effect clear MntArcherSeat", 250);
    await command("fill 355 79 0 357 79 2 minecraft:stone", 500);
    await command("gamemode creative MntArcherStill", 250);
    await command("gamemode creative MntArcherSeat", 250);
    await command("tp MntArcherStill 356 80 0 0 0", 500);
    await command("tp MntArcherSeat 356 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Archer rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Archer target floor block");
    await command("gamemode survival MntArcherStill", 250);
    await command("gamemode survival MntArcherSeat", 250);
    await command("classes give MntArcherStill long_bow", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntArcherSeat/i);
    assert(mounted, "Archer rider should mount the target before the mounted stillness check");
    await wait(500);

    const bow = await waitForInventoryItem(rider, (item) => item?.name === "bow", "mounted rider Long Bow class item");
    await rider.equip(bow, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Archer/);
    assert(status, "mounted rider Long Bow should set class status before stillness check");

    await wait(32500);
    assert(await clearEffect(ctx, "MntArcherStill", "minecraft:invisibility", "Invisibility"), "mounted Archer rider standing still should receive Invisibility");
    assert(await playerExists(ctx, "MntArcherStill"), "mounted Archer stillness check should not disconnect the rider");
    assert(await playerExists(ctx, "MntArcherSeat"), "mounted Archer stillness check should not disconnect the target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    rider.chat("/classes reset");
    await wait(500);
    await command("clear MntArcherStill", 250);
    await command("clear MntArcherSeat", 250);
    await command("effect clear MntArcherStill", 250);
    await command("effect clear MntArcherSeat", 250);
    await command("fill 355 79 0 357 79 2 minecraft:air", 500);
    await command("forceload remove 355 0 357 2", 250);
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
