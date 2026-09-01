import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Archer movement clears invisibility";

const RIDER_FLOOR = new Vec3(364, 79, 0);
const TARGET_FLOOR = new Vec3(364, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntArcherMove", { op: false });
  const target = await spawnBot("MntArchMoveSeat", { op: false });

  try {
    await command("forceload add 363 0 366 2", 250);
    await wait(500);
    await command("deop MntArcherMove", 250);
    await command("deop MntArchMoveSeat", 250);
    await command("clear MntArcherMove", 250);
    await command("clear MntArchMoveSeat", 250);
    await command("effect clear MntArcherMove", 250);
    await command("effect clear MntArchMoveSeat", 250);
    await command("fill 363 79 0 366 79 2 minecraft:stone", 500);
    await command("gamemode creative MntArcherMove", 250);
    await command("gamemode creative MntArchMoveSeat", 250);
    await command("tp MntArcherMove 364 80 0 0 0", 500);
    await command("tp MntArchMoveSeat 364 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted moving Archer rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted moving Archer target floor block");
    await command("gamemode survival MntArcherMove", 250);
    await command("gamemode survival MntArchMoveSeat", 250);
    await command("classes give MntArcherMove long_bow", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntArchMoveSeat/i);
    assert(mounted, "Archer rider should mount the target before the mounted movement check");
    await wait(500);

    const bow = await waitForInventoryItem(rider, (item) => item?.name === "bow", "mounted moving rider Long Bow class item");
    await rider.equip(bow, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Archer/);
    assert(status, "mounted rider Long Bow should set class status before movement invisibility check");

    await wait(32500);
    assert(await clearEffect(ctx, "MntArcherMove", "minecraft:invisibility", "Invisibility"), "mounted Archer rider standing still should receive Invisibility before movement");

    await wait(1250);
    assert(await clearEffect(ctx, "MntArcherMove", "minecraft:invisibility", "Invisibility"), "mounted Archer rider should regain Invisibility while still stationary");

    await command("tp MntArcherMove 365 80 0 0 0", 500);
    await wait(1000);
    assert(!(await clearEffect(ctx, "MntArcherMove", "minecraft:invisibility", "Invisibility")), "mounted Archer rider movement should clear Invisibility");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    rider.chat("/classes reset");
    await wait(500);
    await command("clear MntArcherMove", 250);
    await command("clear MntArchMoveSeat", 250);
    await command("effect clear MntArcherMove", 250);
    await command("effect clear MntArchMoveSeat", 250);
    await command("fill 363 79 0 366 79 2 minecraft:air", 500);
    await command("forceload remove 363 0 366 2", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
