import { Vec3 } from "vec3";
import {
  countBctItems,
  isBiggerCraftingTableItem,
  isCorebreakerItem,
  queryDroppedItemEntityCount,
  queryEntityCount,
  waitForInventoryItem
} from "./helpers.js";

export const name = "BCT Corebreaker attempt preserves contents";

const BCT_BLOCK = new Vec3(68, 80, 1);
const SUPPORT_BLOCK = new Vec3(68, 79, 1);
const FLOOR_BLOCK = new Vec3(68, 79, 0);

export async function run(ctx) {
  const { bot, assert, command, chat, wait, waitForInventory } = ctx;

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear ScenarioBot minecraft:diamond", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command(`tp ScenarioBot ${FLOOR_BLOCK.x} 80 ${FLOOR_BLOCK.z} 0 0`, 500);
    await command("gamemode survival ScenarioBot", 250);

    await chat("/bctgive", 500);
    await waitForInventory((items) => items.some(isBiggerCraftingTableItem));

    const bctItem = bot.inventory.items().find(isBiggerCraftingTableItem);
    assert(bctItem, "Bigger Crafting Table item was not given by /bctgive");
    await bot.equip(bctItem, "hand");

    const support = bot.blockAt(SUPPORT_BLOCK);
    assert(support?.name === "stone", "support block was not prepared");
    await bot.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    try {
      await bot.placeBlock(support, new Vec3(0, 1, 0));
    } catch (error) {
      await wait(750);
      if (bot.blockAt(BCT_BLOCK)?.name !== "crafter") {
        throw error;
      }
    }
    await wait(1000);

    assert(bot.blockAt(BCT_BLOCK)?.name === "crafter", "BCT block was not placed");
    assert(await queryBctDisplays(ctx) === 1, "placing a BCT should create exactly one display entity");

    await command("give ScenarioBot minecraft:diamond 1", 500);
    const diamond = await waitForInventoryItem(bot, (item) => item?.name === "diamond", "BCT test diamond");
    const firstWindow = await bot.openBlock(bot.blockAt(BCT_BLOCK));
    await firstWindow.deposit(diamond.type, diamond.metadata, 1, diamond.nbt);
    await wait(750);
    assert(firstWindow.containerItems().some((item) => item?.name === "diamond"), "BCT should contain the deposited diamond before Corebreaker attempt");
    firstWindow.close();
    await wait(500);

    const corebreaker = await waitForInventoryItem(bot, isCorebreakerItem, "Corebreaker item");
    await bot.equip(corebreaker, "hand");
    try {
      await bot.dig(bot.blockAt(BCT_BLOCK), true);
    } catch {
      // Cancelled server-side breaks often surface as a client-side dig failure.
    }
    await wait(1500);

    assert(bot.blockAt(BCT_BLOCK)?.name === "crafter", "Corebreaker should not remove a BCT with contents");
    assert(await queryBctDisplays(ctx) === 1, "Corebreaker attempt should leave the BCT display entity intact");
    const producedBctCount = countBctItems(bot) + await queryDroppedItemEntityCount(ctx, BCT_BLOCK.offset(0.5, 0.5, 0.5));
    assert(producedBctCount === 0, `Corebreaker attempt produced ${producedBctCount} BCT item(s)`);

    const secondWindow = await bot.openBlock(bot.blockAt(BCT_BLOCK));
    assert(secondWindow.containerItems().some((item) => item?.name === "diamond"), "Corebreaker attempt should preserve BCT inventory contents");
    secondWindow.close();
  } finally {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear ScenarioBot minecraft:diamond", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
  }
}

function queryBctDisplays(ctx) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${BCT_BLOCK.x + 0.5},y=${BCT_BLOCK.y + 0.5},z=${BCT_BLOCK.z + 0.5},distance=..1.5]`);
}
