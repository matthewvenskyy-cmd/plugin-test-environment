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

export const name = "Mounted target bound items cannot be dropped";

const DROP_POSITION = new Vec3(88, 80, 2);
const RIDER_FLOOR = new Vec3(88, 79, -2);
const TARGET_FLOOR = new Vec3(88, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtNoDropR", { op: false });
  const target = await spawnBot("MtTgtNoDrop", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("deop MtTgtNoDropR", 250);
    await command("deop MtTgtNoDrop", 250);
    await command("fill 87 79 -3 89 79 2 minecraft:stone", 250);
    await command("gamemode creative MtTgtNoDropR", 250);
    await command("gamemode creative MtTgtNoDrop", 250);
    await command("tp MtTgtNoDropR 88 80 -2 0 0", 500);
    await command("tp MtTgtNoDrop 88 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target drop rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target drop floor block");
    await command("gamemode survival MtTgtNoDropR", 250);
    await command("gamemode survival MtTgtNoDrop", 250);
    await command("effect give MtTgtNoDropR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtNoDrop minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtNoDropR 88 80 -2 0 0", 500);
    await command("tp MtTgtNoDrop 88 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtNoDrop/i);
    assert(mounted, "rider should mount the target player before target bound item drop attempts");
    await wait(500);

    const coreItem = await waitForInventoryItem(target, isCoreItem, "mounted target bound core item");
    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target bound Corebreaker");
    const startingCoreItems = countMatchingItems(target, isCoreItem);
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);

    await tryToss(target, coreItem);
    await wait(750);
    assert(countMatchingItems(target, isCoreItem) === startingCoreItems, "ridden target bound core item should stay in inventory after drop attempt");
    assert(await queryDroppedItemEntityCount(ctx, DROP_POSITION, 5) === 0, "ridden target bound core drop attempt should not create an item entity");

    await tryToss(target, corebreaker);
    await wait(750);
    assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target Corebreaker should stay in inventory after drop attempt");
    assert(await queryDroppedItemEntityCount(ctx, DROP_POSITION, 5) === 0, "ridden target Corebreaker drop attempt should not create an item entity");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("fill 87 79 -3 89 79 2 minecraft:air", 250);
  }
}

async function tryToss(bot, item) {
  try {
    await bot.tossStack(item);
  } catch {
    // A cancelled server-side drop may reject the toss; assertions below verify the contract.
  }
}
