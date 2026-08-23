import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider bound items cannot be stored in chests";

const RIDER_FLOOR = new Vec3(268, 79, 0);
const SEAT_FLOOR = new Vec3(268, 79, 2);
const CHEST = new Vec3(269, 80, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntChestRider", { op: false });
  const seat = await spawnBot("MntChestSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 267 0 269 2", 250);
    await wait(500);
    await command("deop MntChestRider", 250);
    await command("deop MntChestSeat", 250);
    await command("fill 267 79 0 269 79 2 minecraft:stone", 500);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:chest[facing=west]`, 250);
    await command("gamemode creative MntChestRider", 250);
    await command("gamemode creative MntChestSeat", 250);
    await command("tp MntChestRider 268 80 0 0 0", 500);
    await command("tp MntChestSeat 268 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider chest floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted rider chest seat floor block");
    await waitForBlock(rider, CHEST, "chest", "mounted rider storage chest");
    await command("gamemode survival MntChestRider", 250);
    await command("gamemode survival MntChestSeat", 250);
    await command("give MntChestRider minecraft:stick", 250);
    await command("effect give MntChestRider minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntChestSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MntChestRider 268 80 0 0 0", 500);
    await command("tp MntChestSeat 268 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntChestSeat/i);
    assert(mounted, "rider should mount the target player before chest storage attempts");
    await wait(500);

    const coreItem = await waitForInventoryItem(rider, isCoreItem, "mounted rider bound core item");
    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider bound Corebreaker");
    const opener = await waitForInventoryItem(rider, (item) => item?.name === "stick", "mounted rider plain chest opener");
    await rider.equip(opener, "hand");
    const startingCoreItems = countMatchingItems(rider, isCoreItem);
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);

    const chestBlock = rider.blockAt(CHEST);
    assert(chestBlock?.name === "chest", "chest was not prepared for mounted bound item storage test");
    const chest = await tryOpenChest(rider, chestBlock);

    if (chest) {
      await assertCannotDeposit(ctx, rider, chest, coreItem, isCoreItem, startingCoreItems, "mounted rider core item");
      await assertCannotDeposit(ctx, rider, chest, corebreaker, isCorebreakerItem, startingCorebreakers, "mounted rider Corebreaker");
      chest.close();
      await wait(500);
    } else {
      assert(countMatchingItems(rider, isCoreItem) === startingCoreItems, "mounted rider blocked chest access should keep the core item");
      assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted rider blocked chest access should keep the Corebreaker");
    }

    assert(countMatchingItems(rider, isCoreItem) === startingCoreItems, "mounted rider bound core item should stay in inventory after chest attempts");
    assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted rider Corebreaker should stay in inventory after chest attempts");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:air`, 250);
    await command("fill 267 79 0 269 79 2 minecraft:air", 500);
    await command("forceload remove 267 0 269 2", 250);
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

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the mounted rider inventory`);
}
