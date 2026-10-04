import { Vec3 } from "vec3";
import {
  clearDroppedItems,
  isCorebreakerItem,
  placeCoreBlock,
  waitForInventoryItem,
  waitForServerBlock,
  waitForTimeMachineProvenance
} from "./helpers.js";

export const name = "TimeMachine records successful Corebreaker core destruction";

const CORE_BLOCK = new Vec3(348, 80, 1);
const SUPPORT_BLOCK = new Vec3(348, 79, 1);
const OWNER_FLOOR = new Vec3(348, 79, 0);
const BREAKER_FLOOR = new Vec3(349, 79, 1);

export async function run(ctx) {
  const { assert, bot: breaker, command, spawnBot } = ctx;
  const owner = await spawnBot("TmCoreOwner");

  try {
    await clearDroppedItems(ctx);
    await command("forceload add 348 1", 250);
    await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative TmCoreOwner", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command(`tp TmCoreOwner ${OWNER_FLOOR.x} 80 ${OWNER_FLOOR.z} 0 0`, 500);
    await command(`tp ScenarioBot ${BREAKER_FLOOR.x} 80 ${BREAKER_FLOOR.z} 90 0`, 500);
    await command("gamemode survival TmCoreOwner", 250);
    await command("gamemode survival ScenarioBot", 250);
    await owner.waitForChunksToLoad();
    await breaker.waitForChunksToLoad();

    await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "TimeMachine core owner" });
    const corebreaker = await waitForInventoryItem(breaker, isCorebreakerItem, "TimeMachine successful Corebreaker");
    await breaker.equip(corebreaker, "hand");
    await breaker.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
    try {
      await breaker.dig(breaker.blockAt(CORE_BLOCK), true);
    } catch {
      // CorePlugin cancels vanilla breaking and removes valid target cores itself.
    }
    await waitForServerBlock(ctx, CORE_BLOCK, "air", "Corebreaker core destruction", 5000);

    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:stone`, 250);
    const provenance = await waitForTimeMachineProvenance(ctx, breaker, CORE_BLOCK, {
      label: "TimeMachine destroyed core provenance"
    });
    const breakEntries = provenance.match(/PLAYER_BREAK/gi) ?? [];
    assert(
      breakEntries.length === 1,
      `successful Corebreaker core destruction should appear exactly once in TimeMachine history; found ${breakEntries.length}; provenance=${provenance}`
    );
  } finally {
    await clearDroppedItems(ctx);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
    await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
    await command("forceload remove 348 1", 250);
  }
}
