import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  queryDroppedItemEntityCount,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Core bound items cannot be dropped";

const TEST_POSITION = new Vec3(14, 80, 1);
const FLOOR = new Vec3(14, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("BoundItemTester");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:stone`, 250);
  await command("gamemode creative BoundItemTester", 250);
  await command(`tp BoundItemTester ${TEST_POSITION.x} ${TEST_POSITION.y} ${TEST_POSITION.z} 0 0`, 500);
  await command("gamemode survival BoundItemTester", 500);

  const coreItem = await waitForInventoryItem(bot, isCoreItem, "bound core item");
  const corebreaker = await waitForInventoryItem(bot, isCorebreakerItem, "bound Corebreaker");
  const startingCoreItems = countMatchingItems(bot, isCoreItem);
  const startingCorebreakers = countMatchingItems(bot, isCorebreakerItem);

  await tryToss(bot, coreItem);
  await wait(750);
  assert(countMatchingItems(bot, isCoreItem) === startingCoreItems, "bound core item should stay in inventory after drop attempt");
  assert(await queryDroppedItemEntityCount(ctx, TEST_POSITION, 4) === 0, "bound core drop attempt should not create an item entity");

  await tryToss(bot, corebreaker);
  await wait(750);
  assert(countMatchingItems(bot, isCorebreakerItem) === startingCorebreakers, "Corebreaker should stay in inventory after drop attempt");
  assert(await queryDroppedItemEntityCount(ctx, TEST_POSITION, 4) === 0, "Corebreaker drop attempt should not create an item entity");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:air`, 250);
}

async function tryToss(bot, item) {
  try {
    await bot.tossStack(item);
  } catch {
    // A cancelled server-side drop may surface as a rejected toss; either way, the assertions below decide.
  }
}
