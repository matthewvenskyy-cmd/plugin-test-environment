import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Necromancer gains speed at night";

const RIDER_FLOOR = new Vec3(298, 79, 0);
const TARGET_FLOOR = new Vec3(298, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtNecroR", { op: false });
  const target = await spawnBot("MtTgtNecro", { op: false });

  try {
    await command("forceload add 297 0 299 2", 250);
    await wait(500);
    await command("deop MtTgtNecroR", 250);
    await command("deop MtTgtNecro", 250);
    await command("clear MtTgtNecroR", 250);
    await command("clear MtTgtNecro", 250);
    await command("effect clear MtTgtNecroR", 250);
    await command("effect clear MtTgtNecro", 250);
    await command("time set day", 250);
    await command("fill 297 79 0 299 79 2 minecraft:stone", 500);
    await command("gamemode creative MtTgtNecroR", 250);
    await command("gamemode creative MtTgtNecro", 250);
    await command("tp MtTgtNecroR 298 80 0 0 0", 500);
    await command("tp MtTgtNecro 298 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Necromancer rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Necromancer target floor block");
    await command("gamemode survival MtTgtNecroR", 250);
    await command("gamemode survival MtTgtNecro", 250);
    await command("effect give MtTgtNecroR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtNecro minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtNecroR 298 80 0 0 0", 500);
    await command("tp MtTgtNecro 298 80 2 180 0", 500);
    await wait(250);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtNecro/i);
    assert(mounted, "rider should mount the target player before target Necromancer night-speed checks");
    await wait(500);

    await command("classes give MtTgtNecro necromancer_staff", 500);
    const staff = await waitForInventoryItem(target, (item) => item?.name === "blaze_rod", "mounted target Necromancer Staff");
    await target.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "mounted target Necromancer Staff should set class status to Necromancer");

    await command("effect clear MtTgtNecro minecraft:speed", 250);
    await command("time set day", 250);
    await wait(1500);
    assert(!(await clearEffect(ctx, "MtTgtNecro", "minecraft:speed", "Speed")), "mounted Necromancer target should not receive Speed during daytime");

    await command("time set night", 250);
    await wait(1500);
    assert(await clearEffect(ctx, "MtTgtNecro", "minecraft:speed", "Speed"), "mounted Necromancer target should receive Speed at night");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "target Necromancer night-speed checks should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("time set day", 250);
    await command("clear MtTgtNecroR", 250);
    await command("clear MtTgtNecro", 250);
    await command("effect clear MtTgtNecroR", 250);
    await command("effect clear MtTgtNecro", 250);
    await command("fill 297 79 0 299 79 2 minecraft:air", 500);
    await command("forceload remove 297 0 299 2", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
