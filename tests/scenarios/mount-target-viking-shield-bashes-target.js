import { Vec3 } from "vec3";
import {
  queryPlayerHealth,
  serverPlayerIsPassengerOf,
  waitForBlock,
  waitForChat,
  waitForInventoryItem,
  waitForPlayerPassengerState
} from "./helpers.js";

export const name = "Mounted target Viking shield bashes target";

const RIDER_FLOOR = new Vec3(376, 79, 0);
const TARGET_FLOOR = new Vec3(376, 79, 2);
const VICTIM_FLOOR = new Vec3(377, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtShieldRide", { op: false });
  const target = await spawnBot("MtShieldVik", { op: false });
  const victim = await spawnBot("MtShieldVictim", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 375 0 378 2", 250);
    await wait(500);
    await command("deop MtShieldRide", 250);
    await command("deop MtShieldVik", 250);
    await command("deop MtShieldVictim", 250);
    await command("clear MtShieldRide", 250);
    await command("clear MtShieldVik", 250);
    await command("clear MtShieldVictim", 250);
    await command("effect clear MtShieldRide", 250);
    await command("effect clear MtShieldVik", 250);
    await command("effect clear MtShieldVictim", 250);
    await command("fill 375 79 0 378 79 2 minecraft:stone", 500);
    await command("gamemode creative MtShieldRide", 250);
    await command("gamemode creative MtShieldVik", 250);
    await command("gamemode creative MtShieldVictim", 250);
    await command("tp MtShieldRide 376 80 0 0 0", 500);
    await command("tp MtShieldVik 376 80 2 180 0", 500);
    await command("tp MtShieldVictim 377 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted target Viking shield rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted target Viking shield floor block");
    await waitForBlock(victim, VICTIM_FLOOR, "stone", "mounted target Viking shield victim floor block");
    await command("gamemode survival MtShieldRide", 250);
    await command("gamemode survival MtShieldVik", 250);
    await command("gamemode survival MtShieldVictim", 250);
    await command("classes give MtShieldVik viking_shield", 500);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await victim.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtShieldVik/i);
    assert(mounted, "rider should mount the Viking target before shield bash check");
    await waitForPlayerPassengerState(
      ctx,
      "MtShieldRide",
      "MtShieldVik",
      true,
      "mounted target Viking shield attachment"
    );

    const shield = await waitForInventoryItem(target, (item) => item?.name === "shield", "mounted target Viking Shield class item");
    await target.equip(shield, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Viking/);
    assert(status, "mounted target Viking Shield should set class status before shield bash");

    await command("attribute MtShieldVictim minecraft:max_health base set 20", 250);
    await command("data merge entity MtShieldVictim {Health:20.0f,HurtTime:0s,Invulnerable:0b}", 250);
    assert(
      await serverPlayerIsPassengerOf(ctx, "MtShieldRide", "MtShieldVik"),
      "target Viking class selection should leave the rider attached"
    );

    const before = await queryPlayerHealth(ctx, "MtShieldVictim");
    await target.lookAt(victim.entity.position.offset(0, 1.4, 0), true);
    target.activateItem();
    await wait(1500);
    target.deactivateItem();
    assert(
      await serverPlayerIsPassengerOf(ctx, "MtShieldRide", "MtShieldVik"),
      "target shield activation should leave the rider attached"
    );

    const after = await queryPlayerHealth(ctx, "MtShieldVictim");
    const damage = before - after;
    assert(damage >= 2.5, `mounted Viking target shield bash should damage the nearby target; before=${before}, after=${after}, damage=${damage}`);

    const unmounted = await waitForChat(rider, () => rider.chat("/unmount"), /dismounted/i);
    assert(unmounted, "rider should dismount cleanly after target Viking shield bash");
    await waitForPlayerPassengerState(
      ctx,
      "MtShieldRide",
      "MtShieldVik",
      false,
      "mounted target Viking shield detachment"
    );
  } finally {
    rider.chat("/unmount");
    await wait(500);
    target.chat("/classes reset");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MtShieldRide", 250);
    await command("clear MtShieldVik", 250);
    await command("clear MtShieldVictim", 250);
    await command("effect clear MtShieldRide", 250);
    await command("effect clear MtShieldVik", 250);
    await command("effect clear MtShieldVictim", 250);
    await command("attribute MtShieldVictim minecraft:max_health base set 20", 250);
    await command("fill 375 79 0 378 79 2 minecraft:air", 500);
    await command("forceload remove 375 0 378 2", 250);
  }
}
