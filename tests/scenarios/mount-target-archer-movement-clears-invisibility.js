import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Archer movement clears invisibility";

const RIDER_FLOOR = new Vec3(368, 79, 0);
const TARGET_FLOOR = new Vec3(368, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtArcherMoveR", { op: false });
  const target = await spawnBot("MtArcherMove", { op: false });

  try {
    await command("forceload add 367 0 370 2", 250);
    await wait(500);
    await command("deop MtArcherMoveR", 250);
    await command("deop MtArcherMove", 250);
    await command("clear MtArcherMoveR", 250);
    await command("clear MtArcherMove", 250);
    await command("effect clear MtArcherMoveR", 250);
    await command("effect clear MtArcherMove", 250);
    await command("fill 367 79 0 370 79 2 minecraft:stone", 500);
    await command("gamemode creative MtArcherMoveR", 250);
    await command("gamemode creative MtArcherMove", 250);
    await command("tp MtArcherMoveR 368 80 0 0 0", 500);
    await command("tp MtArcherMove 368 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target moving Archer rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target moving Archer floor block");
    await command("gamemode survival MtArcherMoveR", 250);
    await command("gamemode survival MtArcherMove", 250);
    await command("classes give MtArcherMove long_bow", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtArcherMove/i);
    assert(mounted, "rider should mount the Archer target before the ridden movement check");
    await wait(500);

    const bow = await waitForInventoryItem(target, (item) => item?.name === "bow", "mounted target moving Long Bow class item");
    await target.equip(bow, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Archer/);
    assert(status, "mounted target Long Bow should set class status before movement invisibility check");

    await wait(32500);
    assert(await clearEffect(ctx, "MtArcherMove", "minecraft:invisibility", "Invisibility"), "ridden Archer target standing still should receive Invisibility before movement");

    await wait(1250);
    assert(await clearEffect(ctx, "MtArcherMove", "minecraft:invisibility", "Invisibility"), "ridden Archer target should regain Invisibility while still stationary");

    await command("tp MtArcherMove 369 80 2 180 0", 500);
    await wait(1000);
    assert(!(await clearEffect(ctx, "MtArcherMove", "minecraft:invisibility", "Invisibility")), "ridden Archer target movement should clear Invisibility");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    target.chat("/classes reset");
    await wait(500);
    await command("clear MtArcherMoveR", 250);
    await command("clear MtArcherMove", 250);
    await command("effect clear MtArcherMoveR", 250);
    await command("effect clear MtArcherMove", 250);
    await command("fill 367 79 0 370 79 2 minecraft:air", 500);
    await command("forceload remove 367 0 370 2", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
