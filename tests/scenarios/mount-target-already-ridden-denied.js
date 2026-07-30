import { queryEntityCount, waitForChat } from "./helpers.js";

export const name = "MountPlugin denies mounting occupied targets";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountTaken");

  await command("fill 72 79 -3 74 79 3 minecraft:stone", 250);
  await command("gamemode survival MountTaken", 250);
  await command("kill @e[tag=mount_taken_target]", 250);
  await command("kill @e[tag=mount_taken_passenger]", 250);
  await command('summon minecraft:pig 73 80 1 {NoAI:1b,Tags:["mount_taken_target"]}', 250);
  await command('summon minecraft:item_display 73 80 1 {Tags:["mount_taken_passenger"]}', 250);
  await command("ride @e[type=minecraft:item_display,tag=mount_taken_passenger,limit=1] mount @e[type=minecraft:pig,tag=mount_taken_target,limit=1]", 250);
  await command("tp MountTaken 73 80 -1.5 0 27", 500);
  await wait(750);

  assert(await entityExists(ctx, "@e[type=minecraft:pig,tag=mount_taken_target,limit=1]"), "test pig should exist");
  assert(await entityExists(ctx, "@e[type=minecraft:item_display,tag=mount_taken_passenger,limit=1]"), "display passenger should exist");
  assert(await entityExists(ctx, '@e[type=minecraft:pig,tag=mount_taken_target,nbt={Passengers:[{}]},limit=1]'), "test pig should have a passenger");

  const pig = Object.values(rider.entities).find((entity) => entity?.name === "pig");
  assert(pig, "Mineflayer should see the occupied pig");

  await rider.lookAt(pig.position.offset(0, 0.35, 0), true);
  await command("tp MountTaken 73 80 -1.5 0 27", 250);
  const denied = await waitForChat(rider, () => rider.chat("/mount"), /already being ridden/i);
  assert(denied, "/mount should reject an occupied target");

  const targetCount = await queryEntityCount(ctx, "@e[type=minecraft:pig,tag=mount_taken_target]");
  const passengerCount = await queryEntityCount(ctx, "@e[type=minecraft:item_display,tag=mount_taken_passenger]");
  assert(targetCount === 1, "denied /mount should leave the occupied target in place");
  assert(passengerCount === 1, "denied /mount should leave the original passenger in place");

  await command("kill @e[tag=mount_taken_target]", 250);
  await command("kill @e[tag=mount_taken_passenger]", 250);
  await command("fill 72 79 -3 74 79 3 minecraft:air", 250);
}

async function entityExists(ctx, selector) {
  const output = await ctx.command(`execute if entity ${selector}`, 250);
  return /Test passed/.test(output);
}
