import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  queryDroppedItemEntityCount,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider bound items cannot be dropped";

const DROP_POSITION = new Vec3(248, 80, -2);
const RIDER_FLOOR = new Vec3(248, 79, -2);
const SEAT_FLOOR = new Vec3(248, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountBoundDrop", { op: false });
  const seat = await spawnBot("MountBoundSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 248 0", 250);
    await command("deop MountBoundDrop", 250);
    await command("deop MountBoundSeat", 250);
    await command("fill 247 79 -3 249 79 2 minecraft:stone", 500);
    await command("gamemode creative MountBoundDrop", 250);
    await command("gamemode creative MountBoundSeat", 250);
    await command("tp MountBoundDrop 248 80 -2 0 0", 500);
    await command("tp MountBoundSeat 248 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted seat floor block");
    await command("gamemode survival MountBoundDrop", 250);
    await command("gamemode survival MountBoundSeat", 250);
    await command("effect give MountBoundDrop minecraft:slow_falling 30 1 true", 250);
    await command("effect give MountBoundSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MountBoundDrop 248 80 -2 0 0", 500);
    await command("tp MountBoundSeat 248 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountBoundSeat/i);
    assert(mounted, "rider should mount the target player before bound item drop attempts");
    await wait(500);

    const coreItem = await waitForInventoryItem(rider, isCoreItem, "mounted rider bound core item");
    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider bound Corebreaker");
    const startingCoreItems = countMatchingItems(rider, isCoreItem);
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);

    await tryToss(rider, coreItem);
    await wait(750);
    assert(countMatchingItems(rider, isCoreItem) === startingCoreItems, "mounted bound core item should stay in inventory after drop attempt");
    assert(await queryDroppedItemEntityCount(ctx, DROP_POSITION, 5) === 0, "mounted bound core drop attempt should not create an item entity");

    await tryToss(rider, corebreaker);
    await wait(750);
    assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted Corebreaker should stay in inventory after drop attempt");
    assert(await queryDroppedItemEntityCount(ctx, DROP_POSITION, 5) === 0, "mounted Corebreaker drop attempt should not create an item entity");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("fill 247 79 -3 249 79 2 minecraft:air", 500);
    await command("forceload remove 248 0", 250);
  }
}

async function tryToss(bot, item) {
  try {
    await bot.tossStack(item);
  } catch {
    // A cancelled server-side drop may surface as a rejected toss; assertions below decide the contract.
  }
}
