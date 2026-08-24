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

export const name = "Mounted rider bound items cannot hotbar-swap into Bigger Crafting Table";

const BCT_BLOCK = new Vec3(281, 80, 2);
const SUPPORT_BLOCK = new Vec3(281, 79, 2);
const RIDER_FLOOR = new Vec3(280, 79, 0);
const SEAT_FLOOR = new Vec3(280, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const placer = await spawnBot("MntHotBctP");
  const rider = await spawnBot("MntHotBctR", { op: false });
  const seat = await spawnBot("MntHotBctS", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("forceload add 279 0 281 2", 250);
    await wait(500);
    await command("deop MntHotBctR", 250);
    await command("deop MntHotBctS", 250);
    await command("fill 279 79 0 281 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative MntHotBctP", 250);
    await command("gamemode creative MntHotBctR", 250);
    await command("gamemode creative MntHotBctS", 250);
    await command("tp MntHotBctP 281 80 1 0 0", 500);
    await command("tp MntHotBctR 280 80 0 0 0", 500);
    await command("tp MntHotBctS 280 80 2 180 0", 500);
    await waitForBlock(placer, SUPPORT_BLOCK, "stone", "mounted rider hotbar BCT support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider hotbar BCT floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted rider hotbar BCT seat floor block");
    await command("gamemode survival MntHotBctP", 250);
    await command("gamemode survival MntHotBctR", 250);
    await command("gamemode survival MntHotBctS", 250);
    await command("give MntHotBctR minecraft:stick", 250);
    await command("effect give MntHotBctP minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntHotBctR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntHotBctS minecraft:slow_falling 30 1 true", 250);
    await placer.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MntHotBctP 281 80 1 0 0", 500);
    await command("tp MntHotBctR 280 80 0 0 0", 500);
    await command("tp MntHotBctS 280 80 2 180 0", 500);
    await wait(250);

    await placeBiggerCraftingTable(ctx, placer, BCT_BLOCK, SUPPORT_BLOCK, { settleMs: 1250 });
    await waitForBlock(rider, BCT_BLOCK, "crafter", "mounted rider hotbar BCT");

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntHotBctS/i);
    assert(mounted, "rider should mount the target player before BCT hotbar-swap attempts");
    await wait(500);

    const startingCoreItems = countMatchingItems(rider, isCoreItem);
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);
    assert(startingCoreItems > 0, "mounted rider bound core item should be present before BCT hotbar-swap attempts");
    assert(startingCorebreakers > 0, "mounted rider Corebreaker should be present before BCT hotbar-swap attempts");

    await assertCannotHotbarSwap(ctx, rider, isCoreItem, startingCoreItems, "mounted rider core item");
    await assertCannotHotbarSwap(ctx, rider, isCorebreakerItem, startingCorebreakers, "mounted rider Corebreaker");

    assert(countMatchingItems(rider, isCoreItem) === startingCoreItems, "mounted rider bound core item count should stay stable after BCT hotbar-swap attempts");
    assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted rider Corebreaker count should stay stable after BCT hotbar-swap attempts");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear MntHotBctP minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 279 79 0 281 79 2 minecraft:air", 500);
    await command("forceload remove 279 0 281 2", 250);
  }
}

async function assertCannotHotbarSwap(ctx, bot, predicate, startingCount, label) {
  const { assert, wait } = ctx;
  const item = await waitForInventoryItem(bot, predicate, `bound ${label}`);
  await bot.equip(item, "hand");
  await wait(250);

  const quickBarSlot = bot.quickBarSlot;
  assert(quickBarSlot >= 0, `${label} should be in a selected hotbar slot`);
  const opener = await waitForInventoryItem(bot, (candidate) => candidate?.name === "stick", "plain mounted BCT opener");
  await bot.equip(opener, "hand");
  await wait(250);

  const bctBlock = bot.blockAt(BCT_BLOCK);
  assert(bctBlock?.name === "crafter", "BCT was not prepared for mounted hotbar-swap test");

  const window = await tryOpenBct(bot, bctBlock);
  if (!window) {
    assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain when mounted BCT access is blocked`);
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

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the mounted rider inventory`);
}

async function tryOpenBct(bot, bctBlock) {
  try {
    return await bot.openBlock(bctBlock);
  } catch {
    return null;
  }
}
