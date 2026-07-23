import { waitForChat } from "./helpers.js";

export const name = "MountPlugin command denials are safe";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const rider = await spawnBot("MountDenied");

  await command("fill 66 79 -2 68 79 2 minecraft:stone", 250);
  await command("gamemode survival MountDenied", 250);
  await command("tp MountDenied 67 80 0 0 0", 500);
  await command("kill @e[type=!player,distance=..10,x=67,y=80,z=0]", 250);
  await wait(750);

  const noTarget = await waitForChat(rider, () => rider.chat("/mount"), /No creature found/i);
  assert(noTarget, "/mount with no target should be denied");
  assert(await playerExists(ctx, "MountDenied"), "denied /mount should not disconnect or kill the player");

  const notMounted = await waitForChat(rider, () => rider.chat("/unmount"), /not mounted/i);
  assert(notMounted, "/unmount without an active mount should be denied");
  assert(await playerExists(ctx, "MountDenied"), "denied /unmount should not disconnect or kill the player");

  await command("fill 66 79 -2 68 79 2 minecraft:air", 250);
}

async function playerExists(ctx, playerName) {
  const output = await ctx.command(`execute if entity @a[name=${playerName}]`, 250);
  return /Test passed/.test(output);
}
