import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  queryDroppedItemEntityCount,
  waitForEvent,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Core bound items do not drop on death";

const DEATH_POSITION = new Vec3(66.5, 80, 1.5);
const FLOOR = new Vec3(66, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const bot = await spawnBot("BoundDeath");

  try {
    await command("kill @e[type=item]", 250);
    await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:stone`, 250);
    await command("gamemode creative BoundDeath", 250);
    await command(`tp BoundDeath ${DEATH_POSITION.x} ${DEATH_POSITION.y} ${DEATH_POSITION.z} 0 0`, 500);
    await command("gamemode survival BoundDeath", 500);
    await wait(1000);

    assert(countMatchingItems(bot, isCoreItem) > 0, "bound core item should be present before death");
    assert(countMatchingItems(bot, isCorebreakerItem) > 0, "Corebreaker should be present before death");

    await command("kill @e[type=item]", 250);
    const respawned = waitForEvent(bot, "respawn", 8000);
    await command("kill BoundDeath", 500);
    await respawned;
    await wait(1500);

    const droppedItems = await queryDroppedItemEntityCount(ctx, DEATH_POSITION, 4);
    assert(droppedItems === 0, `bound items should be removed from death drops; found ${droppedItems} item entities`);
    await waitForInventoryItem(bot, isCoreItem, "restored bound core item after death");
    await waitForInventoryItem(bot, isCorebreakerItem, "restored Corebreaker after death");
  } finally {
    await command("kill @e[type=item]", 250);
    await command("clear BoundDeath", 250);
    await command(`setblock ${FLOOR.x} ${FLOOR.y} ${FLOOR.z} minecraft:air`, 250);
  }
}
