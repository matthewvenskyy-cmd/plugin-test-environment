import { Vec3 } from "vec3";
import {
  clearDroppedItems,
  placeCoreBlock,
  serverBlockIs,
  waitForChat,
  waitForInventoryItem,
  waitForTimeMachineProvenance
} from "./helpers.js";

export const name = "TimeMachine records one alerted near-core break";

const CORE_BLOCK = new Vec3(352, 80, 1);
const SUPPORT_BLOCK = new Vec3(352, 79, 1);
const OWNER_FLOOR = new Vec3(352, 79, 0);
const BREAK_TARGET = new Vec3(353, 80, 1);
const BREAKER_FLOOR = new Vec3(353, 79, 1);

export async function run(ctx) {
  const { assert, command, spawnBot } = ctx;
  const owner = await spawnBot("TmAlertOwner");
  const breaker = await spawnBot("TmAlertBreaker", { op: false });

  try {
    await clearDroppedItems(ctx);
    await command("forceload add 352 1", 250);
    await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${BREAK_TARGET.x} ${BREAK_TARGET.y} ${BREAK_TARGET.z} minecraft:stone`, 250);
    await command("gamemode creative TmAlertOwner", 250);
    await command("gamemode survival TmAlertBreaker", 250);
    await command(`tp TmAlertOwner ${OWNER_FLOOR.x} 80 ${OWNER_FLOOR.z} 0 0`, 500);
    await command(`tp TmAlertBreaker ${BREAKER_FLOOR.x} 80 ${BREAKER_FLOOR.z} 90 0`, 500);
    await command("gamemode survival TmAlertOwner", 250);
    await owner.waitForChunksToLoad();
    await breaker.waitForChunksToLoad();

    await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "TimeMachine alert owner" });
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core should exist before the nearby break");

    await command("give TmAlertBreaker minecraft:diamond_pickaxe", 500);
    const pickaxe = await waitForInventoryItem(
      breaker,
      (item) => item?.name === "diamond_pickaxe",
      "TimeMachine near-core break pickaxe"
    );
    await breaker.equip(pickaxe, "hand");
    const target = breaker.blockAt(BREAK_TARGET);
    assert(target?.name === "stone", "near-core break target should be visible to the breaker");

    const alert = await waitForChat(owner, async () => {
      await breaker.lookAt(BREAK_TARGET.offset(0.5, 0.5, 0.5), true);
      await breaker.dig(target, true);
    }, /Block broken near your core at/i, 8000);
    assert(alert, "CorePlugin should alert the owner about the nearby break");
    assert(await serverBlockIs(ctx, BREAK_TARGET, "air"), "near-core ordinary block should break successfully");
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "near-core break should leave the core intact");

    await command(`setblock ${BREAK_TARGET.x} ${BREAK_TARGET.y} ${BREAK_TARGET.z} minecraft:stone`, 250);
    const provenance = await waitForTimeMachineProvenance(ctx, owner, BREAK_TARGET, {
      requiredPattern: /PLAYER_BREAK/i,
      label: "TimeMachine alerted near-core break provenance"
    });
    const breakEntries = provenance.match(/PLAYER_BREAK/gi) ?? [];
    assert(
      breakEntries.length === 1,
      `alerted near-core break should appear exactly once in TimeMachine history; found ${breakEntries.length}; provenance=${provenance}`
    );
    assert(
      /by TmAlertBreaker/i.test(provenance),
      `TimeMachine should attribute the near-core break to TmAlertBreaker; provenance=${provenance}`
    );
  } finally {
    await command("clear TmAlertBreaker", 250);
    await clearDroppedItems(ctx);
    await command(`setblock ${BREAK_TARGET.x} ${BREAK_TARGET.y} ${BREAK_TARGET.z} minecraft:air`, 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
    await command(`setblock ${BREAKER_FLOOR.x} ${BREAKER_FLOOR.y} ${BREAKER_FLOOR.z} minecraft:air`, 250);
    await command("forceload remove 352 1", 250);
  }
}
