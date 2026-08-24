import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target bound items cannot be stored in Bigger Crafting Table";

const BCT_BLOCK = new Vec3(275, 80, 2);
const SUPPORT_BLOCK = new Vec3(275, 79, 2);
const RIDER_FLOOR = new Vec3(274, 79, 0);
const TARGET_FLOOR = new Vec3(274, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const placer = await spawnBot("MtTgtBctPlace");
  const rider = await spawnBot("MtTgtBctR", { op: false });
  const target = await spawnBot("MtTgtBct", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("forceload add 273 0 275 2", 250);
    await wait(500);
    await command("deop MtTgtBctR", 250);
    await command("deop MtTgtBct", 250);
    await command("fill 273 79 0 275 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative MtTgtBctPlace", 250);
    await command("gamemode creative MtTgtBctR", 250);
    await command("gamemode creative MtTgtBct", 250);
    await command("tp MtTgtBctPlace 275 80 1 0 0", 500);
    await command("tp MtTgtBctR 274 80 0 0 0", 500);
    await command("tp MtTgtBct 274 80 2 180 0", 500);
    await waitForBlock(placer, SUPPORT_BLOCK, "stone", "mounted target BCT support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target BCT rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target BCT floor block");
    await command("gamemode survival MtTgtBctPlace", 250);
    await command("gamemode survival MtTgtBctR", 250);
    await command("gamemode survival MtTgtBct", 250);
    await command("give MtTgtBct minecraft:stick", 250);
    await command("effect give MtTgtBctPlace minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtBctR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtBct minecraft:slow_falling 30 1 true", 250);
    await placer.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtBctPlace 275 80 1 0 0", 500);
    await command("tp MtTgtBctR 274 80 0 0 0", 500);
    await command("tp MtTgtBct 274 80 2 180 0", 500);
    await wait(250);

    await placeBiggerCraftingTable(ctx, placer, BCT_BLOCK, SUPPORT_BLOCK, { settleMs: 1250 });
    await waitForBlock(target, BCT_BLOCK, "crafter", "mounted target storage BCT");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtBct/i);
    assert(mounted, "rider should mount the target player before target BCT storage attempts");
    await wait(500);

    const coreItem = await waitForInventoryItem(target, isCoreItem, "mounted target bound core item");
    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target bound Corebreaker");
    const opener = await waitForInventoryItem(target, (item) => item?.name === "stick", "mounted target plain BCT opener");
    await target.equip(opener, "hand");
    const startingCoreItems = countMatchingItems(target, isCoreItem);
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);

    const bctBlock = target.blockAt(BCT_BLOCK);
    assert(bctBlock?.name === "crafter", "BCT was not prepared for mounted target bound item storage test");
    const window = await tryOpenBct(target, bctBlock);

    if (window) {
      await assertCannotDeposit(ctx, target, window, coreItem, isCoreItem, startingCoreItems, "mounted target core item");
      await assertCannotDeposit(ctx, target, window, corebreaker, isCorebreakerItem, startingCorebreakers, "mounted target Corebreaker");
      window.close();
      await wait(500);
    } else {
      assert(countMatchingItems(target, isCoreItem) === startingCoreItems, "ridden target blocked BCT access should keep the core item");
      assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target blocked BCT access should keep the Corebreaker");
    }

    assert(countMatchingItems(target, isCoreItem) === startingCoreItems, "ridden target bound core item should stay in inventory after BCT attempts");
    assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target Corebreaker should stay in inventory after BCT attempts");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear MtTgtBctPlace minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 273 79 0 275 79 2 minecraft:air", 500);
    await command("forceload remove 273 0 275 2", 250);
  }
}

async function tryOpenBct(bot, bctBlock) {
  try {
    return await bot.openBlock(bctBlock);
  } catch {
    return null;
  }
}

async function assertCannotDeposit(ctx, bot, window, item, predicate, startingCount, label) {
  const { assert, wait } = ctx;

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

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the mounted target inventory`);
}
