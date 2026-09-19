import { serverRecipeExists } from "./helpers.js";

export const name = "Rocketlytra recipe is discoverable";

export async function run(ctx) {
  const { assert, spawnBot } = ctx;
  await spawnBot("RocketlytraBot");

  assert(
    await serverRecipeExists(ctx, "RocketlytraBot", "fireworkselytraplugin:rocketlytra_3"),
    "Paper could not give the FireworksElytraPlugin rocketlytra_3 recipe"
  );
}
