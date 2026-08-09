import { Vec3 } from "vec3";
import { isCoreItem, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider cannot bypass core protection";

const CORE_BLOCK = new Vec3(30, 80, 1);
const SUPPORT_BLOCK = new Vec3(30, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("MountCoreOwner");
  const rider = await spawnBot("MountCoreRider");
  const mount = await spawnBot("MountCoreSeat");

  await command("kill @e[type=item]", 250);
  await command("fill 29 79 -2 32 79 2 minecraft:stone", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);

  await command("gamemode creative MountCoreOwner", 250);
  await command("gamemode creative MountCoreRider", 250);
  await command("gamemode creative MountCoreSeat", 250);
  await command("tp MountCoreOwner 30 80 0 0 0", 500);
  await command("tp MountCoreSeat 31 80 1 90 0", 500);
  await command("tp MountCoreRider 31 80 0 0 0", 500);
  await command("effect give MountCoreOwner minecraft:resistance 10 255 true", 250);
  await command("effect give MountCoreRider minecraft:resistance 10 255 true", 250);
  await command("effect give MountCoreSeat minecraft:resistance 10 255 true", 250);
  await command("gamemode survival MountCoreOwner", 250);
  await command("gamemode survival MountCoreRider", 250);
  await command("gamemode survival MountCoreSeat", 250);
  await wait(1000);
  await command("effect clear MountCoreOwner minecraft:resistance", 250);
  await command("effect clear MountCoreRider minecraft:resistance", 250);
  await command("effect clear MountCoreSeat minecraft:resistance", 250);

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
  assert(owner.blockAt(CORE_BLOCK)?.name === "beacon", "owner core was not placed");

  await command("clear MountCoreRider minecraft:netherite_pickaxe", 250);
  await command("give MountCoreRider minecraft:diamond_pickaxe", 500);
  const pickaxe = await waitForInventoryItem(rider, (item) => item?.name === "diamond_pickaxe", "plain diamond pickaxe");
  await rider.equip(pickaxe, "hand");

  await rider.lookAt(mount.entity.position.offset(0, 1.2, 0), true);
  const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountCoreSeat/i);
  assert(mounted, "rider should mount the target player before core break attempt");
  await wait(750);

  const target = await waitForBlock(rider, CORE_BLOCK, "beacon", "placed core block");
  assert(target?.name === "beacon", "mounted rider could not see the placed core");
  await rider.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
  try {
    await rider.dig(target, true);
  } catch {
    // CorePlugin should cancel the break even while MountPlugin has the player mounted.
  }
  await wait(1500);

  assert(rider.blockAt(CORE_BLOCK)?.name === "beacon", "mounted plain-tool rider should not remove another player's core");

  rider.chat("/unmount");
  await wait(500);
  await command("clear MountCoreRider minecraft:diamond_pickaxe", 250);
  await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
  await command("fill 29 79 -2 32 79 2 minecraft:air", 250);
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
