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

export const name = "Mounted target bound items cannot hotbar-swap into Bigger Crafting Table";

const BCT_BLOCK = new Vec3(283, 80, 2);
const SUPPORT_BLOCK = new Vec3(283, 79, 2);
const RIDER_FLOOR = new Vec3(282, 79, 0);
const TARGET_FLOOR = new Vec3(282, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const placer = await spawnBot("MtTgtHotBctP");
  const rider = await spawnBot("MtTgtHotBctR", { op: false });
  const target = await spawnBot("MtTgtHotBct", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("forceload add 281 0 283 2", 250);
    await wait(500);
    await command("deop MtTgtHotBctR", 250);
    await command("deop MtTgtHotBct", 250);
    await command("fill 281 79 0 283 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative MtTgtHotBctP", 250);
    await command("gamemode creative MtTgtHotBctR", 250);
    await command("gamemode creative MtTgtHotBct", 250);
    await command("tp MtTgtHotBctP 283 80 1 0 0", 500);
    await command("tp MtTgtHotBctR 282 80 0 0 0", 500);
    await command("tp MtTgtHotBct 282 80 2 180 0", 500);
    await waitForBlock(placer, SUPPORT_BLOCK, "stone", "mounted target hotbar BCT support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target hotbar BCT rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target hotbar BCT floor block");
    await command("gamemode survival MtTgtHotBctP", 250);
    await command("gamemode survival MtTgtHotBctR", 250);
    await command("gamemode survival MtTgtHotBct", 250);
    await command("give MtTgtHotBct minecraft:stick", 250);
    await command("effect give MtTgtHotBctP minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtHotBctR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtHotBct minecraft:slow_falling 30 1 true", 250);
    await placer.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtHotBctP 283 80 1 0 0", 500);
    await command("tp MtTgtHotBctR 282 80 0 0 0", 500);
    await command("tp MtTgtHotBct 282 80 2 180 0", 500);
    await wait(250);

    await placeBiggerCraftingTable(ctx, placer, BCT_BLOCK, SUPPORT_BLOCK, { settleMs: 1250 });
    await waitForBlock(target, BCT_BLOCK, "crafter", "mounted target hotbar BCT");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtHotBct/i);
    assert(mounted, "rider should mount the target player before target BCT hotbar-swap attempts");
    await wait(500);

    const startingCoreItems = countMatchingItems(target, isCoreItem);
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);
    assert(startingCoreItems > 0, "ridden target bound core item should be present before BCT hotbar-swap attempts");
    assert(startingCorebreakers > 0, "ridden target Corebreaker should be present before BCT hotbar-swap attempts");

    await assertCannotHotbarSwap(ctx, target, isCoreItem, startingCoreItems, "mounted target core item");
    await assertCannotHotbarSwap(ctx, target, isCorebreakerItem, startingCorebreakers, "mounted target Corebreaker");

    assert(countMatchingItems(target, isCoreItem) === startingCoreItems, "ridden target bound core item count should stay stable after BCT hotbar-swap attempts");
    assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target Corebreaker count should stay stable after BCT hotbar-swap attempts");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear MtTgtHotBctP minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 281 79 0 283 79 2 minecraft:air", 500);
    await command("forceload remove 281 0 283 2", 250);
  }
}

async function assertCannotHotbarSwap(ctx, bot, predicate, startingCount, label) {
  const { assert, wait } = ctx;
  const item = await waitForInventoryItem(bot, predicate, `bound ${label}`);
  await bot.equip(item, "hand");
  await wait(250);

  const quickBarSlot = bot.quickBarSlot;
  assert(quickBarSlot >= 0, `${label} should be in a selected hotbar slot`);
  const opener = await waitForInventoryItem(bot, (candidate) => candidate?.name === "stick", "plain mounted target BCT opener");
  await bot.equip(opener, "hand");
  await wait(250);

  const bctBlock = bot.blockAt(BCT_BLOCK);
  assert(bctBlock?.name === "crafter", "BCT was not prepared for mounted target hotbar-swap test");

  const window = await tryOpenBct(bot, bctBlock);
  if (!window) {
    assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain when mounted target BCT access is blocked`);
    return;
  }

  const deniedPromise = waitForChat(bot, () => {}, /Core items cannot be dropped, traded, or stored\./, 5000)
    .catch(() => null);
  try {
    await Promise.race([
      bot.clickWindow(0, quickBarSlot, 2),
      wait(3000)
    ]);
  } catch {
    // Cancelled custom-inventory clicks can reject at the Mineflayer transaction layer.
  }
  const denied = await deniedPromise;
  await wait(750);
  if (denied) {
    assert(/Core items cannot be dropped, traded, or stored\./.test(denied), `${label} hotbar swap into BCT should be denied`);
  }
  assert(!window.containerItems().some(predicate), `${label} should not appear in the BCT inventory after hotbar swap`);
  window.close();
  await wait(500);

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the mounted target inventory`);
}

async function tryOpenBct(bot, bctBlock) {
  try {
    return await bot.openBlock(bctBlock);
  } catch {
    return null;
  }
}
