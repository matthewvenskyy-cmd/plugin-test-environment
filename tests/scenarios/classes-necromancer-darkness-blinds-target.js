import { Vec3 } from "vec3";
import { serverCommandSucceeds, waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Necromancer darkness blinds target";

const CASTER_FLOOR = new Vec3(97, 79, -1);
const TARGET_FLOOR = new Vec3(97, 79, 1);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const necromancer = await spawnBot("DarknessCaster");
  const target = await spawnBot("DarknessTarget");

  try {
    await command("forceload add 96 -1 98 1", 250);
    await wait(500);
    await command("clear DarknessCaster", 250);
    await command("clear DarknessTarget", 250);
    await command("effect clear DarknessCaster", 250);
    await command("effect clear DarknessTarget", 250);
    await command("fill 96 79 -1 98 79 1 minecraft:stone", 250);
    await command("gamemode survival DarknessCaster", 250);
    await command("gamemode survival DarknessTarget", 250);
    await command("tp DarknessCaster 97 80 -1 0 0", 500);
    await command("tp DarknessTarget 97 80 1 180 0", 500);
    await necromancer.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await waitForBlock(necromancer, CASTER_FLOOR, "stone", "Necromancer darkness caster floor");
    await waitForBlock(target, TARGET_FLOOR, "stone", "Necromancer darkness target floor");
    const giveOutput = await command("classes give DarknessCaster necromancer_staff", 500);
    assert(!/Unknown player or item|Usage:/i.test(giveOutput), `Necromancer Staff give command failed: ${giveOutput}`);
    await wait(1000);

    const staff = await waitForInventoryItem(necromancer, (item) => item?.name === "blaze_rod", "Necromancer Staff class item");
    await necromancer.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(necromancer, () => necromancer.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "Necromancer Staff should set class status before casting darkness");

    await necromancer.lookAt(necromancer.entity.position.offset(0, 1.5, 4), true);
    necromancer.activateItem();
    await wait(1000);

    assert(await clearEffect(ctx, "DarknessTarget", "minecraft:blindness", "Blindness"), "Necromancer darkness should apply Blindness to the targeted player");
  } finally {
    necromancer.deactivateItem();
    await command("clear DarknessCaster", 250);
    await command("clear DarknessTarget", 250);
    await command("effect clear DarknessCaster", 250);
    await command("effect clear DarknessTarget", 250);
    await command("fill 96 79 -1 98 79 1 minecraft:air", 250);
    await command("forceload remove 96 -1 98 1", 250);
  }
}

async function clearEffect(ctx, playerName, effectId, effectLabel) {
  return serverCommandSucceeds(ctx, `effect clear ${playerName} ${effectId}`, { holder: "effect_clear", label: `clear ${effectLabel}` });
}
