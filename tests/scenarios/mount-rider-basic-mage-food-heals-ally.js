import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Basic Mage food heals ally";

const RIDER_FLOOR = new Vec3(392, 79, 0);
const SEAT_FLOOR = new Vec3(392, 79, 2);
const ALLY_FLOOR = new Vec3(393, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntFoodMage", { op: false });
  const seat = await spawnBot("MntFoodSeat", { op: false });
  const ally = await spawnBot("MntFoodAlly", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 391 0 394 2", 250);
    await wait(500);
    await command("deop MntFoodMage", 250);
    await command("deop MntFoodSeat", 250);
    await command("deop MntFoodAlly", 250);
    await command("clear MntFoodMage", 250);
    await command("clear MntFoodSeat", 250);
    await command("clear MntFoodAlly", 250);
    await command("effect clear MntFoodMage", 250);
    await command("effect clear MntFoodSeat", 250);
    await command("effect clear MntFoodAlly", 250);
    await command("fill 391 79 0 394 79 2 minecraft:stone", 500);
    await command("gamemode creative MntFoodMage", 250);
    await command("gamemode creative MntFoodSeat", 250);
    await command("gamemode creative MntFoodAlly", 250);
    await command("tp MntFoodMage 392 80 0 0 0", 500);
    await command("tp MntFoodSeat 392 80 2 180 0", 500);
    await command("tp MntFoodAlly 393 80 0 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Basic Mage food rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted Basic Mage food seat floor block");
    await waitForBlock(ally, ALLY_FLOOR, "stone", "mounted Basic Mage food ally floor block");
    await command("gamemode survival MntFoodMage", 250);
    await command("gamemode survival MntFoodSeat", 250);
    await command("gamemode survival MntFoodAlly", 250);
    await command("attribute MntFoodAlly minecraft:max_health base set 40", 250);
    await command("data merge entity MntFoodAlly {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();
    await ally.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntFoodSeat/i);
    assert(mounted, "Basic Mage rider should mount the target before ally-healing checks");
    await wait(500);

    const giveOutput = await command("classes give MntFoodMage basic_mage_staff", 500);
    assert(!/Unknown player or item|Usage:/i.test(giveOutput), `mounted rider Basic Mage Staff give command failed: ${giveOutput}`);
    await command("give MntFoodMage minecraft:apple", 500);
    const staff = await waitForInventoryItem(rider, (item) => item?.name === "blaze_rod", "mounted rider Basic Mage Staff");
    await rider.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Basic Mage/);
    assert(status, "mounted rider Basic Mage Staff should set class status before ally healing");

    const apple = await waitForInventoryItem(rider, (item) => item?.name === "apple", "mounted rider healing apple");
    await rider.equip(apple, "hand");
    await command("data merge entity MntFoodAlly {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await command("tp MntFoodMage 392 80 0 0 0", 250);
    await command("tp MntFoodSeat 392 80 2 180 0", 250);
    await command("tp MntFoodAlly 393 80 0 -90 0", 250);
    await wait(750);
    await rider.lookAt(ally.entity.position.offset(0, 1.2, 0), true);

    const before = await health(ctx, "MntFoodAlly");
    const healed = await waitForChat(rider, () => {
      rider.activateEntityAt(ally.entity, ally.entity.position.offset(0, 1.2, 0)).catch(() => {});
    }, /Shared food healing empowered an ally/i);
    assert(healed, "mounted rider right-clicking an ally with food should emit the shared healing message");
    await wait(750);

    const after = await health(ctx, "MntFoodAlly");
    assert(after > before + 5.0, `mounted rider shared food healing should restore about 6 health; before=${before}, after=${after}`);

    rider.chat("/unmount");
    await wait(500);
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MntFoodMage", 250);
    await command("clear MntFoodSeat", 250);
    await command("clear MntFoodAlly", 250);
    await command("effect clear MntFoodMage", 250);
    await command("effect clear MntFoodSeat", 250);
    await command("effect clear MntFoodAlly", 250);
    await command("attribute MntFoodAlly minecraft:max_health base set 20", 250);
    await command("fill 391 79 0 394 79 2 minecraft:air", 500);
    await command("forceload remove 391 0 394 2", 250);
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
