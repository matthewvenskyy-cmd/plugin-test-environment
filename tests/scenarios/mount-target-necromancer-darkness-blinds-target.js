import { Vec3 } from "vec3";
import {
  serverCommandSucceeds,
  serverPlayerIsPassengerOf,
  waitForBlock,
  waitForChat,
  waitForInventoryItem,
  waitForPlayerPassengerState
} from "./helpers.js";

export const name = "Mounted target Necromancer darkness blinds target";

const RIDER_FLOOR = new Vec3(388, 79, 0);
const TARGET_FLOOR = new Vec3(388, 79, 2);
const VICTIM_FLOOR = new Vec3(388, 79, 4);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtDarkRide", { op: false });
  const target = await spawnBot("MtDarkNecro", { op: false });
  const victim = await spawnBot("MtDarkBlind", { op: false });

  try {
    await command("forceload add 387 0 389 4", 250);
    await wait(500);
    await command("deop MtDarkRide", 250);
    await command("deop MtDarkNecro", 250);
    await command("deop MtDarkBlind", 250);
    await command("clear MtDarkRide", 250);
    await command("clear MtDarkNecro", 250);
    await command("clear MtDarkBlind", 250);
    await command("effect clear MtDarkRide", 250);
    await command("effect clear MtDarkNecro", 250);
    await command("effect clear MtDarkBlind", 250);
    await command("fill 387 79 0 389 79 4 minecraft:stone", 500);
    await command("gamemode creative MtDarkRide", 250);
    await command("gamemode creative MtDarkNecro", 250);
    await command("gamemode creative MtDarkBlind", 250);
    await command("tp MtDarkRide 388 80 0 0 0", 500);
    await command("tp MtDarkNecro 388 80 2 180 0", 500);
    await command("tp MtDarkBlind 388 80 4 180 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target Necromancer darkness rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target Necromancer darkness floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted target Necromancer darkness victim floor block");
    await command("gamemode survival MtDarkRide", 250);
    await command("gamemode survival MtDarkNecro", 250);
    await command("gamemode survival MtDarkBlind", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtDarkNecro/i);
    assert(mounted, "rider should mount the Necromancer target before casting");
    await waitForPlayerPassengerState(
      ctx,
      "MtDarkRide",
      "MtDarkNecro",
      true,
      "mounted target Necromancer darkness attachment"
    );

    await command("classes give MtDarkNecro necromancer_staff", 500);
    const staff = await waitForInventoryItem(target, (item) => item?.name === "blaze_rod", "mounted target Necromancer Staff");
    await target.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "mounted target Necromancer Staff should set class status before casting darkness");

    await command("effect clear MtDarkBlind minecraft:blindness", 250);
    assert(
      await serverPlayerIsPassengerOf(ctx, "MtDarkRide", "MtDarkNecro"),
      "target Necromancer class selection should leave the rider attached"
    );

    await target.lookAt(victim.entity.position.offset(0, 1.5, 0), true);
    target.activateItem();
    await wait(1000);
    assert(
      await serverPlayerIsPassengerOf(ctx, "MtDarkRide", "MtDarkNecro"),
      "target darkness staff activation should leave the rider attached"
    );

    assert(await clearEffect(ctx, "MtDarkBlind", "minecraft:blindness", "Blindness"), "mounted Necromancer target darkness should apply Blindness to the targeted player");

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "mounted target Necromancer darkness checks should leave the mount session cleanly unmountable");
    await waitForPlayerPassengerState(
      ctx,
      "MtDarkRide",
      "MtDarkNecro",
      false,
      "mounted target Necromancer darkness detachment"
    );
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("clear MtDarkRide", 250);
    await command("clear MtDarkNecro", 250);
    await command("clear MtDarkBlind", 250);
    await command("effect clear MtDarkRide", 250);
    await command("effect clear MtDarkNecro", 250);
    await command("effect clear MtDarkBlind", 250);
    await command("fill 387 79 0 389 79 4 minecraft:air", 500);
    await command("forceload remove 387 0 389 4", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  return serverCommandSucceeds(ctx, `effect clear ${playerName} ${effectId}`, { holder: "effect_clear", label: `clear ${effectLabel}` });
}
