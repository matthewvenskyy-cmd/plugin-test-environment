import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Core bound items cannot be stored in chests";

const PLAYER_POSITION = new Vec3(50, 80, 1);
const FLOOR = new Vec3(50, 79, 1);
const CHEST = new Vec3(51, 80, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("BoundChest");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:chest`, 250);
  await command("gamemode creative BoundChest", 250);
  await command(`tp BoundChest ${PLAYER_POSITION.x} ${PLAYER_POSITION.y} ${PLAYER_POSITION.z} 90 0`, 500);
  await command("gamemode survival BoundChest", 500);
  await command("give BoundChest minecraft:stick", 250);
  await wait(1000);

  const coreItem = await waitForInventoryItem(bot, isCoreItem, "bound core item");
  const corebreaker = await waitForInventoryItem(bot, isCorebreakerItem, "bound Corebreaker");
  const opener = await waitForInventoryItem(bot, (item) => item?.name === "stick", "plain chest opener");
  await bot.equip(opener, "hand");
  const startingCoreItems = countMatchingItems(bot, isCoreItem);
  const startingCorebreakers = countMatchingItems(bot, isCorebreakerItem);

  await assertCannotDeposit(ctx, bot, coreItem, isCoreItem, startingCoreItems, "core item");
  await assertCannotDeposit(ctx, bot, corebreaker, isCorebreakerItem, startingCorebreakers, "Corebreaker");

  assert(countMatchingItems(bot, isCoreItem) === startingCoreItems, "bound core item should stay in inventory after chest attempts");
  assert(countMatchingItems(bot, isCorebreakerItem) === startingCorebreakers, "Corebreaker should stay in inventory after chest attempts");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:air`, 250);
}

async function assertCannotDeposit(ctx, bot, item, predicate, startingCount, label) {
  const { assert, wait } = ctx;
  const chestBlock = bot.blockAt(CHEST);
  assert(chestBlock?.name === "chest", "chest was not prepared for bound item storage test");

  const chest = await bot.openChest(chestBlock);
  const deniedPromise = waitForChat(bot, () => {}, /Core items cannot be dropped, traded, or stored\./, 5000);
  try {
    await chest.deposit(item.type, item.metadata, 1, item.nbt);
  } catch {
    // Cancelled inventory clicks can surface as rejected Mineflayer transactions.
  }
  const denied = await deniedPromise;
  assert(denied, `${label} chest storage should be denied`);
  await wait(750);
  assert(chest.containerItems().length === 0, `${label} should not appear in the chest`);
  chest.close();
  await wait(500);

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the player inventory`);
}
