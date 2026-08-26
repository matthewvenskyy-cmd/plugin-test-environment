import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Heavy Knight applies speed penalty";

const RIDER_FLOOR = new Vec3(290, 79, 0);
const TARGET_FLOOR = new Vec3(290, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtHeavyR", { op: false });
  const target = await spawnBot("MtTgtHeavy", { op: false });

  try {
    await command("forceload add 289 0 291 2", 250);
    await wait(500);
    await command("deop MtTgtHeavyR", 250);
    await command("deop MtTgtHeavy", 250);
    await command("clear MtTgtHeavyR", 250);
    await command("clear MtTgtHeavy", 250);
    await command("effect clear MtTgtHeavyR", 250);
    await command("effect clear MtTgtHeavy", 250);
    await command("attribute MtTgtHeavy minecraft:movement_speed base set 0.1", 250);
    await command("fill 289 79 0 291 79 2 minecraft:stone", 500);
    await command("gamemode creative MtTgtHeavyR", 250);
    await command("gamemode creative MtTgtHeavy", 250);
    await command("tp MtTgtHeavyR 290 80 0 0 0", 500);
    await command("tp MtTgtHeavy 290 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Heavy Knight rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Heavy Knight target floor block");
    await command("gamemode survival MtTgtHeavyR", 250);
    await command("gamemode survival MtTgtHeavy", 250);
    await command("effect give MtTgtHeavyR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtHeavy minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtHeavyR 290 80 0 0 0", 500);
    await command("tp MtTgtHeavy 290 80 2 180 0", 500);
    await wait(250);

    const defaultSpeed = await movementSpeed(ctx, "MtTgtHeavy");
    assert(Math.abs(defaultSpeed - 0.1) < 0.0001, `mounted target default speed should start at 0.1, got ${defaultSpeed}`);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtHeavy/i);
    assert(mounted, "rider should mount the target player before target Heavy Knight selection");
    await wait(500);

    await command("classes give MtTgtHeavy heavy_plate", 500);
    const plate = await waitForInventoryItem(target, (item) => item?.name === "iron_chestplate", "mounted target Heavy Knight Plate");
    await target.equip(plate, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Heavy Knight/);
    assert(status, "mounted target Heavy Knight Plate should set class status to Heavy Knight");

    const heavySpeed = await movementSpeed(ctx, "MtTgtHeavy");
    assert(heavySpeed < defaultSpeed, `mounted target Heavy Knight should reduce movement speed; default=${defaultSpeed}, heavy=${heavySpeed}`);

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "target Heavy Knight speed selection should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MtTgtHeavyR", 250);
    await command("clear MtTgtHeavy", 250);
    await command("effect clear MtTgtHeavyR", 250);
    await command("effect clear MtTgtHeavy", 250);
    await command("attribute MtTgtHeavy minecraft:movement_speed base set 0.1", 250);
    await command("fill 289 79 0 291 79 2 minecraft:air", 500);
    await command("forceload remove 289 0 291 2", 250);
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
