export function getCloudflareResourceNames(value: string) {
  const projectName = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!projectName) {
    throw new Error("PROJECT_NAME must contain letters or numbers.");
  }

  const workerName = projectName;
  const resourcePrefix = `${projectName}-next`;
  const bucketName = `${resourcePrefix}-cache`;
  const databaseName = `${resourcePrefix}-tag-cache`;

  if ([workerName, bucketName, databaseName].some((name) => name.length > 63)) {
    throw new Error("A derived Cloudflare resource name exceeds 63 characters.");
  }

  return {
    workerName,
    bucketName,
    databaseName,
  };
}
