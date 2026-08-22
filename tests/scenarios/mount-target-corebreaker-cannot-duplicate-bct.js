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

export const name = "Mounted target Corebreaker cannot duplicate BCT";

const BCT_BLOCK = new Vec3(95, 80, 1);
const SUPPORT_BLOCK = new Vec3(95, 79, 1);
const RIDER_FLOOR = new Vec3(96, 79, -2);
const TARGET_FLOOR = new Vec3(96, 79, 2);

export async function run(ctx) {
  const { bot, assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtBctR", { op: false });
  const target = await spawnBot("MtTgtBct", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("deop MtTgtBctR", 250);
    await command("deop MtTgtBct", 250);
    await command("fill 95 79 -3 97 79 2 minecraft:stone", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command("gamemode creative MtTgtBctR", 250);
    await command("gamemode creative MtTgtBct", 250);
    await command("tp ScenarioBot 95 80 0 0 0", 500);
    await command("tp MtTgtBctR 96 80 -2 0 0", 500);
    await command("tp MtTgtBct 96 80 2 180 0", 500);
    await waitForBlock(bot, SUPPORT_BLOCK, "stone", "BCT support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target BCT rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target BCT floor block");
    await command("gamemode survival ScenarioBot", 250);
    await command("gamemode survival MtTgtBctR", 250);
    await command("gamemode survival MtTgtBct", 250);
    await command("effect give MtTgtBctR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtBct minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtBctR 96 80 -2 0 0", 500);
    await command("tp MtTgtBct 96 80 2 180 0", 500);
    await wait(250);

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    assert(countBctItems(bot) === 0, "BCT item should be consumed after placement");
    assert(await queryBctDisplays(ctx) === 1, "placing a BCT should create exactly one display entity");

    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "ridden target Corebreaker");
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);
    const startingCharges = await queryCorebreakerCharges(target);
    await target.equip(corebreaker, "hand");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtBct/i);
    assert(mounted, "rider should mount the target player before target BCT Corebreaker attempt");
    await wait(500);

    const bct = target.blockAt(BCT_BLOCK);
    assert(bct?.name === "crafter", "ridden target could not see the placed BCT");
    await target.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    const denied = await waitForChat(target, async () => {
      try {
        await target.dig(bct, true);
      } catch {
        // CorePlugin cancellation can surface as a Mineflayer dig rejection.
      }
    }, /Corebreakers can only break player cores/i);
    assert(denied, "ridden target Corebreaker use on BCT should be denied");
    await wait(1000);

    assert(target.blockAt(BCT_BLOCK)?.name === "crafter", "ridden target Corebreaker should not remove the BCT");
    assert(await queryBctDisplays(ctx) === 1, "ridden target Corebreaker attempt should not remove or duplicate the BCT display entity");
    const producedBctCount = countBctItems(bot)
      + countBctItems(rider)
      + countBctItems(target)
      + await queryDroppedItemEntityCount(ctx, BCT_BLOCK.offset(0.5, 0.5, 0.5));
    assert(producedBctCount === 0, `ridden target Corebreaker attempt produced ${producedBctCount} BCT item(s)`);
    assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target denied BCT break should keep the Corebreaker item");
    assert(await queryCorebreakerCharges(target) === startingCharges, "ridden target denied BCT break should not consume a Corebreaker charge");
    assert(await selectedItemHasNoDamage(ctx, "MtTgtBct"), "ridden target denied BCT break should not damage the Corebreaker");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 95 79 -3 97 79 2 minecraft:air", 250);
  }
}

function queryBctDisplays(ctx) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${BCT_BLOCK.x + 0.5},y=${BCT_BLOCK.y + 0.5},z=${BCT_BLOCK.z + 0.5},distance=..1.5]`);
}
