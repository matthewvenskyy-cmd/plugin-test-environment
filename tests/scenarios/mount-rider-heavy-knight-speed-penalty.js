import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Heavy Knight applies speed penalty";

const RIDER_FLOOR = new Vec3(288, 79, 0);
const TARGET_FLOOR = new Vec3(288, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntHeavyRider", { op: false });
  const target = await spawnBot("MntHeavySeat", { op: false });

  try {
    await command("forceload add 287 0 289 2", 250);
    await wait(500);
    await command("deop MntHeavyRider", 250);
    await command("deop MntHeavySeat", 250);
    await command("clear MntHeavyRider", 250);
    await command("clear MntHeavySeat", 250);
    await command("effect clear MntHeavyRider", 250);
    await command("effect clear MntHeavySeat", 250);
    await command("attribute MntHeavyRider minecraft:movement_speed base set 0.1", 250);
    await command("fill 287 79 0 289 79 2 minecraft:stone", 500);
    await command("gamemode creative MntHeavyRider", 250);
    await command("gamemode creative MntHeavySeat", 250);
    await command("tp MntHeavyRider 288 80 0 0 0", 500);
    await command("tp MntHeavySeat 288 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Heavy Knight rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Heavy Knight target floor block");
    await command("gamemode survival MntHeavyRider", 250);
    await command("gamemode survival MntHeavySeat", 250);
    await command("effect give MntHeavyRider minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntHeavySeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MntHeavyRider 288 80 0 0 0", 500);
    await command("tp MntHeavySeat 288 80 2 180 0", 500);
    await wait(250);

    const defaultSpeed = await movementSpeed(ctx, "MntHeavyRider");
    assert(Math.abs(defaultSpeed - 0.1) < 0.0001, `mounted rider default speed should start at 0.1, got ${defaultSpeed}`);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntHeavySeat/i);
    assert(mounted, "rider should mount the target player before Heavy Knight selection");
    await wait(500);

    await command("classes give MntHeavyRider heavy_plate", 500);
    const plate = await waitForInventoryItem(rider, (item) => item?.name === "iron_chestplate", "mounted rider Heavy Knight Plate");
    await rider.equip(plate, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Heavy Knight/);
    assert(status, "mounted rider Heavy Knight Plate should set class status to Heavy Knight");

    const heavySpeed = await movementSpeed(ctx, "MntHeavyRider");
    assert(heavySpeed < defaultSpeed, `mounted Heavy Knight should reduce movement speed; default=${defaultSpeed}, heavy=${heavySpeed}`);

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "mounted Heavy Knight speed selection should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MntHeavyRider", 250);
    await command("clear MntHeavySeat", 250);
    await command("effect clear MntHeavyRider", 250);
    await command("effect clear MntHeavySeat", 250);
    await command("attribute MntHeavyRider minecraft:movement_speed base set 0.1", 250);
    await command("fill 287 79 0 289 79 2 minecraft:air", 500);
    await command("forceload remove 287 0 289 2", 250);
  }
}

async function movementSpeed(ctx, playerName) {
  const output = await ctx.command(`attribute ${playerName} minecraft:movement_speed get`, 500);
  const match = output.match(/(?:has the following attribute value:|is) ([\d.]+)/);
  if (!match) {
    throw new Error(`Could not parse movement speed from command output: ${output}`);
  }
  return Number(match[1]);
}
