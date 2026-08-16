import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCorebreakerItem,
  serverBlockIs,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Corebreaker cannot break normal blocks";

const TEST_BLOCK = new Vec3(174, 80, 1);
const FLOOR_BLOCK = new Vec3(174, 79, 1);
const PLAYER_FLOOR = new Vec3(174, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const breaker = await spawnBot("CoreNormal");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 174 1", 250);
    await command(`setblock ${PLAYER_FLOOR.x} ${PLAYER_FLOOR.y} ${PLAYER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${TEST_BLOCK.x} ${TEST_BLOCK.y} ${TEST_BLOCK.z} minecraft:stone`, 250);
    await command("gamemode creative CoreNormal", 250);
    await command("tp CoreNormal 174 80 0 0 0", 500);
    await command("gamemode survival CoreNormal", 250);
    await breaker.waitForChunksToLoad();
    await wait(1000);

    const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "Corebreaker");
    const startingCorebreakers = countMatchingItems(breaker, isCorebreakerItem);
    await breaker.equip(corebreaker, "hand");

    const target = breaker.blockAt(TEST_BLOCK);
    assert(target?.name === "stone", "normal stone block was not prepared");
    await breaker.lookAt(TEST_BLOCK.offset(0.5, 0.5, 0.5), true);
    const denied = await waitForChat(breaker, async () => {
      try {
        await breaker.dig(target, true);
      } catch {
        // CorePlugin should cancel Corebreaker use on non-core blocks.
      }
    }, /Corebreakers can only break player cores/i);
    assert(denied, "Corebreaker use on a normal block should be denied");
    await wait(1000);

    assert(await serverBlockIs(ctx, TEST_BLOCK, "stone"), "Corebreaker should not break normal stone blocks");
    assert(countMatchingItems(breaker, isCorebreakerItem) === startingCorebreakers, "denied normal-block break should keep the Corebreaker item");
    assert(await querySelectedItemHasNoDamage(ctx), "denied normal-block break should not damage the Corebreaker");
  } finally {
    await command("kill @e[type=item]", 250);
    await command(`setblock ${TEST_BLOCK.x} ${TEST_BLOCK.y} ${TEST_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${PLAYER_FLOOR.x} ${PLAYER_FLOOR.y} ${PLAYER_FLOOR.z} minecraft:air`, 250);
    await command("forceload remove 174 1", 250);
  }
}

async function querySelectedItemHasNoDamage(ctx) {
  const output = await ctx.command("data get entity CoreNormal SelectedItem.components.minecraft:damage", 500);
  return /No element matching|Found no elements|Unknown path|nothing found/i.test(output);
}
