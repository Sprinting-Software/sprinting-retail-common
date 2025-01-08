export const LibraryDebugFlags = {
  SimulateProduction: function () {
    return getEnvVariable("SIMULATE_PRODUCTION")
  },
}

function getEnvVariable(name: string) {
  return process.env[name] ? true : false
}
