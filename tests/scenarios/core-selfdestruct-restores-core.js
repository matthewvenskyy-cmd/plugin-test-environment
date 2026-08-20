import { Vec3 } from "vec3";
import { isCoreItem, placeCoreBlock, serverBlockIs, waitForChat, waitForEvent, waitForInventoryItem } from "./helpers.js";

export const name = "Core selfdestruct removes core and restores item";

const CORE_BLOCK = new Vec3(24, 80, 1);
const SUPPORT_BLOCK = new Vec3(24, 79, 1);
const OWNER_FLOOR = new Vec3(24, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("SelfCoreOwner");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:stone`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command("gamemode creative SelfCoreOwner", 250);
  await command("tp SelfCoreOwner 24 80 0 0 0", 500);
  await command("gamemode survival SelfCoreOwner", 250);
  await wait(1000);

  await placeCoreBlock(ctx, owner, CORE_BLOCK, SUPPORT_BLOCK, { label: "owner" });

  const respawned = waitForEvent(owner, "respawn", 8000);
  const selfdestructed = await waitForChat(owner, () => owner.chat("/selfdestruct"), /core selfdestructed/i);
  assert(selfdestructed, "selfdestruct command should confirm the core was destroyed");
  await respawned;
  await wait(1500);

  assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "selfdestruct should remove the placed core block");
  await waitForInventoryItem(owner, isCoreItem, "restored core item after selfdestruct");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${SUPPORT_BLOCK.x} ${SUPPORT_BLOCK.y} ${SUPPORT_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${OWNER_FLOOR.x} ${OWNER_FLOOR.y} ${OWNER_FLOOR.z} minecraft:air`, 250);
}
