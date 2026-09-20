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

export const name = "Mounted target Rocketlytra sprint keeps charges";

const RIDER_FLOOR = new Vec3(444, 79, 0);
const TARGET_FLOOR = new Vec3(444, 79, 2);
const CHEST_EQUIPMENT_SLOT = 6;

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtRocketRide", { op: false });
  const target = await spawnBot("MtRocketTarget", { op: false });

  try {
    await command("forceload add 443 0 445 2", 250);
    await command("deop MtRocketRide", 250);
    await command("deop MtRocketTarget", 250);
    await command("clear MtRocketRide", 250);
    await command("clear MtRocketTarget", 250);
    await command("fill 443 79 0 445 79 2 minecraft:stone", 500);
    await command("gamemode creative MtRocketRide", 250);
    await command("gamemode creative MtRocketTarget", 250);
    await command("tp MtRocketRide 444 80 0 0 0", 500);
    await command("tp MtRocketTarget 444 80 2 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "Rocketlytra mount rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Rocketlytra target floor block");
    await command("gamemode survival MtRocketRide", 250);
    await command("gamemode survival MtRocketTarget", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();

    assert(
      await serverRecipeExists(ctx, "MtRocketTarget", "fireworkselytraplugin:rocketlytra_3"),
      "mounted target Rocketlytra recipe should be registered"
    );
    await command("give MtRocketTarget minecraft:elytra 1", 500);
    await command("give MtRocketTarget minecraft:firework_rocket 3", 500);
    await waitForInventoryItem(target, (item) => item?.name === "elytra", "mounted target elytra");
    await waitForInventoryItem(target, (item) => item?.name === "firework_rocket" && item.count >= 3, "mounted target firework rockets");

    await target.craft(rocketlytraRecipe(target, 3), 1, null);
    const rocketlytra = await waitForInventoryItem(target, isRocketlytraWithCharges(3), "mounted target Rocketlytra with 3 charges");
    await target.equip(rocketlytra, "torso");
    await waitForWindowSlot(target.inventory, CHEST_EQUIPMENT_SLOT, isRocketlytraWithCharges(3), "equipped mounted target Rocketlytra");

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtRocketTarget/i);
    assert(mounted, "rider should mount the Rocketlytra-wearing target");
    await waitForVehicle(rider, "MtRocketTarget", "Rocketlytra target mount state");
    await waitForPlayerPassengerState(ctx, "MtRocketRide", "MtRocketTarget", true, "Rocketlytra target to gain its rider");

    target.setControlState("sprint", true);
    await wait(750);
    target.setControlState("sprint", false);
    await wait(1500);

    assert(rider.vehicle?.username === "MtRocketTarget", "Rocketlytra target sprinting should not dismount the rider");
    const equippedRocketlytra = await waitForWindowSlot(
      target.inventory,
      CHEST_EQUIPMENT_SLOT,
      isRocketlytraWithCharges(3),
      "mounted target Rocketlytra retaining 3 charges"
    );
    assert(equippedRocketlytra.name === "elytra", `mounted target Rocketlytra should remain equipped, got ${displayText(equippedRocketlytra)}`);
    assert(countItemsByName(target, "firework_rocket") === 0, "crafting should consume the mounted target's three firework rockets");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "rider should dismount the Rocketlytra-wearing target cleanly");
    await waitForPlayerPassengerState(ctx, "MtRocketRide", "MtRocketTarget", false, "Rocketlytra target to release its rider");
    await waitForWindowSlot(
      target.inventory,
      CHEST_EQUIPMENT_SLOT,
      isRocketlytraWithCharges(3),
      "dismounted target Rocketlytra retaining 3 charges"
    );
  } finally {
    target.setControlState("sprint", false);
    rider.chat("/unmount");
    await wait(500);
    await command("clear MtRocketRide", 250);
    await command("clear MtRocketTarget", 250);
    await command("fill 443 79 0 445 79 2 minecraft:air", 500);
    await command("forceload remove 443 0 445 2", 250);
  }
}
