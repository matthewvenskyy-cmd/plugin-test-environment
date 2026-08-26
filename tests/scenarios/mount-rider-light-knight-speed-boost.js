import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Light Knight applies speed boost";

const RIDER_FLOOR = new Vec3(292, 79, 0);
const TARGET_FLOOR = new Vec3(292, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntLightRider", { op: false });
  const target = await spawnBot("MntLightSeat", { op: false });

  try {
    await command("forceload add 291 0 293 2", 250);
    await wait(500);
    await command("deop MntLightRider", 250);
    await command("deop MntLightSeat", 250);
    await command("clear MntLightRider", 250);
    await command("clear MntLightSeat", 250);
    await command("effect clear MntLightRider", 250);
    await command("effect clear MntLightSeat", 250);
    await command("attribute MntLightRider minecraft:movement_speed base set 0.1", 250);
    await command("fill 291 79 0 293 79 2 minecraft:stone", 500);
    await command("gamemode creative MntLightRider", 250);
    await command("gamemode creative MntLightSeat", 250);
    await command("tp MntLightRider 292 80 0 0 0", 500);
    await command("tp MntLightSeat 292 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Light Knight rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Light Knight target floor block");
    await command("gamemode survival MntLightRider", 250);
    await command("gamemode survival MntLightSeat", 250);
    await command("effect give MntLightRider minecraft:slow_falling 30 1 true", 250);
    await command("effect give MntLightSeat minecraft:slow_falling 30 1 true", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await command("tp MntLightRider 292 80 0 0 0", 500);
    await command("tp MntLightSeat 292 80 2 180 0", 500);
    await wait(250);

    const defaultSpeed = await movementSpeed(ctx, "MntLightRider");
    assert(Math.abs(defaultSpeed - 0.1) < 0.0001, `mounted rider default speed should start at 0.1, got ${defaultSpeed}`);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntLightSeat/i);
    assert(mounted, "rider should mount the target player before Light Knight selection");
    await wait(500);

    await command("classes give MntLightRider light_chain", 500);
    const chain = await waitForInventoryItem(rider, (item) => item?.name === "chainmail_chestplate", "mounted rider Light Knight Chain");
    await rider.equip(chain, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Light Knight/);
    assert(status, "mounted rider Light Knight Chain should set class status to Light Knight");

    const lightSpeed = await movementSpeed(ctx, "MntLightRider");
    assert(lightSpeed > defaultSpeed, `mounted Light Knight should increase movement speed; default=${defaultSpeed}, light=${lightSpeed}`);

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "mounted Light Knight speed selection should leave the mount session cleanly unmountable");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MntLightRider", 250);
    await command("clear MntLightSeat", 250);
    await command("effect clear MntLightRider", 250);
    await command("effect clear MntLightSeat", 250);
    await command("attribute MntLightRider minecraft:movement_speed base set 0.1", 250);
    await command("fill 291 79 0 293 79 2 minecraft:air", 500);
    await command("forceload remove 291 0 293 2", 250);
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
