import { Vec3 } from "vec3";
import {
  countBctItems,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  queryDroppedItemEntityCount,
  queryEntityCount,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target BCT Corebreaker attempt preserves contents";

const BCT_BLOCK = new Vec3(461, 80, 1);
const SUPPORT_BLOCK = new Vec3(461, 79, 1);
const PLACER_FLOOR = new Vec3(461, 79, 0);
const RIDER_FLOOR = new Vec3(462, 79, -2);
const TARGET_FLOOR = new Vec3(462, 79, 2);

export async function run(ctx) {
  const { bot, assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MTBctContentsR", { op: false });
  const target = await spawnBot("MTBctContents", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("forceload add 461 -2 462 2", 250);
    await command("deop MTBctContentsR", 250);
    await command("deop MTBctContents", 250);
    await command("clear MTBctContentsR", 250);
    await command("fill 461 79 -2 462 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear ScenarioBot minecraft:diamond", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command("gamemode creative MTBctContentsR", 250);
    await command("gamemode creative MTBctContents", 250);
    await command("tp ScenarioBot 461 80 0 0 0", 500);
    await command("tp MTBctContentsR 462 80 -2 0 0", 500);
    await command("tp MTBctContents 462 80 2 180 0", 500);
    await waitForBlock(bot, PLACER_FLOOR, "stone", "mounted target BCT contents placer floor block");
    await waitForBlock(bot, SUPPORT_BLOCK, "stone", "mounted target BCT contents support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target BCT contents rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target BCT contents target floor block");
    await command("gamemode survival ScenarioBot", 250);
    await command("gamemode survival MTBctContentsR", 250);
    await command("gamemode survival MTBctContents", 250);
    await command("effect give MTBctContentsR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MTBctContents minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await wait(500);

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    assert(await queryBctDisplays(ctx) === 1, "placing a BCT should create exactly one display entity before mounted target contents check");

    await command("give ScenarioBot minecraft:diamond 1", 500);
    const diamond = await waitForInventoryItem(bot, (item) => item?.name === "diamond", "mounted target BCT contents test diamond");
    const firstWindow = await bot.openBlock(bot.blockAt(BCT_BLOCK));
    await firstWindow.deposit(diamond.type, diamond.metadata, 1, diamond.nbt);
    await wait(750);
    assert(firstWindow.containerItems().some((item) => item?.name === "diamond"), "BCT should contain the deposited diamond before mounted target Corebreaker attempt");
    firstWindow.close();
    await wait(500);

    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target Corebreaker for BCT contents check");
    await target.equip(corebreaker, "hand");
    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MTBctContents/i);
    assert(mounted, "rider should mount the target before ridden target BCT contents Corebreaker attempt");
    await wait(500);

    const bct = target.blockAt(BCT_BLOCK);
    assert(bct?.name === "crafter", "ridden target could not see the BCT with contents");
    await target.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    await Promise.race([
      target.dig(bct, true).catch(() => {}),
      wait(1500)
    ]);
    try {
      target.stopDigging();
    } catch {
      // State assertions below capture the BCT/Corebreaker contract.
    }
    await wait(1000);

    assert(target.blockAt(BCT_BLOCK)?.name === "crafter", "ridden target Corebreaker should not remove a BCT with contents");
    assert(await queryBctDisplays(ctx) === 1, "ridden target Corebreaker attempt should leave the BCT display entity intact");
    const producedBctCount = countBctItems(bot)
      + countBctItems(rider)
      + countBctItems(target)
      + await queryDroppedItemEntityCount(ctx, BCT_BLOCK.offset(0.5, 0.5, 0.5));
    assert(producedBctCount === 0, `ridden target Corebreaker contents attempt produced ${producedBctCount} BCT item(s)`);

    const secondWindow = await bot.openBlock(bot.blockAt(BCT_BLOCK));
    assert(secondWindow.containerItems().some((item) => item?.name === "diamond"), "ridden target Corebreaker attempt should preserve BCT inventory contents");
    secondWindow.close();
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear ScenarioBot minecraft:diamond", 250);
    await command("clear MTBctContentsR", 250);
    await command("clear MTBctContents", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 461 79 -2 462 79 2 minecraft:air", 500);
    await command("forceload remove 461 -2 462 2", 250);
  }
}

function queryBctDisplays(ctx) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${BCT_BLOCK.x + 0.5},y=${BCT_BLOCK.y + 0.5},z=${BCT_BLOCK.z + 0.5},distance=..1.5]`);
}
