import { Vec3 } from "vec3";
import { waitForBlock, waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Mounted rider Knight reduces incoming sword damage";

const RIDER_FLOOR = new Vec3(324, 79, 0);
const TARGET_FLOOR = new Vec3(324, 79, 2);
const ATTACKER_FLOOR = new Vec3(325, 79, 0);

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MntKnightHit", { op: false });
  const target = await spawnBot("MntKnightSeat", { op: false });
  const attacker = await spawnBot("MntKnightAtk", { op: false });

  try {
    await command("gamerule naturalRegeneration false", 250);
    await command("difficulty normal", 250);
    await command("forceload add 323 0 326 2", 250);
    await wait(500);
    await command("deop MntKnightHit", 250);
    await command("deop MntKnightSeat", 250);
    await command("deop MntKnightAtk", 250);
    await command("clear MntKnightHit", 250);
    await command("clear MntKnightSeat", 250);
    await command("clear MntKnightAtk", 250);
    await command("effect clear MntKnightHit", 250);
    await command("effect clear MntKnightSeat", 250);
    await command("effect clear MntKnightAtk", 250);
    await command("fill 323 79 0 326 79 2 minecraft:stone", 500);
    await command("gamemode creative MntKnightHit", 250);
    await command("gamemode creative MntKnightSeat", 250);
    await command("gamemode creative MntKnightAtk", 250);
    await command("tp MntKnightHit 324 80 0 0 0", 500);
    await command("tp MntKnightSeat 324 80 2 180 0", 500);
    await command("tp MntKnightAtk 325 80 0 -90 0", 500);
    await waitForBlock(rider, RIDER_FLOOR, "stone", "mounted Knight damage rider floor block");
    await waitForBlock(target, TARGET_FLOOR, "stone", "mounted Knight damage target floor block");
    await waitForBlock(attacker, ATTACKER_FLOOR, "stone", "mounted Knight damage attacker floor block");
    await command("gamemode survival MntKnightHit", 250);
    await command("gamemode survival MntKnightSeat", 250);
    await command("gamemode survival MntKnightAtk", 250);
    await command("attribute MntKnightHit minecraft:max_health base set 40", 250);
    await command("give MntKnightAtk minecraft:iron_sword", 500);
    const sword = await waitForInventoryItem(attacker, (item) => item?.name === "iron_sword", "mounted rider attacker iron sword");
    await attacker.equip(sword, "hand");
    await rider.waitForChunksToLoad();
    await target.waitForChunksToLoad();
    await attacker.waitForChunksToLoad();
    await wait(500);

    await rider.lookAt(target.entity.position.offset(0, 1.2, 0), true);
    const mounted = await waitForChat(rider, () => rider.chat("/mount"), /now riding MntKnightSeat/i);
    assert(mounted, "Knight rider should mount the target before mounted damage checks");
    await wait(500);

    const plainDamage = await measureIncomingDamage(ctx, "mounted plain rider");

    await command("classes give MntKnightHit long_sword", 500);
    const classSword = await waitForInventoryItem(rider, (item) => item?.name === "iron_sword", "mounted rider Knight Long Sword");
    await rider.equip(classSword, "hand");
    await wait(1500);

    const status = await waitForChat(rider, () => rider.chat("/classes status"), /Current class: Knight/);
    assert(status, "mounted rider Long Sword should set class status before damage reduction check");

    const knightDamage = await measureIncomingDamage(ctx, "mounted Knight rider");
    assert(knightDamage < plainDamage * 0.75, `mounted Knight rider should reduce incoming sword damage; plain=${plainDamage}, knight=${knightDamage}`);
    assert(await playerExists(ctx, "MntKnightHit"), "mounted Knight damage checks should not kill or disconnect the rider");
    assert(await playerExists(ctx, "MntKnightSeat"), "mounted Knight damage checks should not kill or disconnect the target");
  } finally {
    rider.chat("/unmount");
    await wait(500);
    await command("gamerule naturalRegeneration true", 250);
    await command("difficulty peaceful", 250);
    await command("clear MntKnightHit", 250);
    await command("clear MntKnightSeat", 250);
    await command("clear MntKnightAtk", 250);
    await command("effect clear MntKnightHit", 250);
    await command("effect clear MntKnightSeat", 250);
    await command("effect clear MntKnightAtk", 250);
    await command("attribute MntKnightHit minecraft:max_health base set 20", 250);
    await command("fill 323 79 0 326 79 2 minecraft:air", 500);
    await command("forceload remove 323 0 326 2", 250);
  }
}

async function measureIncomingDamage(ctx, label) {
  const { assert, command, wait } = ctx;
  await command("effect clear MntKnightHit", 250);
  await command("attribute MntKnightHit minecraft:max_health base set 40", 250);
  await command("effect give MntKnightHit minecraft:instant_health 1 10 true", 250);
  await command("tp MntKnightHit 324 80 0 0 0", 250);
  await command("tp MntKnightSeat 324 80 2 180 0", 250);
  await command("tp MntKnightAtk 325 80 0 -90 0", 250);
  await wait(750);
  await command("data merge entity MntKnightHit {Health:40.0f,HurtTime:0s,DeathTime:0s,Invulnerable:0b}", 250);
  await wait(1000);

  const before = await health(ctx, "MntKnightHit");
  const damageOutput = await command("damage MntKnightHit 10 minecraft:player_attack by MntKnightAtk", 500);
  assert(/Applied|damaged/i.test(damageOutput), `${label} damage command did not report success: ${damageOutput}`);
  await wait(1000);

  const after = await health(ctx, "MntKnightHit");
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
