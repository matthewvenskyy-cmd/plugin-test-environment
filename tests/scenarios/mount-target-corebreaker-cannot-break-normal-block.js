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

export const name = "Mounted target Corebreaker cannot break normal blocks";

const TEST_BLOCK = new Vec3(90, 80, 1);
const RIDER_FLOOR = new Vec3(90, 79, -2);
const TARGET_FLOOR = new Vec3(90, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtNormR", { op: false });
  const target = await spawnBot("MtTgtNorm", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("deop MtTgtNormR", 250);
    await command("deop MtTgtNorm", 250);
    await command("fill 89 79 -3 91 79 2 minecraft:stone", 250);
    await command(`setblock ${TEST_BLOCK.x} ${TEST_BLOCK.y} ${TEST_BLOCK.z} minecraft:stone`, 250);
    await command("gamemode creative MtTgtNormR", 250);
    await command("gamemode creative MtTgtNorm", 250);
    await command("tp MtTgtNormR 90 80 -2 0 0", 500);
    await command("tp MtTgtNorm 90 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target normal-block rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target normal-block floor block");
    await waitForBlock(target, TEST_BLOCK, "stone", "ridden target Corebreaker normal block");
    await command("gamemode survival MtTgtNormR", 250);
    await command("gamemode survival MtTgtNorm", 250);
    await command("effect give MtTgtNormR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtNorm minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtNormR 90 80 -2 0 0", 500);
    await command("tp MtTgtNorm 90 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtNorm/i);
    assert(mounted, "rider should mount the target player before target Corebreaker attempt");
    await wait(500);

    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "ridden target Corebreaker");
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);
    const startingCharges = await queryCorebreakerCharges(target);
    await target.equip(corebreaker, "hand");

    const block = target.blockAt(TEST_BLOCK);
    assert(block?.name === "stone", "normal stone block was not prepared for ridden target Corebreaker attempt");
    await target.lookAt(TEST_BLOCK.offset(0.5, 0.5, 0.5), true);
    const denied = await waitForChat(target, async () => {
      try {
        await target.dig(block, true);
      } catch {
        // CorePlugin should cancel non-core Corebreaker use even while the player is being ridden.
      }
    }, /Corebreakers can only break player cores/i);
    assert(denied, "ridden target Corebreaker use on a normal block should be denied");
    await wait(1000);

    assert(await serverBlockIs(ctx, TEST_BLOCK, "stone"), "ridden target Corebreaker should not break normal stone blocks");
    assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target denied normal-block break should keep the Corebreaker item");
    assert(await queryCorebreakerCharges(target) === startingCharges, "ridden target denied normal-block break should not consume a Corebreaker charge");
    assert(await selectedItemHasNoDamage(ctx, "MtTgtNorm"), "ridden target denied normal-block break should not damage the Corebreaker");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command(`setblock ${TEST_BLOCK.x} ${TEST_BLOCK.y} ${TEST_BLOCK.z} minecraft:air`, 250);
    await command("fill 89 79 -3 91 79 2 minecraft:air", 250);
  }
}
