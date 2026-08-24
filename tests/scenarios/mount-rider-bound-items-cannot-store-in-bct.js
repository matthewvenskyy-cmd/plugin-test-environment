import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider bound items cannot be stored in Bigger Crafting Table";

const BCT_BLOCK = new Vec3(273, 80, 2);
const SUPPORT_BLOCK = new Vec3(273, 79, 2);
const RIDER_FLOOR = new Vec3(272, 79, 0);
const SEAT_FLOOR = new Vec3(272, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const placer = await spawnBot("MntBctPlace");
  const rider = await spawnBot("MntBctRider", { op: false });
  const seat = await spawnBot("MntBctSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("forceload add 271 0 273 2", 250);
    await wait(500);
    await command("deop MntBctRider", 250);
    await command("deop MntBctSeat", 250);
    await command("fill 271 79 0 273 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("gamemode creative MntBctPlace", 250);
    await command("gamemode creative MntBctRider", 250);
    await command("gamemode creative MntBctSeat", 250);
    await command("tp MntBctPlace 273 80 1 0 0", 500);
    await command("tp MntBctRider 272 80 0 0 0", 500);
    await command("tp MntBctSeat 272 80 2 180 0", 500);
    await waitForBlock(placer, SUPPORT_BLOCK, "stone", "mounted BCT support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider BCT floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted BCT seat floor block");
    await command("gamemode survival MntBctPlace", 250);
    await command("gamemode survival MntBctRider", 250);
    await command("gamemode survival MntBctSeat", 250);
    await command("effect give MntBctPlace minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntBctRider minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntBctSeat minecraft:slow_falling 30 1 true", 250);
    await placer.waitForChunksToLoad();
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MntBctPlace 273 80 1 0 0", 500);
    await command("tp MntBctRider 272 80 0 0 0", 500);
    await command("tp MntBctSeat 272 80 2 180 0", 500);
    await wait(250);

    await placeBiggerCraftingTable(ctx, placer, BCT_BLOCK, SUPPORT_BLOCK, { settleMs: 1250 });
    await waitForBlock(rider, BCT_BLOCK, "crafter", "mounted rider storage BCT");

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntBctSeat/i);
    assert(mounted, "rider should mount the target player before BCT storage attempts");
    await wait(500);

    const coreItem = await waitForInventoryItem(rider, isCoreItem, "mounted rider bound core item");
    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider bound Corebreaker");
    const startingCoreItems = countMatchingItems(rider, isCoreItem);
    const startingCorebreakers = countMatchingItems(rider, isCorebreakerItem);

    const bctBlock = rider.blockAt(BCT_BLOCK);
    assert(bctBlock?.name === "crafter", "BCT was not prepared for mounted rider bound item storage test");
    const window = await tryOpenBct(rider, bctBlock);

    if (window) {
      await assertCannotDeposit(ctx, rider, window, coreItem, isCoreItem, startingCoreItems, "mounted rider core item");
      await assertCannotDeposit(ctx, rider, window, corebreaker, isCorebreakerItem, startingCorebreakers, "mounted rider Corebreaker");
      window.close();
      await wait(500);
    } else {
      assert(countMatchingItems(rider, isCoreItem) === startingCoreItems, "mounted rider blocked BCT access should keep the core item");
      assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted rider blocked BCT access should keep the Corebreaker");
    }

    assert(countMatchingItems(rider, isCoreItem) === startingCoreItems, "mounted rider bound core item should stay in inventory after BCT attempts");
    assert(countMatchingItems(rider, isCorebreakerItem) === startingCorebreakers, "mounted rider Corebreaker should stay in inventory after BCT attempts");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("kill @e[type=item_display,tag=bigger_crafting_table_display]", 250);
    await command("clear MntBctPlace minecraft:crafter", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 271 79 0 273 79 2 minecraft:air", 500);
    await command("forceload remove 271 0 273 2", 250);
  }
}

async function tryOpenBct(bot, bctBlock) {
  try {
    return await bot.openBlock(bctBlock);
  } catch {
    return null;
  }
}

async function assertCannotDeposit(ctx, bot, window, item, predicate, startingCount, label) {
  const { assert, wait } = ctx;

  const deniedPromise = waitForChat(bot, () => {}, /Core items cannot be dropped, traded, or stored\./, 5000);
  try {
    await window.deposit(item.type, item.metadata, 1, item.nbt);
  } catch {
    // Cancelled custom-inventory clicks can surface as rejected Mineflayer transactions.
  }
  const denied = await deniedPromise;
  assert(denied, `${label} BCT storage should be denied`);
  await wait(750);
  assert(!window.containerItems().some(predicate), `${label} should not appear in the BCT inventory`);

  assert(countMatchingItems(bot, predicate) === startingCount, `${label} should remain in the mounted rider inventory`);
}
