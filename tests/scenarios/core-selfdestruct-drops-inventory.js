import { Vec3 } from "vec3";
import { isCoreItem, placeCoreBlock, queryDroppedItemEntityCount, serverBlockIs, waitForBlock, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

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

    await waitForBlock(owner, SUPPORT_BLOCK, "stone", "core support block");
    await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "owner" });
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
