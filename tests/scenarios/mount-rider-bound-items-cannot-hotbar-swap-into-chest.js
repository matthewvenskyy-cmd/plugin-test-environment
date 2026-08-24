import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider bound items cannot hotbar-swap into chests";

const RIDER_FLOOR = new Vec3(276, 79, 0);
const SEAT_FLOOR = new Vec3(276, 79, 2);
const CHEST = new Vec3(277, 80, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntHotbarR", { op: false });
  const seat = await spawnBot("MntHotbarSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 275 0 277 2", 250);
    await wait(500);
    await command("deop MntHotbarR", 250);
    await command("deop MntHotbarSeat", 250);
    await command("fill 275 79 0 277 79 2 minecraft:stone", 500);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:chest[facing=west]`, 250);
    await command("gamemode creative MntHotbarR", 250);
    await command("gamemode creative MntHotbarSeat", 250);
    await command("tp MntHotbarR 276 80 0 0 0", 500);
    await command("tp MntHotbarSeat 276 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider hotbar floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted rider hotbar seat floor block");
    await waitForBlock(rider, CHEST, "chest", "mounted rider hotbar chest");
    await command("gamemode survival MntHotbarR", 250);
    await command("gamemode survival MntHotbarSeat", 250);
    await command("give MntHotbarR minecraft:stick", 250);
    await command("effect give MntHotbarR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntHotbarSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MntHotbarR 276 80 0 0 0", 500);
    await command("tp MntHotbarSeat 276 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntHotbarSeat/i);
    assert(mounted, "rider should mount the target player before hotbar-swap attempts");
    await wait(500);

    const startingCoreItems = countMatchingItems(rider, isCoreItem);
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);
    assert(startingCoreItems > 0, "mounted rider bound core item should be present before hotbar-swap attempts");
    assert(startingCorebreakers > 0, "mounted rider Corebreaker should be present before hotbar-swap attempts");

    await assertCannotHotbarSwap(ctx, rider, isCoreItem, startingCoreItems, "mounted rider core item");
    await assertCannotHotbarSwap(ctx, rider, isCorebreakerItem, startingCorebreakers, "mounted rider Corebreaker");

    assert(countMatchingItems(rider, isCoreItem) === startingCoreItems, "mounted rider bound core item count should stay stable after hotbar-swap attempts");
    assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted rider Corebreaker count should stay stable after hotbar-swap attempts");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:air`, 250);
    await command("fill 275 79 0 277 79 2 minecraft:air", 500);
    await command("forceload remove 275 0 277 2", 250);
  }
}

async function assertCannotHotbarSwap(ctx, bot, predicate, startingCount, label) {
  const { assert, wait } = ctx;
  const item = await waitForInventoryItem(bot, predicate, `bound ${label}`);
  await bot.equip(item, "hand");
  await wait(250);

  const quickBarSlot = bot.quickBarSlot;
  assert(quickBarSlot >= 0, `${label} should be in a selected hotbar slot`);
  const opener = await waitForInventoryItem(bot, (candidate) => candidate?.name === "stick", "plain mounted chest opener");
  await bot.equip(opener, "hand");
  await wait(250);

  const chestBlock = bot.blockAt(CHEST);
  assert(chestBlock?.name === "chest", "chest was not prepared for mounted hotbar-swap test");

  const chest = await tryOpenChest(bot, chestBlock);
  if (!chest) {
    assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain when mounted chest access is blocked`);
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

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the mounted rider inventory`);
}

async function tryOpenChest(bot, chestBlock) {
  try {
    return await bot.openChest(chestBlock);
  } catch {
    return null;
  }
}
