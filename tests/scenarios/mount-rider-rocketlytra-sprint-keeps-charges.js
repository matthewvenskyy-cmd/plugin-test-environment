import { Vec3 } from "vec3";
import {
  countItemsByName,
  displayText,
  isRocketlytraWithCharges,
  rocketlytraRecipe,
  serverRecipeExists,
  waitForBlock,
  waitForChat,
  waitForInventoryItem,
  waitForPlayerPassengerState,
  waitForVehicle,
  waitForWindowSlot
} from "./helpers.js";

export const name = "Mounted rider Rocketlytra sprint keeps charges";

const RIDER_FLOOR = new Vec3(440, 79, 0);
const SEAT_FLOOR = new Vec3(440, 79, 2);
const CHEST_EQUIPMENT_SLOT = 6;

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntRocketRider", { op: false });
  const seat = await spawnBot("MntRocketSeat", { op: false });

  try {
    await command("forceload add 439 0 441 2", 250);
    await command("deop MntRocketRider", 250);
    await command("deop MntRocketSeat", 250);
    await command("clear MntRocketRider", 250);
    await command("clear MntRocketSeat", 250);
    await command("fill 439 79 0 441 79 2 minecraft:stone", 500);
    await command("gamemode creative MntRocketRider", 250);
    await command("gamemode creative MntRocketSeat", 250);
    await command("tp MntRocketRider 440 80 0 0 0", 500);
    await command("tp MntRocketSeat 440 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Rocketlytra rider floor block");
    await waitForBlock(seat, SEAT_FLOOR, "stone", "mounted Rocketlytra seat floor block");
    await command("gamemode survival MntRocketRider", 250);
    await command("gamemode survival MntRocketSeat", 250);
    await rider.waitForChunksToLoad();
    await seat.waitForChunksToLoad();

    assert(
      await serverRecipeExists(ctx, "MntRocketRider", "fireworkselytraplugin:rocketlytra_3"),
      "mounted rider Rocketlytra recipe should be registered"
    );
    await command("give MntRocketRider minecraft:elytra 1", 500);
    await command("give MntRocketRider minecraft:firework_rocket 3", 500);
    await waitForInventoryItem(rider, (item) => item?.name === "elytra", "mounted rider elytra");
    await waitForInventoryItem(rider, (item) => item?.name === "firework_rocket" && item.count >= 3, "mounted rider firework rockets");

    await rider.craft(rocketlytraRecipe(rider, 3), 1, null);
    const rocketlytra = await waitForInventoryItem(rider, isRocketlytraWithCharges(3), "mounted rider Rocketlytra with 3 charges");
    await rider.equip(rocketlytra, "torso");
    await waitForWindowSlot(rider.inventory, CHEST_EQUIPMENT_SLOT, isRocketlytraWithCharges(3), "equipped mounted rider Rocketlytra");

    await rider.lookAt(seat.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntRocketSeat/i);
    assert(mounted, "Rocketlytra wearer should mount the target");
    await waitForVehicle(rider, "MntRocketSeat", "Rocketlytra rider mount state");
    await waitForPlayerPassengerState(ctx, "MntRocketRider", "MntRocketSeat", true, "Rocketlytra seat to gain its rider");

    rider.setControlState("sprint", true);
    await wait(750);
    rider.setControlState("sprint", false);
    await wait(1500);

    assert(rider.vehicle?.username === "MntRocketSeat", "sprinting with Rocketlytra should not dismount the rider");
    const equippedRocketlytra = await waitForWindowSlot(
      rider.inventory,
      CHEST_EQUIPMENT_SLOT,
      isRocketlytraWithCharges(3),
      "mounted rider Rocketlytra retaining 3 charges"
    );
    assert(equippedRocketlytra.name === "elytra", `mounted rider Rocketlytra should remain equipped, got ${displayText(equippedRocketlytra)}`);
    assert(countItemsByName(rider, "firework_rocket") === 0, "crafting should consume the mounted rider's three firework rockets");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "Rocketlytra wearer should dismount cleanly");
    await waitForPlayerPassengerState(ctx, "MntRocketRider", "MntRocketSeat", false, "Rocketlytra seat to release its rider");
    await waitForWindowSlot(
      rider.inventory,
      CHEST_EQUIPMENT_SLOT,
      isRocketlytraWithCharges(3),
      "dismounted rider Rocketlytra retaining 3 charges"
    );
  } finally {
    rider.setControlState("sprint", false);
    rider.chat("/unmount");
    await wait(500);
    await command("clear MntRocketRider", 250);
    await command("clear MntRocketSeat", 250);
    await command("fill 439 79 0 441 79 2 minecraft:air", 500);
    await command("forceload remove 439 0 441 2", 250);
  }
}
