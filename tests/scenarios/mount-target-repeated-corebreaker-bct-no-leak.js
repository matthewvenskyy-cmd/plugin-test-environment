import { Vec3 } from "vec3";
import {
  assertNoBctLeak,
  clearBctArtifacts,
  countBctItems,
  countMatchingItems,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  queryBctDisplayCount,
  queryCorebreakerCharges,
  selectedItemHasNoDamage,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target repeated Corebreaker attempts do not leak BCT state";

const BCT_BLOCK = new Vec3(453, 80, 1);
const SUPPORT_BLOCK = new Vec3(453, 79, 1);
const PLACER_FLOOR = new Vec3(453, 79, 0);
const RIDER_FLOOR = new Vec3(454, 79, -2);
const TARGET_FLOOR = new Vec3(454, 79, 2);

export async function run(ctx) {
  const { bot, assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MTBctRepeatR", { op: false });
  const target = await spawnBot("MTBctRepeat", { op: false });

  try {
    await clearBctArtifacts(ctx);
    await command("forceload add 453 -2 454 2", 250);
    await command("deop MTBctRepeatR", 250);
    await command("deop MTBctRepeat", 250);
    await command("clear MTBctRepeatR", 250);
    await command("fill 453 79 -2 454 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command("gamemode creative MTBctRepeatR", 250);
    await command("gamemode creative MTBctRepeat", 250);
    await command("tp ScenarioBot 453 80 0 0 0", 500);
    await command("tp MTBctRepeatR 454 80 -2 0 0", 500);
    await command("tp MTBctRepeat 454 80 2 180 0", 500);
    await waitForBlock(bot, PLACER_FLOOR, "stone", "mounted target repeated BCT placer floor block");
    await waitForBlock(bot, SUPPORT_BLOCK, "stone", "mounted target repeated BCT support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target repeated BCT rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target repeated BCT target floor block");
    await command("gamemode survival ScenarioBot", 250);
    await command("gamemode survival MTBctRepeatR", 250);
    await command("gamemode survival MTBctRepeat", 250);
    await command("effect give MTBctRepeatR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MTBctRepeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    assert(countBctItems(bot) === 0, "BCT item should be consumed after placement");
    assert(await queryBctDisplayCount(ctx, BCT_BLOCK) === 1, "placing a BCT should create exactly one display entity before repeated ridden-target attempts");

    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target repeated BCT Corebreaker");
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);
    const startingCharges = await queryCorebreakerCharges(target);
    await target.equip(corebreaker, "hand");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MTBctRepeat/i);
    assert(mounted, "rider should mount the target before repeated ridden-target BCT Corebreaker attempts");
    await wait(500);

    for (let attempt = 1; attempt <= 2; attempt++) {
      await command("tp MTBctRepeatR 454 80 -2 0 0", 250);
      await command("tp MTBctRepeat 454 80 2 180 0", 250);
      await wait(250);
      const bct = target.blockAt(BCT_BLOCK);
      assert(bct?.name === "crafter", `attempt ${attempt} should start with the BCT placed`);
      await target.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
      await Promise.race([
        target.dig(bct, true).catch(() => {}),
        wait(1500)
      ]);
      try {
        target.stopDigging();
      } catch {
        // The state assertions below are the important cross-plugin contract.
      }
      await wait(1000);

      assert(target.blockAt(BCT_BLOCK)?.name === "crafter", `attempt ${attempt} should leave the BCT block placed`);
      await assertNoBctLeak(ctx, {
        position: BCT_BLOCK,
        holders: [bot, rider, target],
        label: `attempt ${attempt}`
      });
      assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, `attempt ${attempt} should keep the Corebreaker item`);
      assert(await queryCorebreakerCharges(target) === startingCharges, `attempt ${attempt} should not consume a Corebreaker charge`);
      assert(await selectedItemHasNoDamage(ctx, "MTBctRepeat"), `attempt ${attempt} should not damage the Corebreaker`);
    }
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await clearBctArtifacts(ctx);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear MTBctRepeatR", 250);
    await command("clear MTBctRepeat", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 453 79 -2 454 79 2 minecraft:air", 500);
    await command("forceload remove 453 -2 454 2", 250);
  }
}
