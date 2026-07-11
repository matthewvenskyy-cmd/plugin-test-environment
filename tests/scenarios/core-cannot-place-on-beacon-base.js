import { Vec3 } from "vec3";
import { countMatchingItems, isCoreItem, serverBlockIs, waitForInventoryItem } from "./helpers.js";

export const name = "Core cannot be placed on beacon base";

const CORE_BLOCK = new Vec3(26, 80, 1);
const BASE_BLOCK = new Vec3(26, 79, 1);
const FLOOR_BLOCK = new Vec3(26, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("BeaconBaseOwner");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:stone`, 250);
  await command(`setblock ${BASE_BLOCK.x} ${BASE_BLOCK.y} ${BASE_BLOCK.z} minecraft:diamond_block`, 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command("gamemode creative BeaconBaseOwner", 250);
  await command("tp BeaconBaseOwner 26 80 0 0 0", 500);
  await command("gamemode survival BeaconBaseOwner", 250);
  await wait(1000);

  const coreItem = await waitForInventoryItem(owner, isCoreItem, "owner core item");
  const startingCoreItems = countMatchingItems(owner, isCoreItem);
  await owner.equip(coreItem, "hand");

  const base = owner.blockAt(BASE_BLOCK);
  assert(base?.name === "diamond_block", "beacon base block was not prepared");
  await owner.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
  try {
    await owner.placeBlock(base, new Vec3(0, 1, 0));
  } catch {
    // Expected: CorePlugin cancels core placement on beacon-base blocks.
  }
  await wait(1000);

  assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "core placement on a beacon base should be cancelled");
  assert(countMatchingItems(owner, isCoreItem) === startingCoreItems, "cancelled core placement should keep the core item");

  await command("kill @e[type=item]", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${BASE_BLOCK.x} ${BASE_BLOCK.y} ${BASE_BLOCK.z} minecraft:air`, 250);
  await command(`setblock ${FLOOR_BLOCK.x} ${FLOOR_BLOCK.y} ${FLOOR_BLOCK.z} minecraft:air`, 250);
}
