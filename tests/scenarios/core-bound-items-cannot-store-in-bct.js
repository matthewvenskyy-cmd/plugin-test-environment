import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isBiggerCraftingTableItem,
  isCoreItem,
  isCorebreakerItem,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Core bound items cannot be stored in Bigger Crafting Table";

const BCT_BLOCK = new Vec3(34, 80, 1);
const SUPPORT_BLOCK = new Vec3(34, 79, 1);
const FLOOR_BLOCK = new Vec3(34, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("BoundBct");

  await command("kill @e[type=item]", 250);
  await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command("gamemode creative BoundBct", 250);
  await command("tp BoundBct 34 80 0 0 0", 500);
  await command("gamemode survival BoundBct", 500);
  await wait(1000);

  bot.chat("/bctgive");
  const bctItem = await waitForInventoryItem(bot, isBiggerCraftingTableItem, "Bigger Crafting Table item");
  await bot.equip(bctItem, "hand");

  const support = bot.blockAt(SUPPORT_BLOCK);
  assert(support?.name === "stone", "support block was not prepared for BCT placement");
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

  const coreItem = await waitForInventoryItem(bot, isCoreItem, "bound core item");
  const corebreaker = await waitForInventoryItem(bot, isCorebreakerItem, "bound Corebreaker");
  const startingCoreItems = countMatchingItems(bot, isCoreItem);
  const startingCorebreakers = countMatchingItems(bot, isCorebreakerItem);

  await assertCannotDeposit(ctx, bot, coreItem, isCoreItem, startingCoreItems, "core item");
  await assertCannotDeposit(ctx, bot, corebreaker, isCorebreakerItem, startingCorebreakers, "Corebreaker");

  assert(countMatchingItems(bot, isCoreItem) === startingCoreItems, "bound core item should stay in inventory after BCT attempts");
  assert(countMatchingItems(bot, isCorebreakerItem) === startingCorebreakers, "Corebreaker should stay in inventory after BCT attempts");

  await command("kill @e[type=item]", 250);
  await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
  await command("clear BoundBct minecraft:crafter", 250);
  await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}

async function assertCannotDeposit(ctx, bot, item, predicate, startingCount, label) {
  const { assert, wait } = ctx;
  const bctBlock = bot.blockAt(BCT_BLOCK);
  assert(bctBlock?.name === "crafter", "BCT was not prepared for bound item storage test");

  const window = await bot.openBlock(bctBlock);
  const deniedPromise = waitForChat(bot, () => {}, /Core items cannot be dropped, traded, or stored\./, 5000);
  try {
    await window.deposit(item.type, item.metadata, 1, item.nbt);
  } catch {
    // Cancelled custom-inventory clicks can surface as rejected Mineflayer transactions.
  }
  const denied = await deniedPromise;
  assert(denied, `${label} BCT storage should be denied`);
  await wait(750);
  assert(!window.containerItems().some(predicate), `${label} should not appear in the BCT inventory`);
  window.close();
  await wait(500);

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the player inventory`);
}
