import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  serverBlockIs,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target cannot place another player's core";

const CORE_BLOCK = new Vec3(92, 80, 1);
const SUPPORT_BLOCK = new Vec3(92, 79, 1);
const RIDER_FLOOR = new Vec3(93, 79, -2);
const TARGET_FLOOR = new Vec3(93, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("MtTgtOwnCore");
  const rider = await spawnBot("MtTgtCoreR", { op: false });
  const target = await spawnBot("MtTgtCore", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command(`setblock ${CORE_BLOCK.x} ${CORE_BLOCK.y} ${CORE_BLOCK.z} minecraft:air`, 250);
    await command("deop MtTgtCoreR", 250);
    await command("deop MtTgtCore", 250);
    await command("fill 91 79 -3 94 79 2 minecraft:stone", 250);
    await command("fill 91 80 -3 94 82 2 minecraft:air", 250);
    await command("gamemode creative MtTgtOwnCore", 250);
    await command("gamemode creative MtTgtCoreR", 250);
    await command("gamemode creative MtTgtCore", 250);
    await command("tp MtTgtOwnCore 92 80 0 0 0", 500);
    await command("tp MtTgtCoreR 93 80 -2 0 0", 500);
    await command("tp MtTgtCore 93 80 2 180 0", 500);
    await waitForBlock(owner, SUPPORT_BLOCK, "stone", "mounted target core support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target core rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target core floor block");
    await command("gamemode survival MtTgtOwnCore", 250);
    await command("gamemode survival MtTgtCoreR", 250);
    await command("gamemode survival MtTgtCore", 250);
    await command("effect give MtTgtCoreR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtCore minecraft:slow_falling 30 1 true", 250);
    await owner.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtCoreR 93 80 -2 0 0", 500);
    await command("tp MtTgtCore 93 80 2 180 0", 500);
    await wait(250);

    const ownerCore = await waitForInventoryItem(owner, isCoreItem, "real owner's core item");
    const sourceSlot = toServerContainerSlot(ownerCore.slot);
    await command("clear MtTgtCore minecraft:beacon", 250);
    const copyOutput = await command(`item replace entity MtTgtCore container.0 from entity MtTgtOwnCore container.${sourceSlot}`, 500);
    assert(/Replaced|Modified|commands\.item\.target/i.test(copyOutput), `server should give the target another player's core; output=${copyOutput}`);
    await wait(750);
    assert(countMatchingItems(target, isCoreItem) === 1, "ridden target should hold exactly one copied core item before placement");

    const copiedCore = await waitForInventoryItem(target, isCoreItem, "copied core item");
    await target.equip(copiedCore, "hand");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtCore/i);
    assert(mounted, "rider should mount the target player before target wrong-owner core placement");
    await wait(500);

    const support = target.blockAt(SUPPORT_BLOCK);
    assert(support?.name === "stone", "support block was not visible before ridden target placement attempt");
    assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "target placement position should be empty before ridden target placement attempt");
    await target.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
    const denied = await waitForChat(target, async () => {
      try {
        await target.placeBlock(support, new Vec3(0, 1, 0));
      } catch {
        // CorePlugin should cancel placement for another player's core item even while the player is ridden.
      }
    }, /cannot place another player's core/i);
    assert(denied, "ridden target placing another player's core should be denied");
    await wait(1000);

    assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "ridden target denied wrong-owner core placement should leave the target empty");
    assert(countMatchingItems(target, isCoreItem) === 1, "ridden target denied wrong-owner core placement should keep the copied core item");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("fill 91 79 -3 94 82 2 minecraft:air", 250);
  }
}

function toServerContainerSlot(mineflayerSlot) {
  return mineflayerSlot >= 36 && mineflayerSlot <= 44 ? mineflayerSlot - 36 : mineflayerSlot;
}
