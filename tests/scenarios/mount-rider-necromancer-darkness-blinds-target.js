import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Necromancer darkness blinds target";

const RIDER_FLOOR = new Vec3(384, 79, 0);
const SEAT_FLOOR = new Vec3(384, 79, 2);
const VICTIM_FLOOR = new Vec3(384, 79, 4);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntNecroDark", { op: false });
  const seat = await spawnBot("MntNecroSeat", { op: false });
  const victim = await spawnBot("MntNecroBlind", { op: false });

  try {
    await command("forceload add 383 0 385 4", 250);
    await wait(500);
    await command("deop MntNecroDark", 250);
    await command("deop MntNecroSeat", 250);
    await command("deop MntNecroBlind", 250);
    await command("clear MntNecroDark", 250);
    await command("clear MntNecroSeat", 250);
    await command("clear MntNecroBlind", 250);
    await command("effect clear MntNecroDark", 250);
    await command("effect clear MntNecroSeat", 250);
    await command("effect clear MntNecroBlind", 250);
    await command("fill 383 79 0 385 79 4 minecraft:stone", 500);
    await command("gamemode creative MntNecroDark", 250);
    await command("gamemode creative MntNecroSeat", 250);
    await command("gamemode creative MntNecroBlind", 250);
    await command("tp MntNecroDark 384 80 0 0 0", 500);
    await command("tp MntNecroSeat 384 80 2 180 0", 500);
    await command("tp MntNecroBlind 384 80 4 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Necromancer darkness rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted Necromancer darkness seat floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted Necromancer darkness victim floor block");
    await command("gamemode survival MntNecroDark", 250);
    await command("gamemode survival MntNecroSeat", 250);
    await command("gamemode survival MntNecroBlind", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntNecroSeat/i);
    assert(mounted, "Necromancer darkness rider should mount the target before casting");
    await wait(500);

    await command("classes give MntNecroDark necromancer_staff", 500);
    const staff = await waitForInventoryItem(rider, (item) => item?.name === "blaze_rod", "mounted rider Necromancer Staff");
    await rider.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "mounted rider Necromancer Staff should set class status before casting darkness");

    await command("effect clear MntNecroBlind minecraft:blindness", 250);
    await command("tp MntNecroDark 384 80 0 0 0", 250);
    await command("tp MntNecroSeat 384 80 2 180 0", 250);
    await command("tp MntNecroBlind 384 80 4 180 0", 250);
    await wait(750);

    await rider.lookAt(victim.entity.position.offset(0, 1.5, 0), true);
    rider.activateItem();
    await wait(1000);

    assert(await clearEffect(ctx, "MntNecroBlind", "minecraft:blindness", "Blindness"), "mounted Necromancer rider darkness should apply Blindness to the targeted player");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "mounted Necromancer darkness checks should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MntNecroDark", 250);
    await command("clear MntNecroSeat", 250);
    await command("clear MntNecroBlind", 250);
    await command("effect clear MntNecroDark", 250);
    await command("effect clear MntNecroSeat", 250);
    await command("effect clear MntNecroBlind", 250);
    await command("fill 383 79 0 385 79 4 minecraft:air", 500);
    await command("forceload remove 383 0 385 4", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  const output = await ctx.command(`effect clear ${playerName} ${effectId}`, 500);
  return new RegExp(`Removed effect ${effectLabel}`, "i").test(output);
}
