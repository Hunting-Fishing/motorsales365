// Temporary source-entrypoint freeze, not release approval or a universal upload firewall.
// WORKERS_CI is a provider marker, not trusted authorization. Even false/empty
// overrides must remain blocked until a reviewed release path replaces this guard.
if (Object.hasOwn(process.env, "WORKERS_CI")) {
  console.error(
    "Independent Workers Builds are blocked: migration provenance, authority, recovery and owner acceptance remain incomplete.",
  );
  console.error(
    "Do not bypass this guard, repair history or upload the artifact. Follow the reviewed 365 release prerequisites.",
  );
  process.exit(1);
}

// No force flag, release environment variable, branch exception or secret can
// grant approval. Normal local/Actions compilation still uses existing gates.
if (process.argv.length !== 2) {
  console.error("Unexpected build guard arguments.");
  process.exit(2);
}
