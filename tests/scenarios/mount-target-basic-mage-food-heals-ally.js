import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Basic Mage food heals ally";

const RIDER_FLOOR = new Vec3(396, 79, 0);
const TARGET_FLOOR = new Vec3(396, 79, 2);
const ALLY_FLOOR = new Vec3(397, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtFoodRide", { op: false });
  const target = await spawnBot("MtFoodMage", { op: false });
  const ally = await spawnBot("MtFoodAlly", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 395 0 398 2", 250);
    await wait(500);
    await command("deop MtFoodRide", 250);
    await command("deop MtFoodMage", 250);
    await command("deop MtFoodAlly", 250);
    await command("clear MtFoodRide", 250);
    await command("clear MtFoodMage", 250);
    await command("clear MtFoodAlly", 250);
    await command("effect clear MtFoodRide", 250);
    await command("effect clear MtFoodMage", 250);
    await command("effect clear MtFoodAlly", 250);
    await command("fill 395 79 0 398 79 2 minecraft:stone", 500);
    await command("gamemode creative MtFoodRide", 250);
    await command("gamemode creative MtFoodMage", 250);
    await command("gamemode creative MtFoodAlly", 250);
    await command("tp MtFoodRide 396 80 0 0 0", 500);
    await command("tp MtFoodMage 396 80 2 180 0", 500);
    await command("tp MtFoodAlly 397 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target Basic Mage food rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target Basic Mage food floor block");
    await waitForBlock(ally, ALLY_FLOOR, "stone", "mounted target Basic Mage food ally floor block");
    await command("gamemode survival MtFoodRide", 250);
    await command("gamemode survival MtFoodMage", 250);
    await command("gamemode survival MtFoodAlly", 250);
    await command("attribute MtFoodAlly minecraft:max_health base set 40", 250);
    await command("data merge entity MtFoodAlly {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await ally.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtFoodMage/i);
    assert(mounted, "rider should mount the Basic Mage target before ally-healing checks");
    await wait(500);

    const giveOutput = await command("classes give MtFoodMage basic_mage_staff", 500);
    assert(!/Unknown player or item|Usage:/i.test(giveOutput), `mounted target Basic Mage Staff give command failed: ${giveOutput}`);
    await command("give MtFoodMage minecraft:apple", 500);
    const staff = await waitForInventoryItem(target, (item) => item?.name === "blaze_rod", "mounted target Basic Mage Staff");
    await target.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Basic Mage/);
    assert(status, "mounted target Basic Mage Staff should set class status before ally healing");

    const apple = await waitForInventoryItem(target, (item) => item?.name === "apple", "mounted target healing apple");
    await target.equip(apple, "hand");
    await command("data merge entity MtFoodAlly {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    await command("tp MtFoodRide 396 80 0 0 0", 250);
    await command("tp MtFoodMage 396 80 2 180 0", 250);
    await command("tp MtFoodAlly 397 80 2 -90 0", 250);
    await wait(750);
    await target.lookAt(ally.entity.position.offset(0, 1.2, 0), true);

    const before = await health(ctx, "MtFoodAlly");
    const healed = await waitForChat(target, () => {
      target.activateEntityAt(ally.entity, ally.entity.position.offset(0, 1.2, 0)).catch(() => {});
    }, /Shared food healing empowered an ally/i);
    assert(healed, "mounted target right-clicking an ally with food should emit the shared healing message");
    await wait(750);

    const after = await health(ctx, "MtFoodAlly");
    assert(after > before + 5.0, `mounted target shared food healing should restore about 6 health; before=${before}, after=${after}`);

    rider.chat("/unmount");
    await wait(500);
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MtFoodRide", 250);
    await command("clear MtFoodMage", 250);
    await command("clear MtFoodAlly", 250);
    await command("effect clear MtFoodRide", 250);
    await command("effect clear MtFoodMage", 250);
    await command("effect clear MtFoodAlly", 250);
    await command("attribute MtFoodAlly minecraft:max_health base set 20", 250);
    await command("fill 395 79 0 398 79 2 minecraft:air", 500);
    await command("forceload remove 395 0 398 2", 250);
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
