export const name = "Rocketlytra recipe is discoverable";

export async function run(ctx) {
  const { assert, command, spawnBot } = ctx;
  await spawnBot("RocketlytraBot");

  const takeOutput = await command("recipe take RocketlytraBot fireworkselytraplugin:rocketlytra_3", 500);
  assert(/Took 1 recipe\(s\) from RocketlytraBot|No recipes were removed/.test(takeOutput), "Paper could not address the FireworksElytraPlugin rocketlytra_3 recipe");

  const output = await command("recipe give RocketlytraBot fireworkselytraplugin:rocketlytra_3", 500);
  assert(/Unlocked 1 recipe\(s\) for RocketlytraBot|Gave 1 recipe\(s\) to RocketlytraBot|Gave \[RocketlytraBot\] the recipe/.test(output), "Paper could not give the FireworksElytraPlugin rocketlytra_3 recipe");
}
