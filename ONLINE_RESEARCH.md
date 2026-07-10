# Online Research Notes

Checked on July 10, 2026.

## Best Existing Options

### Plugwright

Link: https://github.com/drownek/paper-e2e-test

Closest match for the original goal. It is an end-to-end testing framework for Paper/Spigot plugins, downloads/starts a real Paper server, and drives Mineflayer bots through JavaScript/TypeScript tests.

Why not use it directly everywhere here: it is packaged primarily as a Gradle plugin. Most projects in this folder are Maven projects, with only `adminplugin` using Gradle.

Good future path: convert new plugins to Gradle, or add Plugwright to Gradle-based plugins that need richer GUI/player-flow testing.

### MockBukkit

Links:

- https://mockbukkit.org/
- https://github.com/MockBukkit/MockBukkit
- https://docs.mockbukkit.org/docs/en/user_guide/introduction/getting_started

Best for fast unit tests of Bukkit/Paper logic without launching a server. It is not a real Minecraft server and cannot replace integration tests for NMS, actual entity behavior, movement, inventory GUI clicks, resource-pack behavior, or cross-plugin behavior.

Good future path: add MockBukkit tests inside each plugin for command handlers, listener logic, config parsing, item factories, and permissions.

### jpenilla Run Paper

Links:

- https://github.com/jpenilla/run-task
- https://docs.papermc.io/paper/dev/project-setup/

Good Gradle plugin for automatically downloading and running a Paper server with the built plugin jar. Paper's docs point to it as a way to streamline plugin testing.

Why not use it directly everywhere here: again, mostly Gradle-oriented, while this folder is mostly Maven.

### HeadlessMC / mc-runtime-test

Links:

- https://github.com/headlesshq/headlessmc
- https://github.com/headlesshq/mc-runtime-test

Useful when you truly need a real headless Minecraft Java client in CI, especially for client/mod runtime behavior. For server-side Paper plugin testing, Mineflayer-style bots are usually lighter and easier.

## Recommendation For This Workspace

Use a layered approach:

1. Keep builds in their existing Maven/Gradle projects.
2. Add MockBukkit tests inside individual plugins for fast logic coverage.
3. Use this `plugin-testing-environment` folder as the cross-project integration harness for real Paper `1.21.11` startup checks and basic bot tests.
4. Use Plugwright for future Gradle plugins or after converting Maven plugins to Gradle.

