import { Vec3 } from "vec3";
import { isBiggerCraftingTableItem, queryEntityCount, serverBlockIs, waitForInventoryItem } from "./helpers.js";

export const name = "BCT display lifecycle follows block";

const BCT_BLOCK = new Vec3(22, 80, 1);
const SUPPORT_BLOCK = new Vec3(22, 79, 1);
const FLOOR_BLOCK = new Vec3(22, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("BctDisplayBot");

  await command("kill @e[type=item]", 250);
  await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command("clear BctDisplayBot minecraft:crafter", 250);
  await command("gamemode creative BctDisplayBot", 250);
  await command("tp BctDisplayBot 22 80 0 0 0", 500);
  await command("gamemode survival BctDisplayBot", 250);

  bot.chat("/bctgive");
  const bctItem = await waitForInventoryItem(bot, isBiggerCraftingTableItem, "Bigger Crafting Table item");
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
  await wait(1250);

  assert(bot.blockAt(BCT_BLOCK)?.name === "crafter", "BCT block was not placed");
  assert(await queryBctDisplays(ctx) === 1, "placing a BCT should create exactly one display entity");

  await command("give BctDisplayBot minecraft:diamond_pickaxe", 500);
  const pickaxe = await waitForInventoryItem(bot, (item) => item?.name === "diamond_pickaxe", "diamond pickaxe");
  await bot.equip(pickaxe, "hand");

  for (let attempt = 0; attempt < 3 && !(await serverBlockIs(ctx, BCT_BLOCK, "air")); attempt++) {
    await bot.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    await bot.dig(bot.blockAt(BCT_BLOCK), true);
    await wait(1500);
  }

  assert(await serverBlockIs(ctx, BCT_BLOCK, "air"), "normal BCT break should remove the block");
  assert(await queryBctDisplays(ctx) === 0, "breaking a BCT should remove its display entity");

  await command("kill @e[type=item]", 250);
  await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
  await command("clear BctDisplayBot minecraft:crafter", 250);
  await command("clear BctDisplayBot minecraft:diamond_pickaxe", 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}

function queryBctDisplays(ctx) {
  return queryEntityCount(ctx, `@e[type=item_display,tag=bigger_crafting_table_display,x=${BCT_BLOCK.x + 0.5},y=${BCT_BLOCK.y + 0.5},z=${BCT_BLOCK.z + 0.5},distance=..1.5]`);
}
