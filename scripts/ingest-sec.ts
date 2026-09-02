import { runIngest } from "@/backend/ingest";

async function main() {
  const result = await runIngest({ maxFilings: 12, includeOptionalSources: true });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
