/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  const path = params.catchall;

  // UUID regex pattern (matches v1, v4, and other common UUID formats)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Check if the path matches a UUID pattern
  const isUUID = uuidPattern.test(path);

  // Return the path and UUID status to the page
  return {
    path,
    isUUID
  };
}
