import { Vec3 } from "vec3";
import { isCoreItem, serverBlockIs, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Core teleport fails if destination becomes unsafe";

const CORE_BLOCK = new Vec3(194, 80, 1);
const SUPPORT_BLOCK = new Vec3(194, 79, 1);
const START_BLOCK = new Vec3(194, 79, 0);
const AWAY_BLOCK = new Vec3(210, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("CoreUnsafe");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 194 1", 250);
    await command("forceload add 210 0", 250);
    await command("fill 191 79 -2 197 79 4 minecraft:stone", 250);
    await command("fill 191 80 -2 197 83 4 minecraft:air", 250);
    await command(`setblock ${AWAY_BLOCK.x} ${AWAY_BLOCK.y} ${AWAY_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative CoreUnsafe", 250);
    await command(`tp CoreUnsafe ${START_BLOCK.x} 80 ${START_BLOCK.z} 0 0`, 500);
    await command("gamemode survival CoreUnsafe", 250);
    await owner.waitForChunksToLoad();
    await wait(1000);

    const coreItem = await waitForInventoryItem(owner, isCoreItem, "owner core item");
    await owner.equip(coreItem, "hand");
    const support = owner.blockAt(SUPPORT_BLOCK);
    assert(support?.name === "stone", "support block was not prepared for core placement");
    await owner.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
    try {
      await owner.placeBlock(support, new Vec3(0, 1, 0));
    } catch (error) {
      await wait(750);
      if (owner.blockAt(CORE_BLOCK)?.name !== "beacon") {
        throw error;
      }
    }
    await wait(1000);
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core was not placed");

    await command(`tp CoreUnsafe ${AWAY_BLOCK.x} 80 ${AWAY_BLOCK.z} 0 0`, 500);
    await wait(500);
    const awayPosition = owner.entity.position.clone();
    assert(awayPosition.distanceTo(CORE_BLOCK) > 10, "test player was not moved away from the core");

    const queued = await waitForChat(owner, () => owner.chat("/core"), /Teleporting to your core in \d+ seconds\./);
    assert(queued, "/core should queue teleport before the destination is blocked");
    await command("fill 191 77 -2 197 84 4 minecraft:stone", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:beacon`, 250);

    const failed = await waitForChat(owner, () => {}, /core teleport failed because the destination is no longer safe/i, 8000);
    assert(failed, "/core should fail when all nearby safe destinations become blocked during the delay");
    await wait(500);

    assert(owner.entity.position.distanceTo(awayPosition) < 2, "failed /core teleport should leave the player away from the core");
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "failed /core teleport should not modify the placed core");
  } finally {
    await command("kill @e[type=item]", 250);
    await command("fill 191 77 -2 197 84 4 minecraft:air", 250);
    await command(`setblock ${AWAY_BLOCK.x} ${AWAY_BLOCK.y} ${AWAY_BLOCK.z} minecraft:air`, 250);
    await command("forceload remove 194 1", 250);
    await command("forceload remove 210 0", 250);
  }
}
