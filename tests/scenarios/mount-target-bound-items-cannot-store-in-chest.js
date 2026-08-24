import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted target bound items cannot be stored in chests";

const RIDER_FLOOR = new Vec3(270, 79, 0);
const TARGET_FLOOR = new Vec3(270, 79, 2);
const CHEST = new Vec3(271, 80, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtChestR", { op: false });
  const target = await spawnBot("MtTgtChest", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 269 0 271 2", 250);
    await wait(500);
    await command("deop MtTgtChestR", 250);
    await command("deop MtTgtChest", 250);
    await command("fill 269 79 0 271 79 2 minecraft:stone", 500);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:chest[facing=west]`, 250);
    await command("gamemode creative MtTgtChestR", 250);
    await command("gamemode creative MtTgtChest", 250);
    await command("tp MtTgtChestR 270 80 0 0 0", 500);
    await command("tp MtTgtChest 270 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target chest rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target chest floor block");
    await waitForBlock(target, CHEST, "chest", "mounted target storage chest");
    await command("gamemode survival MtTgtChestR", 250);
    await command("gamemode survival MtTgtChest", 250);
    await command("give MtTgtChest minecraft:stick", 250);
    await command("effect give MtTgtChestR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtChest minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtChestR 270 80 0 0 0", 500);
    await command("tp MtTgtChest 270 80 2 -90 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtChest/i);
    assert(mounted, "rider should mount the target player before target chest storage attempts");
    await wait(500);

    const coreItem = await waitForInventoryItem(target, isCoreItem, "mounted target bound core item");
    const corebreaker = await waitForInventoryItem(target, isCorebreakerItem, "mounted target bound Corebreaker");
    const opener = await waitForInventoryItem(target, (item) => item?.name === "stick", "mounted target plain chest opener");
    await target.equip(opener, "hand");
    const startingCoreItems = countMatchingItems(target, isCoreItem);
    const startingCorebreakers = countMatchingItems(target, isCorebreakerItem);

    const chestBlock = target.blockAt(CHEST);
    assert(chestBlock?.name === "chest", "chest was not prepared for mounted target bound item storage test");
    const chest = await tryOpenChest(target, chestBlock);

    if (chest) {
      await assertCannotDeposit(ctx, target, chest, coreItem, isCoreItem, startingCoreItems, "mounted target core item");
      await assertCannotDeposit(ctx, target, chest, corebreaker, isCorebreakerItem, startingCorebreakers, "mounted target Corebreaker");
      chest.close();
      await wait(500);
    } else {
      assert(countMatchingItems(target, isCoreItem) === startingCoreItems, "ridden target blocked chest access should keep the core item");
      assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target blocked chest access should keep the Corebreaker");
    }

    assert(countMatchingItems(target, isCoreItem) === startingCoreItems, "ridden target bound core item should stay in inventory after chest attempts");
    assert(countMatchingItems(target, isCorebreakerItem) === startingCorebreakers, "ridden target Corebreaker should stay in inventory after chest attempts");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:air`, 250);
    await command("fill 269 79 0 271 79 2 minecraft:air", 500);
    await command("forceload remove 269 0 271 2", 250);
  }
}

async function tryOpenChest(bot, chestBlock) {
  try {
    return await bot.openChest(chestBlock);
  } catch {
    return null;
  }
}

async function assertCannotDeposit(ctx, bot, chest, item, predicate, startingCount, label) {
  const { assert, wait } = ctx;

  const deniedPromise = waitForChat(bot, () => {}, /Core items cannot be dropped, traded, or stored\./, 5000);
  try {
    await chest.deposit(item.type, item.metadata, 1, item.nbt);
  } catch {
    // Cancelled inventory clicks can surface as rejected Mineflayer transactions.
  }
  const denied = await deniedPromise;
  assert(denied, `${label} chest storage should be denied`);
  await wait(750);
  assert(chest.containerItems().length === 0, `${label} should not appear in the chest`);

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the mounted target inventory`);
}
