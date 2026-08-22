import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  queryDroppedItemEntityCount,
  waitForBlock,
  waitForChat,
  waitForEvent,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target bound items do not drop on death";

const DEATH_POSITION = new Vec3(296.5, 80, 2.5);
const RIDER_FLOOR = new Vec3(296, 79, -2);
const TARGET_FLOOR = new Vec3(296, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtDropRide", { op: false });
  const target = await spawnBot("MtTgtDrop", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 296 0", 250);
    await command("deop MtTgtDropRide", 250);
    await command("deop MtTgtDrop", 250);
    await command("fill 295 79 -3 297 79 2 minecraft:stone", 500);
    await command("gamemode creative MtTgtDropRide", 250);
    await command("gamemode creative MtTgtDrop", 250);
    await command("tp MtTgtDropRide 296 80 -2 0 0", 500);
    await command("tp MtTgtDrop 296 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target death rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target death floor block");
    await command("gamemode survival MtTgtDropRide", 250);
    await command("gamemode survival MtTgtDrop", 250);
    await command("effect give MtTgtDropRide minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtDrop minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtDropRide 296 80 -2 0 0", 500);
    await command("tp MtTgtDrop 296 80 2 180 0", 500);
    await wait(250);

    assert(countMatchingItems(target, isCoreItem) > 0, "mounted target core item should be present before death");
    assert(countMatchingItems(target, isCorebreakerItem) > 0, "mounted target Corebreaker should be present before death");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtDrop/i);
    assert(mounted, "rider should mount the target player before target bound item death-drop check");
    await wait(500);

    await command("kill @e[type=item]", 250);
    const respawned = waitForEvent(target, "respawn", 8000);
    await command("kill MtTgtDrop", 500);
    await respawned;
    await wait(1500);

    const droppedItems = await queryDroppedItemEntityCount(ctx, DEATH_POSITION, 5);
    assert(droppedItems === 0, `mounted target bound items should be removed from death drops; found ${droppedItems} item entities`);
    await waitForInventoryItem(target, isCoreItem, "restored mounted target core item after death");
    await waitForInventoryItem(target, isCorebreakerItem, "restored mounted target Corebreaker after death");

    const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(notMounted, "mounted target death should clear the rider's active mount session");
    assert(await playerExists(ctx, "MtTgtDropRide"), "mounted target death should not disconnect or kill the rider");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("clear MtTgtDrop", 250);
    await command("fill 295 79 -3 297 79 2 minecraft:air", 500);
    await command("forceload remove 296 0", 250);
  }
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
