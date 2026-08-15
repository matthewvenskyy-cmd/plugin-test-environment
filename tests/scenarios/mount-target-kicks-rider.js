import { Vec3 } from "vec3";
import { waitForChat } from "./helpers.js";

export const name = "MountPlugin ridden player can kick rider";

const KICK_BLOCK = new Vec3(145, 80, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountKick");
  const target = await spawnBot("MountSeat");
  const nextTarget = await spawnBot("MountSeatAgain");

  try {
    await command("gamemode creative MountKick", 250);
    await command("gamemode creative MountSeat", 250);
    await command("gamemode creative MountSeatAgain", 250);
    await command("forceload add 144 0", 250);
    await command("fill 143 79 -3 147 79 3 minecraft:stone", 250);
    await command(`setblock ${KICK_BLOCK.x} ${KICK_BLOCK.y} ${KICK_BLOCK.z} minecraft:stone`, 250);
    await command("tp MountSeat 144 80 1 180 0", 500);
    await command("tp MountSeatAgain 146 80 1 180 0", 500);
    await command("tp MountKick 144 80 -2 0 0", 500);
    await command("gamemode survival MountKick", 250);
    await command("gamemode survival MountSeat", 250);
    await command("gamemode survival MountSeatAgain", 250);
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountSeat/i);
    assert(mounted, "rider should mount the target before kick attempt");

    const kickBlock = target.blockAt(KICK_BLOCK);
    assert(kickBlock?.name === "stone", "kick block should exist for sneak left-click");
    target.setControlState("sneak", true);
    const kicked = await waitForChat(rider, () => target.dig(kickBlock, true).catch(() => {}), /kicked off/i);
    assert(kicked, "rider should receive a kick message from the ridden player");
    target.setControlState("sneak", false);
    await wait(750);

    const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
    assert(notMounted, "kicking should clear the rider's active mount session");

    await command("tp MountKick 146 80 -2 0 0", 500);
    await rider.lookAt(nextTarget.entity.position.offset(0, 1.2, 0), true);
    const remounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MountSeatAgain/i);
    assert(remounted, "rider should be able to mount again after being kicked");
  } finally {
    target.setControlState("sneak", false);
    rider.chat("/unmount");
    await wait(500);
    await command("fill 143 79 -3 147 80 3 minecraft:air", 250);
    await command("forceload remove 144 0", 250);
  }
}
