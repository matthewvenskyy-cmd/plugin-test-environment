import { Vec3 } from "vec3";
import {
  assertNoBctLeak,
  clearBctArtifacts,
  isCorebreakerItem,
  placeBiggerCraftingTable,
  queryBctDisplayCount,
  selectedItemHasNoDamage,
  waitForBlock,
  waitForChat,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider BCT Corebreaker attempt preserves contents";

const BCT_BLOCK = new Vec3(457, 80, 1);
const SUPPORT_BLOCK = new Vec3(457, 79, 1);
const PLACER_FLOOR = new Vec3(457, 79, 0);
const RIDER_FLOOR = new Vec3(458, 79, -2);
const SEAT_FLOOR = new Vec3(458, 79, 2);

export async function run(ctx) {
  const { bot, assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MRBctContents", { op: false });
  const seat = await spawnBot("MRBctSeat", { op: false });

  try {
    await clearBctArtifacts(ctx);
    await command("forceload add 457 -2 458 2", 250);
    await command("deop MRBctContents", 250);
    await command("deop MRBctSeat", 250);
    await command("clear MRBctSeat", 250);
    await command("fill 457 79 -2 458 79 2 minecraft:stone", 500);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear ScenarioBot minecraft:diamond", 250);
    await command("gamemode creative ScenarioBot", 250);
    await command("gamemode creative MRBctContents", 250);
    await command("gamemode creative MRBctSeat", 250);
    await command("tp ScenarioBot 457 80 0 0 0", 500);
    await command("tp MRBctContents 458 80 -2 0 0", 500);
    await command("tp MRBctSeat 458 80 2 180 0", 500);
    await waitForBlock(bot, PLACER_FLOOR, "stone", "mounted rider BCT contents placer floor block");
    await waitForBlock(bot, SUPPORT_BLOCK, "stone", "mounted rider BCT contents support block");
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted rider BCT contents rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted rider BCT contents seat floor block");
    await command("gamemode survival ScenarioBot", 250);
    await command("gamemode survival MRBctContents", 250);
    await command("gamemode survival MRBctSeat", 250);
    await command("effect give MRBctContents minecraft:slow_falling 30 1 true", 250);
    await command("effect give MRBctSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await wait(500);

    await placeBiggerCraftingTable(ctx, bot, BCT_BLOCK, SUPPORT_BLOCK);
    assert(await queryBctDisplayCount(ctx, BCT_BLOCK) === 1, "placing a BCT should create exactly one display entity before mounted contents check");

    await command("give ScenarioBot minecraft:diamond 1", 500);
    const diamond = await waitForInventoryItem(bot, (item) => item?.name === "diamond", "mounted BCT contents test diamond");
    const firstWindow = await bot.openBlock(bot.blockAt(BCT_BLOCK));
    await firstWindow.deposit(diamond.type, diamond.metadata, 1, diamond.nbt);
    await wait(750);
    assert(firstWindow.containerItems().some((item) => item?.name === "diamond"), "BCT should contain the deposited diamond before mounted Corebreaker attempt");
    firstWindow.close();
    await wait(500);

    const corebreaker = await waitForInventoryItem(rider, isCorebreakerItem, "mounted rider Corebreaker for BCT contents check");
    await rider.equip(corebreaker, "hand");
    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MRBctSeat/i);
    assert(mounted, "rider should mount the target before BCT contents Corebreaker attempt");
    await wait(500);

    const bct = rider.blockAt(BCT_BLOCK);
    assert(bct?.name === "crafter", "mounted rider could not see the BCT with contents");
    await rider.lookAt(BCT_BLOCK.offset(0.5, 0.5, 0.5), true);
    await Promise.race([
      rider.dig(bct, true).catch(() => {}),
      wait(1500)
    ]);
    try {
      rider.stopDigging();
    } catch {
      // State assertions below capture the BCT/Corebreaker contract.
    }
    await wait(1000);

    assert(rider.blockAt(BCT_BLOCK)?.name === "crafter", "mounted rider Corebreaker should not remove a BCT with contents");
    await assertNoBctLeak(ctx, {
      position: BCT_BLOCK,
      holders: [bot, rider, seat],
      label: "mounted rider Corebreaker contents attempt"
    });
    assert(await selectedItemHasNoDamage(ctx, "MRBctContents"), "mounted rider Corebreaker contents attempt should not damage the Corebreaker");

    const secondWindow = await bot.openBlock(bot.blockAt(BCT_BLOCK));
    assert(secondWindow.containerItems().some((item) => item?.name === "diamond"), "mounted rider Corebreaker attempt should preserve BCT inventory contents");
    secondWindow.close();
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await clearBctArtifacts(ctx);
    await command("clear ScenarioBot minecraft:crafter", 250);
    await command("clear ScenarioBot minecraft:diamond", 250);
    await command("clear MRBctContents", 250);
    await command("clear MRBctSeat", 250);
    await command(`setblock ${BCT_BLOCK.x} ${BCT_BLOCK.y} ${BCT_BLOCK.z} minecraft:air`, 250);
    await command("fill 457 79 -2 458 79 2 minecraft:air", 500);
    await command("forceload remove 457 -2 458 2", 250);
  }
}
