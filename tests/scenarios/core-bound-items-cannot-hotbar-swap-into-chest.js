import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Core bound items cannot hotbar-swap into chests";

const PLAYER_POSITION = new Vec3(58, 80, 1);
const FLOOR = new Vec3(58, 79, 1);
const CHEST = new Vec3(59, 80, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("BoundHotbar");

  try {
    await command("kill @e[type=item]", 250);
    await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:chest`, 250);
    await command("gamemode creative BoundHotbar", 250);
    await command(`tp BoundHotbar ${PLAYER_POSITION.x} ${PLAYER_POSITION.y} ${PLAYER_POSITION.z} 90 0`, 500);
    await command("gamemode survival BoundHotbar", 500);
    await command("give BoundHotbar minecraft:stick", 250);
    await wait(1000);

    const startingCoreItems = countMatchingItems(bot, isCoreItem);
    const startingCorebreakers = countMatchingItems(bot, isCorebreakerItem);
    assert(startingCoreItems > 0, "bound core item should be present before hotbar-swap attempts");
    assert(startingCorebreakers > 0, "Corebreaker should be present before hotbar-swap attempts");

    await assertCannotHotbarSwap(ctx, bot, isCoreItem, startingCoreItems, "core item");
    await assertCannotHotbarSwap(ctx, bot, isCorebreakerItem, startingCorebreakers, "Corebreaker");

    assert(countMatchingItems(bot, isCoreItem) === startingCoreItems, "bound core item count should stay stable after hotbar-swap attempts");
    assert(countMatchingItems(bot, isCorebreakerItem) === startingCorebreakers, "Corebreaker count should stay stable after hotbar-swap attempts");
  } finally {
    await command("kill @e[type=item]", 250);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:air`, 250);
    await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:air`, 250);
  }
}

async function assertCannotHotbarSwap(ctx, bot, predicate, startingCount, label) {
  const { assert, wait } = ctx;
  const item = await waitForInventoryItem(bot, predicate, `bound ${label}`);
  await bot.equip(item, "hand");
  await wait(250);

  const quickBarSlot = bot.quickBarSlot;
  assert(quickBarSlot >= 0, `${label} should be in a selected hotbar slot`);
  const opener = await waitForInventoryItem(bot, (candidate) => candidate?.name === "stick", "plain chest opener");
  await bot.equip(opener, "hand");
  await wait(250);

  const chestBlock = bot.blockAt(CHEST);
  assert(chestBlock?.name === "chest", "chest was not prepared for bound item hotbar-swap test");

  const chest = await bot.openChest(chestBlock);
  const deniedPromise = waitForChat(bot, () => {}, /Core items cannot be dropped, traded, or stored\./, 5000);
  try {
    await bot.clickWindow(0, quickBarSlot, 2);
  } catch {
    // Cancelled hotbar swaps can reject at the Mineflayer transaction layer.
  }
  const denied = await deniedPromise;
  assert(denied, `${label} hotbar swap into chest should be denied`);
  await wait(750);
  assert(chest.containerItems().length === 0, `${label} should not appear in the chest after hotbar swap`);
  chest.close();
  await wait(500);

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the player inventory`);
}
