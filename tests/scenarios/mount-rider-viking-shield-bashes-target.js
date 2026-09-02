import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Viking shield bashes target";

const RIDER_FLOOR = new Vec3(372, 79, 0);
const SEAT_FLOOR = new Vec3(372, 79, 2);
const VICTIM_FLOOR = new Vec3(373, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntShieldVik", { op: false });
  const seat = await spawnBot("MntShieldSeat", { op: false });
  const victim = await spawnBot("MntShieldVictim", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 371 0 374 2", 250);
    await wait(500);
    await command("deop MntShieldVik", 250);
    await command("deop MntShieldSeat", 250);
    await command("deop MntShieldVictim", 250);
    await command("clear MntShieldVik", 250);
    await command("clear MntShieldSeat", 250);
    await command("clear MntShieldVictim", 250);
    await command("effect clear MntShieldVik", 250);
    await command("effect clear MntShieldSeat", 250);
    await command("effect clear MntShieldVictim", 250);
    await command("fill 371 79 0 374 79 2 minecraft:stone", 500);
    await command("gamemode creative MntShieldVik", 250);
    await command("gamemode creative MntShieldSeat", 250);
    await command("gamemode creative MntShieldVictim", 250);
    await command("tp MntShieldVik 372 80 0 0 0", 500);
    await command("tp MntShieldSeat 372 80 2 180 0", 500);
    await command("tp MntShieldVictim 373 80 0 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Viking shield rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted Viking shield seat floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted Viking shield victim floor block");
    await command("gamemode survival MntShieldVik", 250);
    await command("gamemode survival MntShieldSeat", 250);
    await command("gamemode survival MntShieldVictim", 250);
    await command("classes give MntShieldVik viking_shield", 500);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntShieldSeat/i);
    assert(mounted, "Viking shield rider should mount before shield bash check");
    await wait(500);

    const shield = await waitForInventoryItem(rider, (item) => item?.name === "shield", "mounted rider Viking Shield class item");
    await rider.equip(shield, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Viking/);
    assert(status, "mounted rider Viking Shield should set class status before shield bash");

    await command("attribute MntShieldVictim minecraft:max_health base set 20", 250);
    await command("data merge entity MntShieldVictim {Health:20.0f,HurtTime:0s,Invulnerable:0b}", 250);
    await command("tp MntShieldVik 372 80 0 0 0", 250);
    await command("tp MntShieldSeat 372 80 2 180 0", 250);
    await command("tp MntShieldVictim 373 80 0 -90 0", 250);
    await wait(750);

    const before = await health(ctx, "MntShieldVictim");
    await rider.lookAt(victim.entity.position.offset(0, 1.4, 0), true);
    rider.activateItem();
    await wait(1500);
    rider.deactivateItem();

    const after = await health(ctx, "MntShieldVictim");
    const damage = before - after;
    assert(damage >= 2.5, `mounted Viking rider shield bash should damage the nearby target; before=${before}, after=${after}, damage=${damage}`);
  } finally {
    rider.chat("/unmount");
    await wait(500);
    rider.chat("/classes reset");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MntShieldVik", 250);
    await command("clear MntShieldSeat", 250);
    await command("clear MntShieldVictim", 250);
    await command("effect clear MntShieldVik", 250);
    await command("effect clear MntShieldSeat", 250);
    await command("effect clear MntShieldVictim", 250);
    await command("attribute MntShieldVictim minecraft:max_health base set 20", 250);
    await command("fill 371 79 0 374 79 2 minecraft:air", 500);
    await command("forceload remove 371 0 374 2", 250);
  }
}

async function health(ctx, playerName) {
  const output = await ctx.command(`data get entity ${playerName} Health`, 500);
  const cleanOutput = stripAnsi(output);
  const match = cleanOutput.match(/Health:?\s*([\d.]+)f?/i) || cleanOutput.match(/entity data:\s*([\d.]+)f?/i);
  if (!match) {
    throw new Error(`Could not parse ${playerName} health from command output: ${output}`);
  }
  return Number(match[1]);
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}
