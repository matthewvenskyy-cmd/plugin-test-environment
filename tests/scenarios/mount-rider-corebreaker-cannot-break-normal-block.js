import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCorebreakerItem,
  queryCorebreakerCharges,
  selectedItemHasNoDamage,
  serverBlockIs,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider Corebreaker cannot break normal blocks";

const TEST_BLOCK = new Vec3(224, 80, 1);
const RIDER_FLOOR = new Vec3(224, 79, 0);
const SEAT_FLOOR = new Vec3(225, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MCorebreak", { op: false });
  const seat = await spawnBot("MCoreSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 224 1", 250);
    await command("deop MCorebreak", 250);
    await command("deop MCoreSeat", 250);
    await command("fill 223 79 -1 226 79 2 minecraft:stone", 500);
    await command(`setblock ${TEST_BLOCK.x} ${TEST_BLOCK.y} ${TEST_BLOCK.z} minecraft:stone`, 250);
    await command("gamemode creative MCorebreak", 250);
    await command("gamemode creative MCoreSeat", 250);
    await command("tp MCorebreak 224 80 0 0 0", 500);
    await command("tp MCoreSeat 225 80 1 90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "seat floor block");
    await waitForBlock(rider, TEST_BLOCK, "stone", "mounted Corebreaker target block");
    await command("gamemode survival MCorebreak", 250);
    await command("gamemode survival MCoreSeat", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MCorebreak 224 80 0 0 0", 500);
    await command("tp MCoreSeat 225 80 1 90 0", 500);
    await wait(250);

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MCoreSeat/i);
    assert(mounted, "rider should mount the target player before Corebreaker attempt");
    await wait(750);

    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider Corebreaker");
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);
    const startingCharges = await queryCorebreakerCharges(rider);
    await rider.equip(corebreaker, "hand");

    const target = rider.blockAt(TEST_BLOCK);
    assert(target?.name === "stone", "normal stone block was not prepared for mounted Corebreaker attempt");
    await rider.lookAt(TEST_BLOCK.offset(0.5, 0.5, 0.5), true);
    const denied = await waitForChat(rider, async () => {
      try {
        await rider.dig(target, true);
      } catch {
        // CorePlugin should still cancel non-core Corebreaker use while MountPlugin has the rider mounted.
      }
    }, /Corebreakers can only break player cores/i);
    assert(denied, "mounted Corebreaker use on a normal block should be denied");
    await wait(1000);

    assert(await serverBlockIs(ctx, TEST_BLOCK, "stone"), "mounted Corebreaker should not break normal stone blocks");
    assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted denied normal-block break should keep the Corebreaker item");
    assert(await queryCorebreakerCharges(rider) === startingCharges, "mounted denied normal-block break should not consume a Corebreaker charge");
    assert(await selectedItemHasNoDamage(ctx, "MCorebreak"), "mounted denied normal-block break should not damage the Corebreaker");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command(`setblock ${TEST_BLOCK.x} ${TEST_BLOCK.y} ${TEST_BLOCK.z} minecraft:air`, 250);
    await command("fill 223 79 -1 226 79 2 minecraft:air", 500);
    await command("forceload remove 224 1", 250);
  }
}
