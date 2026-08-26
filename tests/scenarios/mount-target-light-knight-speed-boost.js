import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Light Knight applies speed boost";

const RIDER_FLOOR = new Vec3(294, 79, 0);
const TARGET_FLOOR = new Vec3(294, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtTgtLightR", { op: false });
  const target = await spawnBot("MtTgtLight", { op: false });

  try {
    await command("forceload add 293 0 295 2", 250);
    await wait(500);
    await command("deop MtTgtLightR", 250);
    await command("deop MtTgtLight", 250);
    await command("clear MtTgtLightR", 250);
    await command("clear MtTgtLight", 250);
    await command("effect clear MtTgtLightR", 250);
    await command("effect clear MtTgtLight", 250);
    await command("attribute MtTgtLight minecraft:movement_speed base set 0.1", 250);
    await command("fill 293 79 0 295 79 2 minecraft:stone", 500);
    await command("gamemode creative MtTgtLightR", 250);
    await command("gamemode creative MtTgtLight", 250);
    await command("tp MtTgtLightR 294 80 0 0 0", 500);
    await command("tp MtTgtLight 294 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Light Knight rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Light Knight target floor block");
    await command("gamemode survival MtTgtLightR", 250);
    await command("gamemode survival MtTgtLight", 250);
    await command("effect give MtTgtLightR minecraft:slow_falling 30 1 true", 250);
    await command("effect give MtTgtLight minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MtTgtLightR 294 80 0 0 0", 500);
    await command("tp MtTgtLight 294 80 2 180 0", 500);
    await wait(250);

    const defaultSpeed = await movementSpeed(ctx, "MtTgtLight");
    assert(Math.abs(defaultSpeed - 0.1) < 0.0001, `mounted target default speed should start at 0.1, got ${defaultSpeed}`);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtTgtLight/i);
    assert(mounted, "rider should mount the target player before target Light Knight selection");
    await wait(500);

    await command("classes give MtTgtLight light_chain", 500);
    const chain = await waitForInventoryItem(target, (item) => item?.name === "chainmail_chestplate", "mounted target Light Knight Chain");
    await target.equip(chain, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Light Knight/);
    assert(status, "mounted target Light Knight Chain should set class status to Light Knight");

    const lightSpeed = await movementSpeed(ctx, "MtTgtLight");
    assert(lightSpeed > defaultSpeed, `mounted target Light Knight should increase movement speed; default=${defaultSpeed}, light=${lightSpeed}`);

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "target Light Knight speed selection should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MtTgtLightR", 250);
    await command("clear MtTgtLight", 250);
    await command("effect clear MtTgtLightR", 250);
    await command("effect clear MtTgtLight", 250);
    await command("attribute MtTgtLight minecraft:movement_speed base set 0.1", 250);
    await command("fill 293 79 0 295 79 2 minecraft:air", 500);
    await command("forceload remove 293 0 295 2", 250);
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
