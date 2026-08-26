import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Necromancer gains speed at night";

const RIDER_FLOOR = new Vec3(296, 79, 0);
const TARGET_FLOOR = new Vec3(296, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntNecroRider", { op: false });
  const target = await spawnBot("MntNecroSeat", { op: false });

  try {
    await command("forceload add 295 0 297 2", 250);
    await wait(500);
    await command("deop MntNecroRider", 250);
    await command("deop MntNecroSeat", 250);
    await command("clear MntNecroRider", 250);
    await command("clear MntNecroSeat", 250);
    await command("effect clear MntNecroRider", 250);
    await command("effect clear MntNecroSeat", 250);
    await command("time set day", 250);
    await command("fill 295 79 0 297 79 2 minecraft:stone", 500);
    await command("gamemode creative MntNecroRider", 250);
    await command("gamemode creative MntNecroSeat", 250);
    await command("tp MntNecroRider 296 80 0 0 0", 500);
    await command("tp MntNecroSeat 296 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Necromancer rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Necromancer target floor block");
    await command("gamemode survival MntNecroRider", 250);
    await command("gamemode survival MntNecroSeat", 250);
    await command("effect give MntNecroRider minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntNecroSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MntNecroRider 296 80 0 0 0", 500);
    await command("tp MntNecroSeat 296 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntNecroSeat/i);
    assert(mounted, "rider should mount the target player before Necromancer night-speed checks");
    await wait(500);

    await command("classes give MntNecroRider necromancer_staff", 500);
    const staff = await waitForInventoryItem(rider, (item) => item?.name === "blaze_rod", "mounted rider Necromancer Staff");
    await rider.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "mounted rider Necromancer Staff should set class status to Necromancer");

    await command("effect clear MntNecroRider minecraft:speed", 250);
    await command("time set day", 250);
    await wait(1500);
    assert(!(await clearEffect(ctx, "MntNecroRider", "minecraft:speed", "Speed")), "mounted Necromancer rider should not receive Speed during daytime");

    await command("time set night", 250);
    await wait(1500);
    assert(await clearEffect(ctx, "MntNecroRider", "minecraft:speed", "Speed"), "mounted Necromancer rider should receive Speed at night");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "mounted Necromancer night-speed checks should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("time set day", 250);
    await command("clear MntNecroRider", 250);
    await command("clear MntNecroSeat", 250);
    await command("effect clear MntNecroRider", 250);
    await command("effect clear MntNecroSeat", 250);
    await command("fill 295 79 0 297 79 2 minecraft:air", 500);
    await command("forceload remove 295 0 297 2", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
