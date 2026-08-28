import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Necromancer reduces melee damage";

const RIDER_FLOOR = new Vec3(328, 79, 0);
const TARGET_FLOOR = new Vec3(328, 79, 2);
const ATTACKER_FLOOR = new Vec3(329, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntNecroHit", { op: false });
  const target = await spawnBot("MntNecroSeat", { op: false });
  const attacker = await spawnBot("MntNecroAtk", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 327 0 330 2", 250);
    await wait(500);
    await command("deop MntNecroHit", 250);
    await command("deop MntNecroSeat", 250);
    await command("deop MntNecroAtk", 250);
    await command("clear MntNecroHit", 250);
    await command("clear MntNecroSeat", 250);
    await command("clear MntNecroAtk", 250);
    await command("effect clear MntNecroHit", 250);
    await command("effect clear MntNecroSeat", 250);
    await command("effect clear MntNecroAtk", 250);
    await command("fill 327 79 0 330 79 2 minecraft:stone", 500);
    await command("gamemode creative MntNecroHit", 250);
    await command("gamemode creative MntNecroSeat", 250);
    await command("gamemode creative MntNecroAtk", 250);
    await command("tp MntNecroHit 328 80 0 0 0", 500);
    await command("tp MntNecroSeat 328 80 2 180 0", 500);
    await command("tp MntNecroAtk 329 80 0 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Necromancer damage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Necromancer damage target floor block");
    await waitForBlock(attacker, ATTACKER_FLOOR, "stone", "mounted Necromancer damage attacker floor block");
    await command("gamemode survival MntNecroHit", 250);
    await command("gamemode survival MntNecroSeat", 250);
    await command("gamemode survival MntNecroAtk", 250);
    await command("attribute MntNecroHit minecraft:max_health base set 40", 250);
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await attacker.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntNecroSeat/i);
    assert(mounted, "Necromancer rider should mount the target before mounted damage checks");
    await wait(500);

    const plainDamage = await measureIncomingDamage(ctx, "mounted plain rider");

    await command("classes give MntNecroHit necromancer_staff", 500);
    const staff = await waitForInventoryItem(rider, (item) => item?.name === "blaze_rod", "mounted rider Necromancer Staff");
    await rider.equip(staff, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Necromancer/);
    assert(status, "mounted rider Necromancer Staff should set class status before damage reduction check");

    const necromancerDamage = await measureIncomingDamage(ctx, "mounted Necromancer rider");
    assert(necromancerDamage < plainDamage * 0.75, `mounted Necromancer rider should reduce melee damage; plain=${plainDamage}, necromancer=${necromancerDamage}`);
    assert(await playerExists(ctx, "MntNecroHit"), "mounted Necromancer damage checks should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MntNecroSeat"), "mounted Necromancer damage checks should not kill or disconnect the target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MntNecroHit", 250);
    await command("clear MntNecroSeat", 250);
    await command("clear MntNecroAtk", 250);
    await command("effect clear MntNecroHit", 250);
    await command("effect clear MntNecroSeat", 250);
    await command("effect clear MntNecroAtk", 250);
    await command("attribute MntNecroHit minecraft:max_health base set 20", 250);
    await command("fill 327 79 0 330 79 2 minecraft:air", 500);
    await command("forceload remove 327 0 330 2", 250);
  }
}

async function measureIncomingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MntNecroHit", 250);
  await command("attribute MntNecroHit minecraft:max_health base set 40", 250);
  await command("effect give MntNecroHit minecraft:instant_health 1 10 true", 250);
  await command("tp MntNecroHit 328 80 0 0 0", 250);
  await command("tp MntNecroSeat 328 80 2 180 0", 250);
  await command("tp MntNecroAtk 329 80 0 -90 0", 250);
  await wait(750);
  await command("data merge entity MntNecroHit {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "MntNecroHit");
  const damageOutput = await command("damage MntNecroHit 8 minecraft:player_attack by MntNecroAtk", 500);
  assert(/Applied|damaged/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(250);

  const after = await health(ctx, "MntNecroHit");
  const damage = before - after;
  assert(damage > 0, `${label} should take damage; before=${before}, after=${after}, output=${damageOutput}`);
  return damage;
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

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
