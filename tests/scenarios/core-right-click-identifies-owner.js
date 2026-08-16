import { Vec3 } from "vec3";
import { isCoreItem, serverBlockIs, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Core right-click identifies owner";

const CORE_BLOCK = new Vec3(184, 80, 1);
const SUPPORT_BLOCK = new Vec3(184, 79, 1);
const OWNER_FLOOR = new Vec3(184, 79, 0);
const VISITOR_FLOOR = new Vec3(185, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("CoreSignOwner");
  const visitor = await spawnBot("CoreVisitor");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 184 1", 250);
    await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
    await command(`setblock ${VISITOR_FLOOR.x} ${VISITOR_FLOOR.y} ${VISITOR_FLOOR.z} minecraft:stone`, 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative CoreSignOwner", 250);
    await command("gamemode creative CoreVisitor", 250);
    await command("tp CoreSignOwner 184 80 0 0 0", 500);
    await command("tp CoreVisitor 185 80 1 90 0", 500);
    await command("gamemode survival CoreSignOwner", 250);
    await command("gamemode survival CoreVisitor", 250);
    await owner.waitForChunksToLoad();
    await visitor.waitForChunksToLoad();
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

    await command("clear CoreVisitor", 250);
    await visitor.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
    const core = visitor.blockAt(CORE_BLOCK);
    assert(core?.name === "beacon", "visitor could not see the placed core");
    const identified = await waitForChat(visitor, async () => {
      await visitor.activateBlock(core);
    }, /This is .*CoreSignOwner.*'s core/i);
    assert(identified, "right-clicking a placed core should identify its owner");
    await wait(750);

    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "right-clicking a core should not modify the block");
  } finally {
    await command("kill @e[type=item]", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
    await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
    await command(`setblock ${VISITOR_FLOOR.x} ${VISITOR_FLOOR.y} ${VISITOR_FLOOR.z} minecraft:air`, 250);
    await command("forceload remove 184 1", 250);
  }
}
