import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  serverBlockIs,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Core cannot place a second owned core";

const FIRST_CORE = new Vec3(154, 80, 1);
const FIRST_SUPPORT = new Vec3(154, 79, 1);
const SECOND_CORE = new Vec3(156, 80, 1);
const SECOND_SUPPORT = new Vec3(156, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const owner = await spawnBot("SecondCore");

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 155 1", 250);
    await command("fill 153 79 0 157 79 2 minecraft:stone", 250);
    await command("fill 153 80 0 157 82 2 minecraft:air", 250);
    await command("gamemode creative SecondCore", 250);
    await command("tp SecondCore 155 80 0 0 0", 500);
    await command("gamemode survival SecondCore", 250);
    await owner.waitForChunksToLoad();
    await wait(1000);

    const originalCore = await waitForInventoryItem(owner, isCoreItem, "owner core item");
    const sourceSlot = toServerContainerSlot(originalCore.slot);
    const copyOutput = await command(`item replace entity SecondCore container.10 from entity SecondCore container.${sourceSlot}`, 500);
    assert(/Replaced|Modified|commands\.item\.target/i.test(copyOutput), `server should duplicate the owned core for second-placement guard setup; output=${copyOutput}`);
    await wait(750);
    assert(countMatchingItems(owner, isCoreItem) === 2, "test setup should produce two owned core items before placement");

    await placeCore(ctx, owner, FIRST_SUPPORT, FIRST_CORE, "first core");
    assert(await serverBlockIs(ctx, FIRST_CORE, "beacon"), "first owned core should be placed");
    assert(countMatchingItems(owner, isCoreItem) === 1, "placing the first core should consume exactly one core item");

    const duplicateCore = await waitForInventoryItem(owner, isCoreItem, "duplicate owned core item");
    await owner.equip(duplicateCore, "hand");
    const secondSupport = owner.blockAt(SECOND_SUPPORT);
    assert(secondSupport?.name === "stone", "second support block was not prepared");
    await owner.lookAt(SECOND_CORE.offset(0.5, 0.5, 0.5), true);
    const denied = await waitForChat(owner, async () => {
      try {
        await owner.placeBlock(secondSupport, new Vec3(0, 1, 0));
      } catch {
        // CorePlugin should cancel the second placement.
      }
    }, /already have a placed core/i);
    assert(denied, "second owned core placement should be denied");
    await wait(1000);

    assert(await serverBlockIs(ctx, FIRST_CORE, "beacon"), "denied second placement should not disturb the first core");
    assert(await serverBlockIs(ctx, SECOND_CORE, "air"), "denied second placement should leave the second target empty");
    assert(countMatchingItems(owner, isCoreItem) === 1, "denied second placement should keep the duplicate core item");
  } finally {
    await command("kill @e[type=item]", 250);
    await command("fill 153 79 0 157 82 2 minecraft:air", 250);
    await command("forceload remove 155 1", 250);
  }
}

async function placeCore(ctx, owner, supportPosition, corePosition, label) {
  const { assert, wait } = ctx;
  const coreItem = await waitForInventoryItem(owner, isCoreItem, `${label} item`);
  await owner.equip(coreItem, "hand");
  await owner.waitForChunksToLoad();
  const support = owner.blockAt(supportPosition);
  assert(support?.name === "stone", `${label} support block was not prepared`);
  await owner.lookAt(corePosition.offset(0.5, 0.5, 0.5), true);
  try {
    await owner.placeBlock(support, new Vec3(0, 1, 0));
  } catch (error) {
    await wait(750);
    if (owner.blockAt(corePosition)?.name !== "beacon") {
      throw error;
    }
  }
  await wait(1000);
}

function toServerContainerSlot(mineflayerSlot) {
  return mineflayerSlot >= 36 && mineflayerSlot <= 44 ? mineflayerSlot - 36 : mineflayerSlot;
}
