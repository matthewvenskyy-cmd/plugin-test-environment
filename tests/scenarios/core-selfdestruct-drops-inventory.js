import { Vec3 } from "vec3";
import { isCoreItem, queryDroppedItemEntityCount, serverBlockIs, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Core selfdestruct drops owner inventory";

const CORE_BLOCK = new Vec3(136, 80, 1);
const SUPPORT_BLOCK = new Vec3(136, 79, 1);
const OWNER_POSITION = new Vec3(136.5, 80, 0.5);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("SelfDropOwner");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 136 0", 250);
    await command("fill 135 79 -1 137 79 2 minecraft:stone", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative SelfDropOwner", 250);
    await command("tp SelfDropOwner 136 80 0 0 0", 500);
    await command("gamemode survival SelfDropOwner", 250);
    await wait(1000);

    const coreItem = await waitForInventoryItem(owner, isCoreItem, "owner core item");
    await owner.equip(coreItem, "hand");

    const support = await waitForBlock(owner, SUPPORT_BLOCK, "stone", "core support block");
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
    assert(await serverBlockIs(ctx, CORE_BLOCK, "beacon"), "owner core should be placed before selfdestruct");

    await command("give SelfDropOwner minecraft:diamond 4", 500);
    await command("give SelfDropOwner minecraft:emerald 3", 500);
    await wait(500);

    const respawned = waitForEvent(owner, "respawn", 8000);
    const selfdestructed = await waitForChat(owner, () => owner.chat("/selfdestruct"), /core selfdestructed/i);
    assert(selfdestructed, "selfdestruct command should confirm the core was destroyed");
    await respawned;
    await wait(1500);

    assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "selfdestruct should remove the placed core block");
    const droppedItems = await queryDroppedItemEntityCount(ctx, OWNER_POSITION, 3);
    assert(droppedItems >= 1, `selfdestruct should drop owner inventory near the death location; found ${droppedItems} item entities`);
    await waitForInventoryItem(owner, isCoreItem, "restored core item after selfdestruct");
  } finally {
    await command("kill @e[type=item]", 250);
    await command("clear SelfDropOwner", 250);
    await command("fill 135 79 -1 137 82 2 minecraft:air", 250);
    await command("forceload remove 136 0", 250);
  }
}

async function waitForBlock(bot, position, blockName, label, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const block = bot.blockAt(position);
    if (block?.name === blockName) return block;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
