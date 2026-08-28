import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted target Knight reduces incoming sword damage";

const RIDER_FLOOR = new Vec3(320, 79, 0);
const TARGET_FLOOR = new Vec3(320, 79, 2);
const ATTACKER_FLOOR = new Vec3(321, 79, 2);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MtKnightHitR", { op: false });
  const target = await spawnBot("MtKnightHit", { op: false });
  const attacker = await spawnBot("MtKnightAtk", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 319 0 322 2", 250);
    await wait(500);
    await command("deop MtKnightHitR", 250);
    await command("deop MtKnightHit", 250);
    await command("deop MtKnightAtk", 250);
    await command("clear MtKnightHitR", 250);
    await command("clear MtKnightHit", 250);
    await command("clear MtKnightAtk", 250);
    await command("effect clear MtKnightHitR", 250);
    await command("effect clear MtKnightHit", 250);
    await command("effect clear MtKnightAtk", 250);
    await command("fill 319 79 0 322 79 2 minecraft:stone", 500);
    await command("gamemode creative MtKnightHitR", 250);
    await command("gamemode creative MtKnightHit", 250);
    await command("gamemode creative MtKnightAtk", 250);
    await command("tp MtKnightHitR 320 80 0 0 0", 500);
    await command("tp MtKnightHit 320 80 2 180 0", 500);
    await command("tp MtKnightAtk 321 80 2 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Knight damage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Knight damage target floor block");
    await waitForBlock(attacker, ATTACKER_FLOOR, "stone", "mounted Knight damage attacker floor block");
    await command("gamemode survival MtKnightHitR", 250);
    await command("gamemode survival MtKnightHit", 250);
    await command("gamemode survival MtKnightAtk", 250);
    await command("attribute MtKnightHit minecraft:max_health base set 40", 250);
    await command("give MtKnightAtk minecraft:iron_sword", 500);
    const sword = await waitForInventoryItem(attacker, (item) => item?.name === "iron_sword", "mounted attacker iron sword");
    await attacker.equip(sword, "hand");
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await attacker.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MtKnightHit/i);
    assert(mounted, "rider should mount the target before mounted Knight damage checks");
    await wait(500);

    const plainDamage = await measureIncomingDamage(ctx, "mounted plain target");

    await command("classes give MtKnightHit long_sword", 500);
    const classSword = await waitForInventoryItem(target, (item) => item?.name === "iron_sword", "mounted target Knight Long Sword");
    await target.equip(classSword, "hand");
    await wait(1500);

    const status = await waitForChat(target, () => target.chat("/classes status"), /Current class: Knight/);
    assert(status, "mounted target Long Sword should set class status before damage reduction check");

    const knightDamage = await measureIncomingDamage(ctx, "mounted Knight target");
    assert(knightDamage < plainDamage * 0.75, `mounted Knight target should reduce incoming sword damage; plain=${plainDamage}, knight=${knightDamage}`);
    assert(await playerExists(ctx, "MtKnightHitR"), "mounted Knight damage checks should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MtKnightHit"), "mounted Knight damage checks should not kill or disconnect the target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MtKnightHitR", 250);
    await command("clear MtKnightHit", 250);
    await command("clear MtKnightAtk", 250);
    await command("effect clear MtKnightHitR", 250);
    await command("effect clear MtKnightHit", 250);
    await command("effect clear MtKnightAtk", 250);
    await command("attribute MtKnightHit minecraft:max_health base set 20", 250);
    await command("fill 319 79 0 322 79 2 minecraft:air", 500);
    await command("forceload remove 319 0 322 2", 250);
  }
}

async function measureIncomingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MtKnightHit", 250);
  await command("attribute MtKnightHit minecraft:max_health base set 40", 250);
  await command("effect give MtKnightHit minecraft:instant_health 1 10 true", 250);
  await command("tp MtKnightHitR 320 80 0 0 0", 250);
  await command("tp MtKnightHit 320 80 2 180 0", 250);
  await command("tp MtKnightAtk 321 80 2 -90 0", 250);
  await wait(750);
  await command("data merge entity MtKnightHit {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "MtKnightHit");
  const damageOutput = await command("damage MtKnightHit 10 minecraft:player_attack by MtKnightAtk", 500);
  assert(/Applied|damaged/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "MtKnightHit");
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
