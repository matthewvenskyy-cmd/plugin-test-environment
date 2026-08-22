import { Vec3 } from "vec3";
import {
  countMatchingItems,
  isCoreItem,
  isCorebreakerItem,
  queryDroppedItemEntityCount,
  waitForBlock,
  waitForChat,
  waitForEvent,
  waitForInventoryItem
} from "./helpers.js";

export const name = "Mounted rider bound items do not drop on death";

const DEATH_POSITION = new Vec3(272.5, 80, -1.5);
const RIDER_FLOOR = new Vec3(272, 79, -2);
const SEAT_FLOOR = new Vec3(272, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountDeathDrop", { op: false });
  const seat = await spawnBot("MountDeathSeat", { op: false });

  try {
    await command("kill @e[type=item]", 250);
    await command("forceload add 272 0", 250);
    await command("deop MountDeathDrop", 250);
    await command("deop MountDeathSeat", 250);
    await command("fill 271 79 -3 273 79 2 minecraft:stone", 500);
    await command("gamemode creative MountDeathDrop", 250);
    await command("gamemode creative MountDeathSeat", 250);
    await command("tp MountDeathDrop 272 80 -2 0 0", 500);
    await command("tp MountDeathSeat 272 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted death rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted death seat floor block");
    await command("gamemode survival MountDeathDrop", 250);
    await command("gamemode survival MountDeathSeat", 250);
    await command("effect give MountDeathDrop minecraft:slow_falling 30 1 true", 250);
    await command("effect give MountDeathSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await command("tp MountDeathDrop 272 80 -2 0 0", 500);
    await command("tp MountDeathSeat 272 80 2 180 0", 500);
    await wait(250);

    assert(countMatchingItems(rider, isCoreItem) > 0, "mounted rider core item should be present before death");
    assert(countMatchingItems(rider, isCorebreakerItem) > 0, "mounted rider Corebreaker should be present before death");

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountDeathSeat/i);
    assert(mounted, "rider should mount the target player before bound item death-drop check");
    await wait(500);

    await command("kill @e[type=item]", 250);
    const respawned = waitForEvent(rider, "respawn", 8000);
    await command("kill MountDeathDrop", 500);
    await respawned;
    await wait(1500);

    const droppedItems = await queryDroppedItemEntityCount(ctx, DEATH_POSITION, 5);
    assert(droppedItems === 0, `mounted bound items should be removed from death drops; found ${droppedItems} item entities`);
    await waitForInventoryItem(rider, isCoreItem, "restored mounted rider core item after death");
    await waitForInventoryItem(rider, isCorebreakerItem, "restored mounted rider Corebreaker after death");

    const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(notMounted, "mounted rider death should clear the active mount session");
    assert(await playerExists(ctx, "MountDeathSeat"), "mounted rider death should not disconnect or kill the ridden player");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("kill @e[type=item]", 250);
    await command("clear MountDeathDrop", 250);
    await command("fill 271 79 -3 273 79 2 minecraft:air", 500);
    await command("forceload remove 272 0", 250);
  }
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
