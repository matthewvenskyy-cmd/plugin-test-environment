import { Vec3 } from "vec3";
import {
  assertNoBctLeak,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  queryBctDisplayCount,
  selectedItemHasNoDamage,
  waitForBlock,
  waitForInventoryItem
} from "./helpers.js";

export const name = "BCT Corebreaker attempt preserves contents";

const BCT_BLOCK = new Vec3(68, 80, 1);
const SUPPORT_BLOCK = new Vec3(68, 79, 1);
const FLOOR_BLOCK = new Vec3(68, 79, 0);

export async function run(ctx) {
  const { bot, assert, command, wait } = ctx;

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
    await waitForBlock(bot, SUPPORT_BLOCK, "stone", "BCT support block");

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    assert(await queryBctDisplayCount(ctx, BCT_BLOCK) === 1, "placing a BCT should create exactly one display entity");

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
    await assertNoBctLeak(ctx, {
      position: BCT_BLOCK,
      holders: [bot],
      label: "Corebreaker attempt"
    });
    assert(await selectedItemHasNoDamage(ctx, "ScenarioBot"), "Corebreaker attempt should not damage the Corebreaker");

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
