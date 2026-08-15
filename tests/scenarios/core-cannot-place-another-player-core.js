import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  serverBlockIs,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Core cannot place another player's core";

const CORE_BLOCK = new Vec3(164, 80, 1);
const SUPPORT_BLOCK = new Vec3(164, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("CoreRealOwner");
  const thief = await spawnBot("CoreWrongOwner");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 164 1", 250);
    await command("fill 163 79 0 165 79 2 minecraft:stone", 250);
    await command("fill 163 80 0 165 82 2 minecraft:air", 250);
    await command("gamemode creative CoreRealOwner", 250);
    await command("gamemode creative CoreWrongOwner", 250);
    await command("tp CoreRealOwner 164 80 -1 0 0", 500);
    await command("tp CoreWrongOwner 164 80 0 0 0", 500);
    await command("gamemode survival CoreRealOwner", 250);
    await command("gamemode survival CoreWrongOwner", 250);
    await owner.waitForChunksToLoad();
    await thief.waitForChunksToLoad();
    await wait(1000);

    const ownerCore = await waitForInventoryItem(owner, isCoreItem, "real owner's core item");
    const sourceSlot = toServerContainerSlot(ownerCore.slot);
    await command("clear CoreWrongOwner minecraft:beacon", 250);
    const copyOutput = await command(`item replace entity CoreWrongOwner container.0 from entity CoreRealOwner container.${sourceSlot}`, 500);
    assert(/Replaced|Modified|commands\.item\.target/i.test(copyOutput), `server should give the wrong owner another player's core; output=${copyOutput}`);
    await wait(750);
    assert(countMatchingItems(thief, isCoreItem) === 1, "wrong owner should hold exactly one copied core item before placement");

    const copiedCore = await waitForInventoryItem(thief, isCoreItem, "copied core item");
    await thief.equip(copiedCore, "hand");
    const support = thief.blockAt(SUPPORT_BLOCK);
    assert(support?.name === "stone", "support block was not prepared");
    await thief.lookAt(CORE_BLOCK.offset(0.5, 0.5, 0.5), true);
    const denied = await waitForChat(thief, async () => {
      try {
        await thief.placeBlock(support, new Vec3(0, 1, 0));
      } catch {
        // CorePlugin should cancel placement for another player's core item.
      }
    }, /cannot place another player's core/i);
    assert(denied, "placing another player's core should be denied");
    await wait(1000);

    assert(await serverBlockIs(ctx, CORE_BLOCK, "air"), "denied wrong-owner placement should leave the target empty");
    assert(countMatchingItems(thief, isCoreItem) === 1, "denied wrong-owner placement should keep the copied core item");
  } finally {
    await command("kill @e[type=item]", 250);
    await command("fill 163 79 0 165 82 2 minecraft:air", 250);
    await command("forceload remove 164 1", 250);
  }
}

function toServerContainerSlot(mineflayerSlot) {
  return mineflayerSlot >= 36 && mineflayerSlot <= 44 ? mineflayerSlot - 36 : mineflayerSlot;
}
