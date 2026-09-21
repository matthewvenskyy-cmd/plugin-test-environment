import { Vec3 } from "vec3";
import {
  giveClassItem,
  queryPlayerHealth,
  serverPlayerIsPassengerOf,
  waitForBlock,
  waitForChat,
  waitForInventoryItem,
  waitForPlayerPassengerState
} from "./helpers.js";

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
    await waitForPlayerPassengerState(
      ctx,
      "MntFoodMage",
      "MntFoodSeat",
      true,
      "mounted rider Basic Mage attachment"
    );

    await giveClassItem(ctx, "MntFoodMage", "basic_mage_staff", "mounted rider Basic Mage Staff give");
    await command("give MntFoodMage minecraft:apple", 500);
    const staff = await waitForInventoryItem(rider, (item) => item?.name === "blaze_rod", "mounted rider Basic Mage Staff");
    await rider.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Basic Mage/);
    assert(status, "mounted rider Basic Mage Staff should set class status before ally healing");

    const apple = await waitForInventoryItem(rider, (item) => item?.name === "apple", "mounted rider healing apple");
    await rider.equip(apple, "hand");
    await command("data merge entity MntFoodAlly {Health:20.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
    assert(
      await serverPlayerIsPassengerOf(ctx, "MntFoodMage", "MntFoodSeat"),
      "Basic Mage class selection should leave the rider mounted"
    );
    await rider.lookAt(ally.entity.position.offset(0, 1.2, 0), true);

    const before = await queryPlayerHealth(ctx, "MntFoodAlly");
    const healed = await waitForChat(rider, () => {
      rider.activateEntityAt(ally.entity, ally.entity.position.offset(0, 1.2, 0)).catch(() => {});
    }, /Shared food healing empowered an ally/i);
    assert(healed, "mounted rider right-clicking an ally with food should emit the shared healing message");
    await wait(750);

    const after = await queryPlayerHealth(ctx, "MntFoodAlly");
    assert(after > before + 5.0, `mounted rider shared food healing should restore about 6 health; before=${before}, after=${after}`);
    assert(
      await serverPlayerIsPassengerOf(ctx, "MntFoodMage", "MntFoodSeat"),
      "mounted rider ally healing should preserve the mount relationship"
    );

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "Basic Mage rider should dismount cleanly after ally healing");
    await waitForPlayerPassengerState(
      ctx,
      "MntFoodMage",
      "MntFoodSeat",
      false,
      "mounted rider Basic Mage detachment"
    );
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
