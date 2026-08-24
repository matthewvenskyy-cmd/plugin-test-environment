import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target bound items cannot hotbar-swap into chests";

const RIDER_FLOOR = new Vec3(278, 79, 0);
const TARGET_FLOOR = new Vec3(278, 79, 2);
const CHEST = new Vec3(279, 80, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtHotbarR", { op: false });
  const target = await spawnBot("MtTgtHotbar", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 277 0 279 2", 250);
    await wait(500);
    await command("deop MtTgtHotbarR", 250);
    await command("deop MtTgtHotbar", 250);
    await command("fill 277 79 0 279 79 2 minecraft:stone", 500);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:chest[facing=west]`, 250);
    await command("gamemode creative MtTgtHotbarR", 250);
    await command("gamemode creative MtTgtHotbar", 250);
    await command("tp MtTgtHotbarR 278 80 0 0 0", 500);
    await command("tp MtTgtHotbar 278 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target hotbar rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target hotbar floor block");
    await waitForBlock(target, CHEST, "chest", "mounted target hotbar chest");
    await command("gamemode survival MtTgtHotbarR", 250);
    await command("gamemode survival MtTgtHotbar", 250);
    await command("give MtTgtHotbar minecraft:stick", 250);
    await command("effect give MtTgtHotbarR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtHotbar minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtHotbarR 278 80 0 0 0", 500);
    await command("tp MtTgtHotbar 278 80 2 -90 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtHotbar/i);
    assert(mounted, "rider should mount the target player before target hotbar-swap attempts");
    await wait(500);

    const startingCoreItems = countMatchingItems(target, isCoreItem);
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);
    assert(startingCoreItems > 0, "ridden target bound core item should be present before hotbar-swap attempts");
    assert(startingCorebreakers > 0, "ridden target Corebreaker should be present before hotbar-swap attempts");

    await assertCannotHotbarSwap(ctx, target, isCoreItem, startingCoreItems, "mounted target core item");
    await assertCannotHotbarSwap(ctx, target, isCorebreakerItem, startingCorebreakers, "mounted target Corebreaker");

    assert(countMatchingItems(target, isCoreItem) === startingCoreItems, "ridden target bound core item count should stay stable after hotbar-swap attempts");
    assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target Corebreaker count should stay stable after hotbar-swap attempts");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:air`, 250);
    await command("fill 277 79 0 279 79 2 minecraft:air", 500);
    await command("forceload remove 277 0 279 2", 250);
  }
}

async function assertCannotHotbarSwap(ctx, bot, predicate, startingCount, label) {
  const { assert, wait } = ctx;
  const item = await waitForInventoryItem(bot, predicate, `bound ${label}`);
  await bot.equip(item, "hand");
  await wait(250);

  const quickBarSlot = bot.quickBarSlot;
  assert(quickBarSlot >= 0, `${label} should be in a selected hotbar slot`);
  const opener = await waitForInventoryItem(bot, (candidate) => candidate?.name === "stick", "plain mounted target chest opener");
  await bot.equip(opener, "hand");
  await wait(250);

  const chestBlock = bot.blockAt(CHEST);
  assert(chestBlock?.name === "chest", "chest was not prepared for mounted target hotbar-swap test");

  const chest = await tryOpenChest(bot, chestBlock);
  if (!chest) {
    assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain when mounted target chest access is blocked`);
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
    // Cancelled hotbar swaps can reject at the Mineflayer transaction layer.
  }
  const denied = await deniedPromise;
  await wait(750);
  if (denied) {
    assert(/Core items cannot be dropped, traded, or stored\./.test(denied), `${label} hotbar swap into chest should be denied`);
  }
  assert(chest.containerItems().length === 0, `${label} should not appear in the chest after hotbar swap`);
  chest.close();
  await wait(500);

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the mounted target inventory`);
}

async function tryOpenChest(bot, chestBlock) {
  try {
    return await bot.openChest(chestBlock);
  } catch {
    return null;
  }
}
