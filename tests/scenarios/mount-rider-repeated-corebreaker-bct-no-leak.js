import { Vec3 } from "vec3";
import {
  countBctItems,
  countMatchingItems,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  queryCorebreakerCharges,
  queryDroppedItemEntityCount,
  queryEntityCount,
  selectedItemHasNoDamage,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider repeated Corebreaker attempts do not leak BCT state";

const BCT_BLOCK = new Vec3(449, 80, 1);
const SUPPORT_BLOCK = new Vec3(449, 79, 1);
const PLACER_FLOOR = new Vec3(449, 79, 0);
const RIDER_FLOOR = new Vec3(450, 79, -2);
const SEAT_FLOOR = new Vec3(450, 79, 2);

export async function run(ctx) {
  const { bot, assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MRBctRepeat", { op: false });
  const seat = await spawnBot("MRBctRepeatSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("forceload add 449 -2 450 2", 250);
    await command("deop MRBctRepeat", 250);
    await command("deop MRBctRepeatSeat", 250);
    await command("clear MRBctRepeatSeat", 250);
    await command("fill 449 79 -2 450 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command("gamemode creative MRBctRepeat", 250);
    await command("gamemode creative MRBctRepeatSeat", 250);
    await command("tp ScenarioBot 449 80 0 0 0", 500);
    await command("tp MRBctRepeat 450 80 -2 0 0", 500);
    await command("tp MRBctRepeatSeat 450 80 2 180 0", 500);
    await waitForBlock(bot, PLACER_FLOOR, "stone", "mounted rider repeated BCT placer floor block");
    await waitForBlock(bot, SUPPORT_BLOCK, "stone", "mounted rider repeated BCT support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider repeated BCT rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted rider repeated BCT seat floor block");
    await command("gamemode survival ScenarioBot", 250);
    await command("gamemode survival MRBctRepeat", 250);
    await command("gamemode survival MRBctRepeatSeat", 250);
    await command("effect give MRBctRepeat minecraft:slow_falling 30 1 true", 250);
    await command("effect give MRBctRepeatSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await wait(500);

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    assert(countBctItems(bot) === 0, "BCT item should be consumed after placement");
    assert(await queryBctDisplays(ctx) === 1, "placing a BCT should create exactly one display entity before repeated mounted attempts");

    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider repeated BCT Corebreaker");
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);
    const startingCharges = await queryCorebreakerCharges(rider);
    await rider.equip(corebreaker, "hand");

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MRBctRepeatSeat/i);
    assert(mounted, "rider should mount the target before repeated BCT Corebreaker attempts");
    await wait(500);

    for (let attempt = 1; attempt <= 2; attempt++) {
      await command("tp MRBctRepeat 450 80 -2 0 0", 250);
      await command("tp MRBctRepeatSeat 450 80 2 180 0", 250);
      await wait(250);
      const bct = rider.blockAt(BCT_BLOCK);
      assert(bct?.name === "crafter", `attempt ${attempt} should start with the BCT placed`);
      await rider.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
      await Promise.race([
        rider.dig(bct, true).catch(() => {}),
        wait(1500)
      ]);
      try {
        rider.stopDigging();
      } catch {
        // The state assertions below are the important cross-plugin contract.
      }
      await wait(1000);

      assert(rider.blockAt(BCT_BLOCK)?.name === "crafter", `attempt ${attempt} should leave the BCT block placed`);
      assert(await queryBctDisplays(ctx) === 1, `attempt ${attempt} should keep exactly one BCT display entity`);
      const producedBctCount = countBctItems(bot)
        + countBctItems(rider)
        + countBctItems(seat)
        + await queryDroppedItemEntityCount(ctx, BCT_BLOCK.offset(0.5, 0.5, 0.5));
      assert(producedBctCount === 0, `attempt ${attempt} produced ${producedBctCount} BCT item(s)`);
      assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, `attempt ${attempt} should keep the Corebreaker item`);
      assert(await queryCorebreakerCharges(rider) === startingCharges, `attempt ${attempt} should not consume a Corebreaker charge`);
      assert(await selectedItemHasNoDamage(ctx, "MRBctRepeat"), `attempt ${attempt} should not damage the Corebreaker`);
    }
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear MRBctRepeat", 250);
    await command("clear MRBctRepeatSeat", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 449 79 -2 450 79 2 minecraft:air", 500);
    await command("forceload remove 449 -2 450 2", 250);
  }
}

function queryBctDisplays(ctx) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${BCT_BLOCK.x + 0.5},y=${BCT_BLOCK.y + 0.5},z=${BCT_BLOCK.z + 0.5},distance=..1.5]`);
}
